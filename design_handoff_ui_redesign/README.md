# Handoff: 레전드 드래프트 리그 — UI 리디자인

## Overview
`fantasy-draft-league`(레전드 드래프트 리그)의 전면 비주얼 리디자인. 기존 각진 브루탈리즘 룩을
**"다크 피치 + 일렉트릭 라임"의 게임형 브로드캐스트 스타일**로 교체하고, 카드 드래프트·시즌
시뮬레이션·라이브 경기 전반에 모션/인터랙션을 입혔다. 모바일 우선(390×844 기준) 설계.

## About the Design Files
이 번들의 `LegendDraftLeague.dc.html`은 **HTML로 만든 디자인 레퍼런스**다 — 의도한 룩과
인터랙션을 보여주는 프로토타입이지 그대로 가져다 쓰는 프로덕션 코드가 아니다.
목표는 이 디자인을 **기존 코드베이스(`fantasy-draft-league`, React + TypeScript + Vite, CSS는
`src/styles/base.css` / `src/styles/game.css`)의 패턴 안에서 재구현**하는 것이다.
컴포넌트 구조(`src/components/*.tsx`)와 게임 로직(`src/domain`, `src/simulation`,
`src/app/gameStore.ts`)은 그대로 두고, **표현 계층(마크업 클래스 + CSS)만** 이 시안에 맞춰 교체한다.

> 이 프로토타입의 게임 로직(드래프트 풀, xG 경기 엔진, 순위 계산)은 시연용 간이 구현이다.
> 실제 도메인 로직은 이미 레포에 있으니 재사용하고, **시각/인터랙션만** 이식할 것.

## Fidelity
**High-fidelity (hifi).** 색상·타이포·간격·라운드·모션이 최종 의도값이다. 아래 토큰과 화면
스펙을 그대로 재현하되, DOM 구조는 기존 React 컴포넌트에 맞게 매핑한다.

---

## Design Tokens

프로토타입은 루트 요소에 CSS 변수로 선언돼 있다. 코드베이스에서는 `:root`(또는 테마 스코프)에
옮기고 기존 `game.css`의 토큰을 대체할 것을 권장.

### Colors
| Token | Hex / Value | 용도 |
|---|---|---|
| `--bg` | `#081310` | 최하단 배경(거의 블랙 그린) |
| `--bg2` | `#0b1c14` | 배경 그라데이션 상단 / 바텀바 |
| `--surf` | `#102619` | 기본 카드/패널 표면 |
| `--surf2` | `#163322` | 강조 표면(카드 그라데이션 상단) |
| `--surfHi` | `#1c4029` | 호버/하이라이트 표면 |
| `--line` | `rgba(205,242,74,.16)` | 라임 빛 헤어라인 보더 |
| `--lime` | `#cdf24a` | **주 액센트**(CTA, 강조 수치, 글로우) |
| `--lime2` | `#e6ff74` | 라임 그라데이션 밝은 끝 |
| `--ink` | `#ecfff2` | 기본 텍스트 |
| `--mut` | `#7c9d88` | 보조/레이블 텍스트 |
| `--gold` | `#ffce3a` | Legend 레어도 · 우승/시상 |
| `--violet` | `#bb7cff` | Epic 레어도 |
| `--cyan` | `#56c7ff` | Rare 레어도 |
| `--slate` | `#9fb2a6` | Common 레어도 |

배경 그라데이션: `radial-gradient(120% 80% at 50% -10%, #0f2618 0%, var(--bg2) 42%, var(--bg) 100%)`
+ 피치 라인 텍스처: `linear-gradient(rgba(205,242,74,.035) 1px, transparent 1px)` / `background-size:100% 46px`, opacity .5.

### 레어도 색상 매핑 (선수 카드)
| Rarity | Color | Flash(픽 임팩트) |
|---|---|---|
| Legend | `#ffce3a` | `rgba(255,206,58,.5)` |
| Epic | `#bb7cff` | `rgba(187,124,255,.45)` |
| Rare | `#56c7ff` | `rgba(86,199,255,.4)` |
| Common | `#9fb2a6` | `rgba(159,178,166,.35)` |

### 포지션 그룹 색상 (피치 도트)
GK `#ffce3a` · DEF `#56c7ff` · MID `#cdf24a` · FWD `#ff7a7a`

### 폼 결과 색상 (순위표 W/D/L)
승 `#7fe87f` · 무 `#e8d77f` · 패 `#ff8a8a` (글자색은 `#0a140d`)

### Typography
- **Display**: `Anton` (구글폰트). 모든 큰 제목·수치(OVR, 스코어, 승점)에 사용. 전부 `text-transform:uppercase`, `font-weight:400`(Anton은 단일 웨이트).
- **Body/UI**: `Archivo` (400/500/600/700/800, italic 600). 본문·레이블·버튼 텍스트.
- 로드: `https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap`
- Inter/Roboto 사용 금지. 레이블은 보통 `letter-spacing:1~2px` + uppercase.

대표 크기: H1 히어로 54px / 화면 타이틀 24–30px / 카드 OVR 34px / 스코어 46px / GOAL 팝 80px /
본문 13–14px / 레이블 9.5–11px.

