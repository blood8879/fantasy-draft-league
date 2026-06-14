import { getGameMonetizeId } from "./config"
import { createMockAdProvider } from "./mockAdProvider"
import type { AdProvider, RewardedAction, RewardedOutcome } from "./types"

/**
 * GameMonetize HTML5 광고 provider.
 *
 * GameMonetize SDK는 sdk.showBanner() 하나로 광고를 띄우고, onEvent로
 * SDK_GAME_PAUSE(광고 시작) → SDK_GAME_START(광고 종료) 흐름을 알려준다. 별도의
 * 보상형 전용 콜백이 없으므로, 광고가 끝나(SDK_GAME_START) 콘텐츠가 재개되는 시점에
 * 보상을 지급한다(광고 인벤토리가 없어 바로 재개돼도 진행이 막히지 않는다).
 *
 * VITE_GAMEMONETIZE_ID가 없거나 SDK가 준비되지 않았으면 mock으로 폴백한다.
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

  function settleReward(outcome: RewardedOutcome): void {
    if (rewardResolver !== undefined) {
      rewardResolver(outcome)
      rewardResolver = undefined
    }
  }

  function settleInterstitial(): void {
    if (interstitialResolver !== undefined) {
      interstitialResolver()
      interstitialResolver = undefined
    }
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
          // 광고가 끝나 콘텐츠가 재개되는 시점에 보상을 지급한다.
          if (event.name === "SDK_GAME_START") {
            settleReward({ rewarded: true })
            settleInterstitial()
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
        const timer = setTimeout(
          () => settleReward({ rewarded: false, reason: "not_ready" }),
          AD_TIMEOUT_MS,
        )
        rewardResolver = (outcome) => {
          clearTimeout(timer)
          resolve(outcome)
        }
        window.sdk?.showBanner()
      })
    },

    async showInterstitial() {
      if (typeof window === "undefined" || window.sdk === undefined) {
        return fallback.showInterstitial()
      }
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => settleInterstitial(), AD_TIMEOUT_MS)
        interstitialResolver = () => {
          clearTimeout(timer)
          resolve()
        }
        window.sdk?.showBanner()
      })
    },
  }
}
