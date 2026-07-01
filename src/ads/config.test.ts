import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getRewardedAdId, isUsingTestAds } from "./config"

const AD_KEYS = [
  "VITE_ADMOB_REWARDED_ANDROID",
  "VITE_ADMOB_REWARDED_IOS",
  "VITE_ADMOB_INTERSTITIAL_ANDROID",
  "VITE_ADMOB_INTERSTITIAL_IOS",
] as const

describe("ads config — release guard", () => {
  beforeEach(() => {
    // 주변 .env에 실제 광고 ID가 주입돼 있을 수 있으므로, 기본값을 '미주입(빈 문자열)'로 고정한다.
    for (const key of AD_KEYS) {
      vi.stubEnv(key, "")
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("실제 광고 단위 ID가 하나도 없으면 테스트 광고를 쓴다", () => {
    expect(isUsingTestAds()).toBe(true)
  })

  it("env가 비어 있으면 구글 테스트 보상형 ID로 폴백한다", () => {
    expect(getRewardedAdId("android")).toBe("ca-app-pub-3940256099942544/5224354917")
    expect(getRewardedAdId("ios")).toBe("ca-app-pub-3940256099942544/1712485313")
  })

  it("실제 보상형 ID가 주입되면 프로덕션 광고로 보고한다", () => {
    vi.stubEnv("VITE_ADMOB_REWARDED_ANDROID", "ca-app-pub-1234567890123456/1111111111")
    expect(isUsingTestAds()).toBe(false)
    expect(getRewardedAdId("android")).toBe("ca-app-pub-1234567890123456/1111111111")
  })

  it("공백 env 값은 미주입처럼 취급한다", () => {
    vi.stubEnv("VITE_ADMOB_REWARDED_ANDROID", "   ")
    expect(isUsingTestAds()).toBe(true)
    expect(getRewardedAdId("android")).toBe("ca-app-pub-3940256099942544/5224354917")
  })

  it("네 슬롯 중 하나라도 실제 ID면 프로덕션으로 감지한다", () => {
    vi.stubEnv("VITE_ADMOB_INTERSTITIAL_IOS", "ca-app-pub-1234567890123456/2222222222")
    expect(isUsingTestAds()).toBe(false)
  })
})
