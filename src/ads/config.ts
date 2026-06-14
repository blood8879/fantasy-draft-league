/**
 * AdMob 광고 단위 설정.
 *
 * 기본값은 구글이 공개한 "테스트 광고 단위 ID"라서 별도 설정 없이도 안전하게 테스트
 * 광고가 노출된다. 실제 배포 시에는 .env 파일(또는 CI 환경변수)에 자신의 광고 단위
 * ID를 넣어 덮어쓴다. 자세한 키 목록은 docs/mobile-admob.md 참고.
 *
 * ⚠️ 실제 광고 ID로 자기 광고를 직접 클릭/노출하면 계정이 정지될 수 있으므로,
 *    개발 중에는 반드시 테스트 ID를 사용한다.
 */

type Platform = "android" | "ios"

const GOOGLE_TEST_IDS: Readonly<
  Record<Platform, { readonly rewarded: string; readonly interstitial: string }>
> = {
  android: {
    rewarded: "ca-app-pub-3940256099942544/5224354917",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
  },
  ios: {
    rewarded: "ca-app-pub-3940256099942544/1712485313",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
  },
}

function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return value !== undefined && value.trim() !== "" ? value : undefined
}

export function getRewardedAdId(platform: Platform): string {
  const fromEnv =
    platform === "android" ? env("VITE_ADMOB_REWARDED_ANDROID") : env("VITE_ADMOB_REWARDED_IOS")
  return fromEnv ?? GOOGLE_TEST_IDS[platform].rewarded
}

export function getInterstitialAdId(platform: Platform): string {
  const fromEnv =
    platform === "android"
      ? env("VITE_ADMOB_INTERSTITIAL_ANDROID")
      : env("VITE_ADMOB_INTERSTITIAL_IOS")
  return fromEnv ?? GOOGLE_TEST_IDS[platform].interstitial
}

/** 웹 H5 Games Ads 게시자 ID(ca-pub-…). 없으면 웹 광고는 mock으로 폴백한다. */
export function getAdsenseClient(): string | undefined {
  return env("VITE_ADSENSE_CLIENT")
}

/** GameMonetize 게임 ID. 설정되면 웹 광고를 GameMonetize SDK로 처리한다. */
export function getGameMonetizeId(): string | undefined {
  return env("VITE_GAMEMONETIZE_ID")
}

/** 실제 광고 ID가 하나라도 주입됐는지 — 프로덕션 빌드 점검용 */
export function isUsingTestAds(): boolean {
  return (
    env("VITE_ADMOB_REWARDED_ANDROID") === undefined &&
    env("VITE_ADMOB_REWARDED_IOS") === undefined &&
    env("VITE_ADMOB_INTERSTITIAL_ANDROID") === undefined &&
    env("VITE_ADMOB_INTERSTITIAL_IOS") === undefined
  )
}
