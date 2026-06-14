import { Capacitor } from "@capacitor/core"
import { createAdMobProvider } from "./admobProvider"
import { createH5AdProvider } from "./h5AdProvider"
import type { AdProvider } from "./types"

export type { AdProvider, RewardedAction, RewardedOutcome } from "./types"
export { rewardedPlacements } from "./types"

/**
 * 실행 플랫폼에 맞는 광고 provider를 생성한다.
 * - Android / iOS (Capacitor 네이티브): 실제 AdMob
 * - 웹 브라우저: H5 Games Ads(게시자 ID가 있으면 실광고, 없으면 자동 mock 폴백)
 */
export function createAdProvider(): AdProvider {
  const platform = Capacitor.getPlatform()
  if (platform === "android" || platform === "ios") {
    return createAdMobProvider(platform)
  }
  return createH5AdProvider()
}
