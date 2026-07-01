/**
 * 보상형 광고 레이트리밋(어뷰징/무효 트래픽 방지).
 *
 * AdMob 등 광고 네트워크는 짧은 시간에 반복되는 보상형 광고 요청/노출을 "무효 트래픽"으로
 * 간주해 계정을 정지시킬 수 있다. 이 가드는 모든 보상형 placement에 공통으로 적용되는
 * 전역 쿨다운 + 세션 상한 + 일일 상한을 강제한다.
 *
 * - 쿨다운: 직전 광고로부터 최소 간격. 앱 재시작 후에도 localStorage에 남은 마지막 노출
 *   시각으로 이어진다(재시작 farming 방지).
 * - 세션 상한: 한 번의 앱 실행 동안 허용되는 보상형 광고 수(모듈 메모리).
 * - 일일 상한: UTC 날짜 기준 하루 허용량(localStorage).
 */

const STORAGE_KEY = "legend-draft-league-ad-guard-v1"

/** 보상형 광고 사이 최소 간격(ms). */
export const REWARDED_COOLDOWN_MS = 60_000
/** 한 세션(앱 실행) 동안 허용하는 보상형 광고 수. */
export const REWARDED_SESSION_CAP = 6
/** UTC 하루 동안 허용하는 보상형 광고 수. */
export const REWARDED_DAILY_CAP = 15

export type AdGuardReason = "cooldown" | "session_cap" | "daily_cap"

export type AdGuardDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: AdGuardReason; readonly retryAfterMs: number }

type DailyState = {
  readonly date: string
  readonly count: number
  readonly lastShownAt: number
}

let sessionCount = 0
let sessionLastShownAt = 0

function todayUtc(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

function readDaily(now: number): DailyState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw) as Partial<DailyState>
      if (
        typeof parsed.date === "string" &&
        typeof parsed.count === "number" &&
        typeof parsed.lastShownAt === "number" &&
        parsed.date === todayUtc(now)
      ) {
        return { date: parsed.date, count: parsed.count, lastShownAt: parsed.lastShownAt }
      }
    }
  } catch {
    // 손상/접근 불가 시 빈 상태로 폴백
  }
  return { date: todayUtc(now), count: 0, lastShownAt: 0 }
}

function writeDaily(state: DailyState): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 저장 실패해도 게임은 계속된다
  }
}

/** 지금 보상형 광고를 보여줘도 되는지 판정한다. 부수효과 없음. */
export function canShowRewarded(now: number = Date.now()): AdGuardDecision {
  const daily = readDaily(now)
  const lastShownAt = Math.max(sessionLastShownAt, daily.lastShownAt)
  const sinceLast = now - lastShownAt
  if (lastShownAt > 0 && sinceLast < REWARDED_COOLDOWN_MS) {
    return { allowed: false, reason: "cooldown", retryAfterMs: REWARDED_COOLDOWN_MS - sinceLast }
  }
  if (sessionCount >= REWARDED_SESSION_CAP) {
    return { allowed: false, reason: "session_cap", retryAfterMs: 0 }
  }
  if (daily.count >= REWARDED_DAILY_CAP) {
    return { allowed: false, reason: "daily_cap", retryAfterMs: 0 }
  }
  return { allowed: true }
}

/** 보상형 광고를 실제로 띄우기로 했을 때 호출해 카운터를 기록한다. */
export function recordRewardedShown(now: number = Date.now()): void {
  sessionCount += 1
  sessionLastShownAt = now
  const daily = readDaily(now)
  writeDaily({ date: todayUtc(now), count: daily.count + 1, lastShownAt: now })
}

/** 테스트 전용: 세션 카운터 초기화. */
export function __resetAdGuardSessionForTest(): void {
  sessionCount = 0
  sessionLastShownAt = 0
}
