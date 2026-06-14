import type { AdProvider, RewardedAction, RewardedOutcome } from "./types"

/**
 * 웹/개발 환경용 mock provider.
 *
 * 실제 광고 SDK 없이 "광고 시청"을 짧은 지연으로 시뮬레이션한다. 항상 보상을 지급해
 * 보상 흐름(재경기·되돌리기 등)을 그대로 테스트할 수 있다. 전면 광고는 no-op.
 */

const REWARDED_DURATION_MS = 900
const INTERSTITIAL_DURATION_MS = 500

export function createMockAdProvider(options: { readonly delayMs?: number } = {}): AdProvider {
  const rewardedDelay = options.delayMs ?? REWARDED_DURATION_MS
  const interstitialDelay = options.delayMs ?? INTERSTITIAL_DURATION_MS

  return {
    isNative: false,
    async initialize() {
      // mock: 초기화할 SDK가 없다
    },
    async showRewarded(_action: RewardedAction): Promise<RewardedOutcome> {
      await delay(rewardedDelay)
      return { rewarded: true }
    },
    async showInterstitial() {
      await delay(interstitialDelay)
    },
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}
