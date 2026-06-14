import { getAdsenseClient } from "./config"
import { createMockAdProvider } from "./mockAdProvider"
import type { AdProvider, RewardedAction, RewardedOutcome } from "./types"

/**
 * 웹용 Google H5 Games Ads(Ad Placement API) provider — 스켈레톤.
 *
 * - 게시자 ID(VITE_ADSENSE_CLIENT)가 설정되어 있으면 adsbygoogle 게시자 태그를 동적으로
 *   로드하고, adBreak() API로 보상형/전면 광고를 띄운다.
 * - 게시자 ID가 없거나(승인 전) adBreak이 아직 준비되지 않았으면 mock provider로 폴백한다.
 *   덕분에 로컬·미승인 환경에서도 게임이 그대로 동작한다.
 *
 * 실제 광고를 켜려면: AdSense에서 H5 Games Ads 승인 → .env에 VITE_ADSENSE_CLIENT 설정.
 * 자세한 내용은 docs/web-ads-h5.md 참고.
 */

type BreakStatus =
  | "notReady"
  | "timeout"
  | "error"
  | "noAdPreloaded"
  | "frequencyCapped"
  | "ignored"
  | "other"
  | "dismissed"
  | "viewed"

type AdBreakPlacement = {
  readonly breakStatus?: BreakStatus
}

type AdBreakOptions = {
  readonly type: "reward" | "next" | "start" | "pause" | "browse"
  readonly name?: string
  readonly beforeReward?: (showAdFn: () => void) => void
  readonly adViewed?: () => void
  readonly adDismissed?: () => void
  readonly beforeAd?: () => void
  readonly afterAd?: () => void
  readonly adBreakDone?: (placement: AdBreakPlacement) => void
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
    adBreak?: (options: AdBreakOptions) => void
    adConfig?: (options: Record<string, unknown>) => void
  }
}

export function createH5AdProvider(): AdProvider {
  const fallback = createMockAdProvider()

  return {
    isNative: false,

    async initialize() {
      const client = getAdsenseClient()
      if (client === undefined || typeof document === "undefined") {
        return
      }
      if (document.querySelector("script[data-h5-ads]") !== null) {
        return
      }
      const script = document.createElement("script")
      script.async = true
      script.crossOrigin = "anonymous"
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`
      script.setAttribute("data-h5-ads", "true")
      // 광고 빈도 힌트(게임 로드 직후 광고를 막기 위한 권장 설정)
      script.setAttribute("data-ad-frequency-hint", "30s")
      document.head.appendChild(script)
    },

    async showRewarded(action: RewardedAction): Promise<RewardedOutcome> {
      if (typeof window === "undefined" || typeof window.adBreak !== "function") {
        return fallback.showRewarded(action)
      }
      return new Promise<RewardedOutcome>((resolve) => {
        let rewarded = false
        window.adBreak?.({
          type: "reward",
          name: action,
          beforeReward: (showAdFn) => showAdFn(),
          adViewed: () => {
            rewarded = true
          },
          adDismissed: () => {
            rewarded = false
          },
          adBreakDone: (placement) => {
            if (rewarded) {
              resolve({ rewarded: true })
              return
            }
            resolve({
              rewarded: false,
              reason: placement.breakStatus === "dismissed" ? "dismissed" : "not_ready",
            })
          },
        })
      })
    },

    async showInterstitial() {
      if (typeof window === "undefined" || typeof window.adBreak !== "function") {
        return fallback.showInterstitial()
      }
      return new Promise<void>((resolve) => {
        window.adBreak?.({
          type: "next",
          adBreakDone: () => resolve(),
        })
      })
    },
  }
}
