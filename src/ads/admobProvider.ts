import { getInterstitialAdId, getRewardedAdId } from "./config"
import type { AdProvider, RewardedAction, RewardedOutcome } from "./types"

/**
 * Capacitor 네이티브(@capacitor-community/admob) provider.
 *
 * 플러그인은 동적 import 한다 — 웹 번들에 네이티브 전용 코드가 포함되지 않게 하고,
 * 네이티브 플랫폼에서만 실제로 로드되도록 하기 위함이다. 광고 로드/표시가 어떤
 * 이유로든 실패하면 보상 없이 정상 종료해 게임 흐름을 막지 않는다.
 */
export function createAdMobProvider(platform: "android" | "ios"): AdProvider {
  return {
    isNative: true,

    async initialize() {
      const { AdMob } = await import("@capacitor-community/admob")
      await AdMob.initialize({
        // 개발 빌드에서 실기기를 테스트 기기로 등록하면 실광고 대신 테스트 광고가 뜬다.
        initializeForTesting: import.meta.env.DEV,
      })
    },

    async showRewarded(_action: RewardedAction): Promise<RewardedOutcome> {
      try {
        const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob")
        let rewarded = false
        const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          rewarded = true
        })
        try {
          await AdMob.prepareRewardVideoAd({ adId: getRewardedAdId(platform) })
          await AdMob.showRewardVideoAd()
          return rewarded ? { rewarded: true } : { rewarded: false, reason: "dismissed" }
        } finally {
          await rewardListener.remove()
        }
      } catch {
        return { rewarded: false, reason: "failed" }
      }
    },

    async showInterstitial() {
      try {
        const { AdMob } = await import("@capacitor-community/admob")
        await AdMob.prepareInterstitial({ adId: getInterstitialAdId(platform) })
        await AdMob.showInterstitial()
      } catch {
        // 전면 광고 실패는 조용히 무시한다 (보상이 걸린 흐름이 아님)
      }
    },
  }
}