### Radius / Shadow / Spacing
- Radius: 카드/패널 14–16px, 모달 22px, 칩/pill `100px`, 작은 배지 4–9px.
- 그림자: CTA `0 14px 30px -8px rgba(205,242,74,.5)`; 카드 `0 10px 24px -12px <rarityColor>`.
- 화면 패딩 18–22px, 그리드/플렉스 gap 8–12px.
- 버튼 활성: `transform:scale(.97~.98)` (`:active`).

---

## Screens / Views

### 1. Home / Setup (`HomeScreen.tsx`)
- **Purpose**: 모드·구단명·포메이션·전술 선택 후 드래프트 시작.
- **Layout**: 세로 스크롤. 상단 eyebrow pill → H1 히어로(`Legend / Draft League`, "Draft"만 라임) → 설명 → 3칸 스탯 카드(11R / 8 / xG) → 모드 2칸 그리드 → 구단명 input → 포메이션 pill 행 → 전술 pill 행 → 라임 그라데이션 START 버튼(샤인 스윕 애니메이션).
- **모드 카드**: `리그`(20팀 더블 라운드로빈·38R 승점제), `컵`(16강 싱글 엘리미네이션·승부차기). 선택 시 라임 보더 + `linear-gradient(135deg, rgba(205,242,74,.16), var(--surf))` + 글로우.
- **포메이션**: `4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2`. **전술**: `점유율, 강한 압박, 역습, 로우블록`. 선택 pill은 배경 `--lime` + 글자 `#0a140d`.

### 2. Draft Room (`DraftRoom.tsx`)
- **Purpose**: 매 라운드 후보 카드 중 한 장을 영입해 베스트 XI 완성(11라운드 스네이크).
- **Layout**: 고정 헤더(라운드/픽 표시 + 내 픽 카운트 n/11 + 가로 스크롤 스네이크 픽 순서 칩) → 후보 영역(스크롤) → 고정 바텀(팀 전력 OVR + ATK/MID/DEF 스탯바).
- **후보 카드(FUT 스타일, 2열 그리드)**: 좌상단 OVR(레어도 색, Anton 34px) + 포지션 그룹, 우상단 레어도 라벨 + 국가. 하단 이름(Anton) + `포지션 · 국가` + 라임/레어도색 "영입 →" CTA. 카드 보더·글로우는 레어도 색. 우상단 대각 그라데이션 오버레이(레어도색, opacity .16) + 무한 샤인 스윕.
- **스네이크 픽 순서 칩**: 현재 차례(`index 0`)는 라임 보더 + `turnGlow` 펄스. 내 칩은 `YOU`(라임 글자).
- **최근 지명 피드**: 클럽 점(컬러) + 클럽명 + 선수명 + 슬롯 약어(GK/DF/MF/FW). 내 픽은 라임 틴트 배경.
- **AI 지명 중 상태**: 라임 점 3개 바운스 + "<클럽> 지명 중…".
- **완료 상태**: 🏆 + "스쿼드 완성" + 라임 "시즌 입장 →".

### 3. Squad Pitch (모달, `SquadPitch.tsx` / `pitch-modal`)
- **Purpose**: 포메이션별 11포지션 배치 확인.
- **Layout**: 풀스크린 dim(`rgba(4,10,7,.78)` + blur 6px) 위 중앙 카드(max 330px). 세로 피치(`aspect-ratio:.72`) + 센터서클/하프라인/페널티박스 라인(라임 18% 알파). 각 슬롯은 `%` 좌표 절대배치 — 그룹색 원형 도트(34px, 안에 OVR) + 이름. 포메이션별 좌표는 프로토타입 `SLOTS` 객체 참고.

### 4. Season (`SeasonScreen.tsx` + `StandingsTable.tsx`)
- **Purpose**: 매치데이 진행 + 순위표.
- **Layout**: 헤더(모드 라벨 + 매치데이 n/총) + **다음 경기 카드**(홈 vs 원정 + 전력 + 라임 "⚽ 킥오프"). 아래 순위표(스크롤): 컬럼 `# / 클럽 / 경기 / 승점 / 폼`.
- **순위 행**: 순위(Anton, 상위는 라임) + ▲/▼ 변동 화살표(상승 `#7fe87f`/하락 `#ff8a8a`) + 클럽 점·이름 + 경기수 + 승점(Anton) + 최근 3경기 폼 배지. 배경에 승점 비례 컬러 바(`linear-gradient(90deg, <color>28, transparent)`)가 깔린다. 내 클럽은 라임 보더+틴트.
- **종료 시**: 골드 그라데이션 "🏆 시상식 보기".

### 5. Match — Live (`MatchReport.tsx`)
- **Purpose**: 내 경기 라이브 관전.
- **Layout**: 상단 스코어보드(홈/원정 + 대형 스코어 Anton 46px, 라임=홈) + 진행 시계 바(0'→90', 라임 채움) → 이벤트 타임라인(스크롤, 한 이벤트씩 등장 `popIn`). 골 이벤트는 라임 틴트 행. 하단: 진행 중이면 "경기 진행 중…", 종료 시 결과 CTA(승리!/무승부/다음).
- **GOAL 팝**: 골 발생 시 화면 중앙에 `GOAL!`(Anton 80px, 라임, 글로우) + 득점자 — `goalKick` 1.6s 후 사라짐.

