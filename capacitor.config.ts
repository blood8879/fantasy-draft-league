import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.legenddraft.league",
  appName: "레전드 드래프트 리그",
  // Vite 빌드 산출물 디렉터리. `bun run build` 후 `bun run cap:sync`로 네이티브에 복사된다.
  webDir: "dist",
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
