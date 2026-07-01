/**
 * 광고 추상화 레이어의 공용 타입.
 *
 * 게임 코드는 이 인터페이스에만 의존하고, 실제 광고 SDK(웹 mock / 네이티브 AdMob)는
 * 런타임에 플랫폼에 맞춰 주입된다. 보상형 광고는 "끝까지 시청해야 보상을 지급"하는
 * 모델이므로 showRewarded는 시청 완료 여부를 반환한다.
 */

export const rewardedActions = [
  "replay_match",
  "undo_pick",
  "scout_report",
  "reroll_candidates",
] as const

export type RewardedAction = (typeof rewardedActions)[number]

export type RewardedOutcome = {
  /** 광고를 끝까지 시청해 보상 지급 조건을 충족했는지 */
  readonly rewarded: boolean
  /** 사용자가 닫았거나 광고 로드 실패 등으로 보상이 없을 때의 사유(로깅/UI용) */
  readonly reason?: "dismissed" | "failed" | "not_ready" | "capped"
}

export type AdPlacement = {
  readonly action: RewardedAction
  readonly title: string
  readonly description: string
}

export const rewardedPlacements: Readonly<Record<RewardedAction, AdPlacement>> = {
  replay_match: {
    action: "replay_match",
    title: "재경기",
    description: "광고를 보고 이번 경기를 다른 흐름으로 다시 치릅니다.",
  },
  undo_pick: {
    action: "undo_pick",
    title: "지명 되돌리기",
    description: "광고를 보고 직전 내 지명을 취소하고 다시 선택합니다.",
  },
  scout_report: {
    action: "scout_report",
    title: "스카우트 리포트",
    description: "광고를 보고 다음 상대의 전력 분석을 미리 확인합니다.",
  },
  reroll_candidates: {
    action: "reroll_candidates",
    title: "후보 새로고침",
    description: "광고를 보고 이번 지명 후보 카드를 다시 뽑습니다.",
  },
}

export type AdProvider = {
  /** 플랫폼 식별용. 네이티브(AdMob)면 true, 웹 mock이면 false */
  readonly isNative: boolean
  /** SDK 초기화 (앱 시작 시 1회). 실패해도 게임은 계속되어야 한다 */
  initialize(): Promise<void>
  /** 보상형 광고 표시. 시청 완료 시 { rewarded: true } */
  showRewarded(action: RewardedAction): Promise<RewardedOutcome>
  /** 전면 광고 표시(라운드 전환 등). 보상 개념 없음 */
  showInterstitial(): Promise<void>
}