### 6. Champion / Awards
- **Purpose**: 우승팀 + 개인 시상.
- **Layout**: 중앙 정렬. 골드 펄스 링 2겹(`ringPulse`) + 🏆(`trophyRise`, drop-shadow) + 우승 클럽명(Anton 44px, 클럽 컬러) + 기록 pill(골드). 아래 어워드 카드 4개(최종 순위/득점왕/도움왕/클린시트) 스태거 `popIn`. 하단 "↻ 새 시즌 시작".

---

## Interactions & Behavior
- **화면 전환**: 각 화면 마운트 시 `scrIn` (`opacity 0→1`, `translateY(14px)+scale(.985)→0`, .45s `cubic-bezier(.2,.8,.2,1)`). React에서는 화면 키 변경 시 재마운트로 트리거(프로토타입은 `screenKey` 사용).
- **카드 딜**: 후보 카드 등장 `dealIn` (.5s, rotateY 90→0 + translateY 40→0).
- **카드 틸트(터치/마우스)**: `pointermove`로 커서 위치 기준 `perspective(600px) rotateY(±12deg) rotateX(±14deg) translateY(-4px) scale(1.03)`, `pointerleave` 시 리셋. transition `.12s`.
- **픽 임팩트**: 카드 선택 즉시 ① 후보 보드 잠금(중복 픽 방지) ② 레어도색 방사형 풀스크린 플래시 `flashFade` .7s ③ 360ms 뒤 AI 지명 시퀀스(각 520ms) → 라운드 진행.
- **스탯 바**: width `transition .6s cubic-bezier(.2,.8,.2,1)`. 값 = `(ovr-40)/0.6` % (40~99 → 0~~98%).
- **순위 변동**: 라운드 적용 전 `prevRank` 스냅샷 → 정렬 후 ▲▼ 표시.
- **라이브 타임라인**: 이벤트 1개씩 reveal(골 1700ms / 기타 850ms 간격). 골이면 GOAL 팝 동시 트리거.
- **무한 모션**: CTA 샤인(`shine` 2.6s), 현재 차례 칩(`turnGlow` 1.8s), 우승 링(`ringPulse` 2.4s), 로딩 점(`floatY`).

### Keyframes (전체 목록 — 프로토타입 `<style>`에 정의)
`scrIn, dealIn, popIn, flashFade, goalKick, shine, floatY, spark, trophyRise, ringPulse, barGrow, ticker, turnGlow`

## State Management
프로토타입 기준(실제로는 기존 `gameStore.ts` 리듀서로 매핑):
- `screen`: `home | draft | season | match | champion`
- 셋업: `mode, clubName, formation, tactic`
- `draft`: `{ round, pool, mySlots[], log[], aiCounts, candidates[] }`
- `season`: `{ teams[], table{}, sched[][], round, total }`
- `match`: `{ home, away, hg, ag, events[], shown, clock, finished }`
- UI 트랜지언트: `pitchOpen, flashOn, rarFlash, goalOn, goalText, aiPicking, aiPickingName`

## Assets
- 이미지 없음. 트로피/골/하프타임 등은 이모지(🏆 ⚽ 🏁 ⏸ 👑 🎯 🧤). 실제 출시 빌드에서는
  브랜드 톤에 맞는 아이콘셋으로 대체 권장(이모지는 플랫폼별 렌더 편차 있음).
- 폰트: 구글폰트 Anton, Archivo.

## Files
- `LegendDraftLeague.dc.html` — 전체 인터랙티브 프로토타입(이 번들에 포함). 토큰은 루트 인라인
  CSS 변수, 키프레임은 상단 `<style>`, 로직/상태는 하단 `class Component`에 있음.
- 코드베이스 참조 대상: `src/components/{HomeScreen,DraftRoom,SeasonScreen,MatchReport,SquadPitch,StandingsTable}.tsx`,
  `src/styles/{base,game}.css`.

---

## Claude Code에서 시작하는 법 (권장 절차)
1. 이 폴더를 레포 루트에 두고 Claude Code에 연다.
2. 첫 프롬프트 예시:
   > "`design_handoff_ui_redesign/README.md`와 `LegendDraftLeague.dc.html`을 읽어. 이 디자인 토큰과
   > 화면 스펙대로 `src/styles/game.css`의 색/타이포/모션을 교체하고, 기존
   > `src/components/*.tsx`의 마크업을 새 룩에 맞게 리팩터해줘. 게임 로직(`src/domain`,
   > `src/simulation`, `gameStore.ts`)은 건드리지 말 것."
3. 단계적으로: ① 토큰/폰트/배경부터 → ② Home → ③ DraftRoom(카드·틸트·픽 임팩트) →
   ④ Season/Standings → ⑤ Match 라이브 → ⑥ Champion 순으로 화면별 PR.
4. 각 단계마다 프로토타입 해당 화면과 나란히 비교해 픽셀 정합 확인.
