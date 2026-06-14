import { Capacitor } from "@capacitor/core"
import { createAdMobProvider } from "./admobProvider"
import { getGameMonetizeId } from "./config"
import { createGameMonetizeProvider } from "./gameMonetizeProvider"
import { createH5AdProvider } from "./h5AdProvider"
import type { AdProvider } from "./types"

export type { AdProvider, RewardedAction, RewardedOutcome } from "./types"
export { rewardedPlacements } from "./types"

/**
 * 실행 플랫폼에 맞는 광고 provider를 생성한다.
 * - Android / iOS (Capacitor 네이티브): 실제 AdMob
 * - 웹: GameMonetize(게임 ID 설정 시) → 없으면 AdSense H5 Games Ads → 둘 다 없으면 mock
 */
export function createAdProvider(): AdProvider {
  const platform = Capacitor.getPlatform()
  if (platform === "android" || platform === "ios") {
    return createAdMobProvider(platform)
  }
  if (getGameMonetizeId() !== undefined) {
    return createGameMonetizeProvider()
  }
  return createH5AdProvider()
}
