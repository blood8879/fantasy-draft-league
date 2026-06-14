# 모바일 빌드 & AdMob 가이드

이 게임은 React SPA를 **Capacitor**로 래핑해 Android/iOS 앱으로 배포하고, 광고는
**Google AdMob**을 네이티브 레이어에 오버레이하는 구조다. 웹(브라우저)에서는 동일한
코드가 mock 광고 provider로 동작해 광고 흐름을 그대로 테스트할 수 있다.

## 아키텍처 한눈에

```
게임 UI (React)
   │  useAds() → showRewarded(action) / showInterstitial()
   ▼
AdProvider 인터페이스 (src/ads/types.ts)
   ├─ 웹/테스트 → MockAdProvider   (지연 후 항상 보상)
   └─ Android/iOS → AdMobProvider  (@capacitor-community/admob, 네이티브 오버레이)
```

플랫폼 선택은 `src/ads/index.ts`의 `createAdProvider()`가 `Capacitor.getPlatform()`으로
자동 분기한다. AdMob 광고는 WebView 안이 아니라 **네이티브 전체화면 오버레이**로 뜨므로
(AdMob 정책상 WebView 내부 렌더링 금지) 이 구조가 정책에 부합한다.

## 광고가 붙는 지점 (수익 포인트)

| 트리거 | 광고 유형 | 보상 | 코드 |
| --- | --- | --- | --- |
| 경기 패배/무승부 후 | 보상형 | 같은 라운드 재경기(다른 시드) | `REPLAY_ROUND` |
| 드래프트 중 내 지명 후 | 보상형 | 직전 지명 되돌리기 | `UNDO_LAST_USER_PICK` |
| 경기 전 (시즌 화면) | 보상형 | 다음 상대 전력 분석 공개 | `scout_report` |
| 3라운드마다 경기 후 전환 | 전면 | — | `MatchReport.handleContinue` |

보상형 광고는 **끝까지 시청해야** 보상이 지급된다(`RewardedOutcome.rewarded`). 중도
이탈하면 보상 없이 화면으로 복귀한다.

## 광고 단위 ID 설정

기본값은 구글 공식 **테스트 광고 ID**라 별도 설정 없이 안전하게 테스트 광고가 뜬다.
실제 배포 시에만 자신의 ID로 교체한다.

1. `.env.example`을 `.env`로 복사하고 AdMob 콘솔에서 발급한 광고 단위 ID를 채운다.
   (Vite가 빌드 시 주입 → `src/ads/config.ts`)
2. Android **App ID**(광고 단위 ID와 다름)는 `android/app/src/main/AndroidManifest.xml`의
   `com.google.android.gms.ads.APPLICATION_ID` meta-data 값을 실제 App ID로 교체한다.
   이 값이 잘못되면 앱이 시작 시 크래시한다.
3. iOS는 `ios/App/App/Info.plist`에 `GADApplicationIdentifier` 키로 App ID를 추가한다
   (iOS 플랫폼 생성 후).

> ⚠️ 실제 광고 ID로 **자기 광고를 직접 클릭/반복 노출하면 AdMob 계정이 정지**된다.
> 개발 중에는 반드시 테스트 ID 또는 등록된 테스트 기기를 사용한다.

## 빌드 절차

사전 준비: Node/Bun, Android Studio(Android), Xcode + CocoaPods(iOS).

```bash
bun install

# 1) 웹 에셋 빌드 + 네이티브로 동기화
bun run cap:sync

# 2) Android — Android Studio에서 열어 실행/서명/번들(aab) 생성
bun run cap:android        # build + sync android + open android

# 3) iOS — 최초 1회 플랫폼 추가 후 Xcode에서 실행/아카이브
bun run cap:add:ios        # macOS + CocoaPods 필요 (1회)
bun run cap:ios            # build + sync ios + open ios
```

`android/` 네이티브 프로젝트는 이미 생성되어 있다(`@capacitor/android`). 웹 코드를
바꾼 뒤에는 `bun run cap:sync`로 다시 동기화하면 된다.

## 출시 전 체크리스트

- [ ] `.env`에 실제 광고 단위 ID 4종 입력 (또는 의도적으로 테스트 ID 유지)
- [ ] AndroidManifest의 AdMob App ID를 실제 값으로 교체
- [ ] iOS Info.plist에 `GADApplicationIdentifier` + `SKAdNetworkItems` 추가
- [ ] iOS는 App Tracking Transparency(ATT) 문구(`NSUserTrackingUsageDescription`) 검토
- [ ] 개인정보처리방침 URL 준비(스토어 심사 + AdMob 요구사항)
- [ ] **선수 실명 사용에 따른 퍼블리시티권 리스크 검토** — 스토어는 권리자 신고 한 건으로
      앱을 내릴 수 있다. 필요 시 가명 풀로 전환하는 옵션을 고려한다.
