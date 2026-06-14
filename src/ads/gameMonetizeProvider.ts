import { getGameMonetizeId } from "./config"
import { createMockAdProvider } from "./mockAdProvider"
import type { AdProvider, RewardedAction, RewardedOutcome } from "./types"

/**
 * GameMonetize HTML5 광고 provider — 스켈레톤.
 *
 * - VITE_GAMEMONETIZE_ID(게임 ID)가 설정되면 GameMonetize SDK를 동적 로드하고,
 *   보상형/전면 광고를 sdk.showBanner() + onEvent 콜백으로 처리한다.
 * - ID가 없거나 SDK가 아직 준비되지 않았으면 mock provider로 폴백한다.
 *
 * 실제 광고를 켜려면: GameMonetize 가입 → 게임 등록 → 발급된 게임 ID를
 * .env(VITE_GAMEMONETIZE_ID) / Vercel 환경변수에 설정.
 *
 * ⚠️ 아래 onEvent의 이벤트 이름(SDK_REWARDED_WATCH_COMPLETE 등)은 GameMonetize SDK
 *    문서 기준 스켈레톤이다. 실제 통합 시 대시보드의 최신 SDK 가이드로 확인·조정한다.
 */

type SdkEvent = { readonly name: string }

declare global {
  interface Window {
    SDK_OPTIONS?: {
      gameId: string
      onEvent: (event: SdkEvent) => void
    }
    sdk?: {
      showBanner: () => void
    }
  }
}

/** 광고 이벤트가 끝내 오지 않을 때를 대비한 안전장치(ms) */
const AD_TIMEOUT_MS = 20000

export function createGameMonetizeProvider(): AdProvider {
  const fallback = createMockAdProvider()
  let rewardResolver: ((outcome: RewardedOutcome) => void) | undefined
  let interstitialResolver: (() => void) | undefined
  let rewardedWatched = false

  function settleReward(outcome: RewardedOutcome): void {
    if (rewardResolver !== undefined) {
      rewardResolver(outcome)
      rewardResolver = undefined
    }
    rewardedWatched = false
  }

  return {
    isNative: false,

    async initialize() {
      const gameId = getGameMonetizeId()
      if (gameId === undefined || typeof document === "undefined") {
        return
      }
      if (document.querySelector("script[data-gm-sdk]") !== null) {
        return
      }
      window.SDK_OPTIONS = {
        gameId,
        onEvent: (event) => {
          if (event.name === "SDK_REWARDED_WATCH_COMPLETE") {
            rewardedWatched = true
          }
          // 광고가 끝나 콘텐츠가 재개되는 시점에 보상 여부를 확정한다.
          if (event.name === "SDK_GAME_START") {
            settleReward(
              rewardedWatched ? { rewarded: true } : { rewarded: false, reason: "dismissed" },
            )
            if (interstitialResolver !== undefined) {
              interstitialResolver()
              interstitialResolver = undefined
            }
          }
        },
      }
      const script = document.createElement("script")
      script.src = "https://api.gamemonetize.com/sdk.js"
      script.setAttribute("data-gm-sdk", "true")
      document.head.appendChild(script)
    },

    async showRewarded(action: RewardedAction): Promise<RewardedOutcome> {
      if (typeof window === "undefined" || window.sdk === undefined) {
        return fallback.showRewarded(action)
      }
      return new Promise<RewardedOutcome>((resolve) => {
        rewardResolver = resolve
        rewardedWatched = false
        const timer = setTimeout(
          () => settleReward({ rewarded: false, reason: "not_ready" }),
          AD_TIMEOUT_MS,
        )
        const original = rewardResolver
        rewardResolver = (outcome) => {
          clearTimeout(timer)
          original(outcome)
        }
        window.sdk?.showBanner()
      })
    },

    async showInterstitial() {
      if (typeof window === "undefined" || window.sdk === undefined) {
        return fallback.showInterstitial()
      }
      return new Promise<void>((resolve) => {
        interstitialResolver = resolve
        const timer = setTimeout(() => {
          if (interstitialResolver !== undefined) {
            interstitialResolver()
            interstitialResolver = undefined
          }
        }, AD_TIMEOUT_MS)
        const original = interstitialResolver
        interstitialResolver = () => {
          clearTimeout(timer)
          original()
        }
        window.sdk?.showBanner()
      })
    },
  }
}
