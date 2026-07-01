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

## AdMob 콘솔 프리퀀시 캡 + 무효 트래픽 방지

광고 어뷰징(무효 트래픽)은 AdMob 계정 정지의 주된 원인이다. 이 앱은 **앱 내부 레이트리밋**과
**콘솔 프리퀀시 캡**을 이중으로 걸어 한 사용자가 짧은 시간에 광고를 과다 노출/클릭하는 것을 막는다.

### 1) 앱 내부 쿨다운 (이미 구현됨 — `src/ads/adGuard`)

| 한도 | 값 | 의미 |
| --- | --- | --- |
| 쿨다운 | **60초** | 직전 보상형 광고 시청 후 다음 광고까지 최소 간격 |
| 세션 상한 | **6회** | 앱 한 세션(실행) 동안 허용하는 보상형 광고 수 |
| 일일 상한 | **15회** | 하루(UTC 자정 기준) 허용하는 보상형 광고 수 |

한도를 넘기면 `useAds().showRewarded(action)`가 광고 provider를 **호출하지 않고**
`{ rewarded: false, reason: "capped" }`를 반환한다. UI는 이때 `t("ad.capped")`로 가벼운
인라인 안내(`role="status"`)를 띄우고, 보상은 지급하지 않는다(재경기·리롤·되돌리기 모두 동일).
이 경계는 `RewardedAdButton`과 드래프트 리롤 버튼에서 공통으로 처리된다.

### 2) AdMob 콘솔 프리퀀시 캡 (권장 — 출시 전 설정)

앱 내부 쿨다운과 별개로 AdMob 콘솔에서도 광고 단위별 **프리퀀시 캡(Frequency cap)**을 건다:

1. [AdMob 콘솔](https://apps.admob.com) → **광고 단위** → 해당 보상형/전면 단위 선택.
2. **프리퀀시 캡** 설정에서 사용자당 노출 빈도(예: 시간당/일당 N회)를 제한한다.
3. 전면 광고는 특히 과다 노출 시 정책 위반이 되기 쉬우므로 시간당/세션당 캡을 보수적으로 잡는다.

### 3) 무효 트래픽(Invalid Traffic) 방지 체크

- 개발/QA 중에는 **반드시 테스트 광고 ID** 또는 등록된 **테스트 기기**를 쓴다.
- 릴리스 빌드에서는 `isUsingTestAds()`(`src/ads/config.ts`)가 **`false`인지 확인**한다.
  실제 광고 단위 ID(`VITE_ADMOB_REWARDED_ANDROID` 등) 중 하나라도 주입되면 `false`가 된다.
  (이 동작은 `src/ads/config.test.ts`로 회귀 검증된다.)
- 자기 광고를 직접 클릭/반복 노출하지 않는다 — 계정 정지 사유.

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

## AAB 빌드 (플레이스토어 업로드용)

```bash
bun run android:aab
```

- 산출물: `android/app/build/outputs/bundle/release/app-release.aab`
- **JDK 21 필요** (Capacitor 8 요구사항). 스크립트가 `/usr/libexec/java_home -v 21`로
  자동 지정한다. 없으면 `brew install openjdk@21`.
- **서명 키스토어**는 `android/app/upload-keystore.jks`, 비밀번호는
  `android/keystore.properties`에 있다. **두 파일 다 git에 커밋되지 않으며(.gitignore),
  분실하지 않도록 안전하게 백업**해야 한다. (플레이스토어는 Play App Signing을 쓰므로
  이건 "업로드 키" — 분실 시 구글에 재설정 요청 가능)

## AdMob 실제 광고 ID 적용 (출시 전)

1. [AdMob 콘솔](https://apps.admob.com)에서 **앱 추가** → Android, 패키지명
   `com.legenddraft.league`.
2. **광고 단위** 생성: 보상형(Rewarded) + 전면(Interstitial) → 각 단위 ID 발급.
3. **앱 ID**(`ca-app-pub-XXXX~YYYY`)를 `android/app/src/main/AndroidManifest.xml`의
   `com.google.android.gms.ads.APPLICATION_ID` 값으로 교체.
4. **광고 단위 ID**를 `.env`에 입력:
   `VITE_ADMOB_REWARDED_ANDROID`, `VITE_ADMOB_INTERSTITIAL_ANDROID`.
5. `bun run android:aab`로 재빌드.

## 출시 전 체크리스트

- [ ] `.env`에 실제 광고 단위 ID 4종 입력 (또는 의도적으로 테스트 ID 유지)
- [ ] AndroidManifest의 AdMob App ID를 실제 값으로 교체
- [ ] iOS Info.plist에 `GADApplicationIdentifier` + `SKAdNetworkItems` 추가
- [ ] iOS는 App Tracking Transparency(ATT) 문구(`NSUserTrackingUsageDescription`) 검토
- [ ] 개인정보처리방침 URL 준비(스토어 심사 + AdMob 요구사항)
- [ ] **선수 실명 사용에 따른 퍼블리시티권 리스크 검토** — 스토어는 권리자 신고 한 건으로
      앱을 내릴 수 있다. 필요 시 가명 풀로 전환하는 옵션을 고려한다.
