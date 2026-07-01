import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.legenddraft.league",
  appName: "레전드 드래프트 리그",
  // Vite 빌드 산출물 디렉터리. cap sync가 참조하므로 server.url을 써도 남겨 둔다.
  webDir: "dist",
  // 원격 URL 로딩: 앱은 웹뷰 셸이 되고 실제 화면은 Vercel에서 실시간으로 불러온다.
  // → 웹 로직(케미·광고확률·UI 등)을 고치면 Vercel 배포만으로 즉시 반영(AAB 재빌드 불필요).
  //   AdMob 등 네이티브 플러그인은 Capacitor 브리지로 그대로 동작한다.
  //   단점: 오프라인 미작동. 이 URL을 바꿀 때만 AAB를 다시 빌드하면 된다.
  server: {
    url: "https://football-draft-sim.vercel.app",
    cleartext: false,
  },
  plugins: {
    AdMob: {
      // 실기기를 테스트 기기로 등록하면 개발 중에도 실광고 대신 테스트 광고가 노출된다.
      // 등록 ID는 앱 첫 실행 시 logcat/Xcode 콘솔에 출력된다.
      testingDevices: [],
      initializeForTesting: true,
    },
  },
}

export default config
