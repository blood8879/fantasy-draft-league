# 웹 배포(Vercel) & H5 Games Ads 연결

웹 버전은 정적 빌드(Vite → `dist/`)라서 Vercel에 그대로 올라간다. 광고는 코드에 이미
연결돼 있고, **게시자 ID만 넣으면** 리롤·재경기 버튼이 실제 H5 Games Ads 보상형 광고를
띄운다. ID가 없으면 자동으로 mock(가짜 광고)으로 폴백하므로 배포 자체는 광고 승인 전에도
문제없이 동작한다.

## 1. Vercel 배포

사전: Vercel 계정. 이 저장소를 Git(GitHub 등)에 올려두면 가장 편하다.

### 방법 A — Git 연동(권장)
1. GitHub 등에 저장소 push.
2. Vercel 대시보드 → New Project → 저장소 선택.
3. 프레임워크는 **Vite**로 자동 감지된다(`vercel.json`에 명시됨). 그대로 Deploy.
4. 이후 push할 때마다 자동 재배포된다.

### 방법 B — CLI
```bash
npm i -g vercel      # 또는 bunx vercel
vercel               # 최초 1회: 로그인 + 프로젝트 연결 (대화형)
vercel --prod        # 프로덕션 배포
```

`vercel.json`이 빌드(`vite build`)·출력(`dist`)·SPA rewrite를 지정해 두었다. 배포가 끝나면
`https://<프로젝트>.vercel.app` URL이 나온다 — 이 URL이 AdSense 심사 대상이 된다.

## 2. H5 Games Ads(AdSense) 승인

1. [AdSense](https://adsense.google.com) 계정 생성 후, 위 Vercel URL(또는 연결한 커스텀
   도메인)을 사이트로 등록한다.
2. **H5 Games Ads**를 신청한다(일반 콘텐츠 광고와 별개 트랙). 게임 품질·트래픽 심사가 있다.
3. 승인되면 게시자 ID(`ca-pub-…`)를 발급받는다.

## 3. 게시자 ID 주입

Vercel 프로젝트 → Settings → Environment Variables 에 추가:

```
VITE_ADSENSE_CLIENT = ca-pub-XXXXXXXXXXXXXXXX
```

저장 후 재배포하면 끝이다. `src/ads/h5AdProvider.ts`가 이 ID로 adsbygoogle 게시자 태그를
동적으로 로드하고, `adBreak()` API로 광고를 띄운다. (로컬에서 시험하려면 `.env`에 같은
값을 넣는다 — `.env.example` 참고.)

## 광고가 붙는 지점

| 트리거 | 광고 유형 | 보상 |
| --- | --- | --- |
| 드래프트 "다른 후보 보기" | 보상형 | 후보 카드 다시 뽑기 |
| 드래프트 "직전 지명 되돌리기" | 보상형 | 마지막 지명 취소 |
| 경기 전 "전력 분석 보기" | 보상형 | 다음 상대 스카우트 |
| 경기 패배·무승부 후 "재경기 도전" | 보상형 | 같은 라운드 재경기 |
| 라운드 전환(3라운드마다) | 전면 | — |

보상형은 유저가 **직접 버튼을 눌렀을 때만** 광고가 뜬다(H5 정책 부합). 광고 인벤토리가
없어 광고가 안 뜨면(`breakStatus`가 `noAdPreloaded` 등) 보상은 지급되지 않지만, 후보가
바닥났을 때의 "무료 다시 뽑기" 안전장치가 있어 진행이 막히지 않는다.

> 주의: 개발 중 자기 광고를 반복 클릭하면 계정이 정지될 수 있다. 승인·테스트 단계에서는
> AdSense의 테스트 모드를 사용한다.
