/**
 * 데일리 시드: 날짜에서 결정론적으로 파생한다.
 *
 * 같은 UTC 날짜면 전 세계 모든 플레이어가 동일한 드래프트풀/AI 대진/케미 조건을 받는다.
 * Date는 UI 경계(todayDailySeed)에서만 읽고, 시뮬/리듀서에는 순수 문자열만 전달한다.
 */

/** UTC YYYY-MM-DD 문자열에서 결정론적 시드를 만든다(순수). */
export function dailySeedForDate(isoDate: string): string {
  return `daily-${isoDate}`
}

/** 주어진 시각(기본: 지금)의 UTC 날짜 문자열. */
export function utcDateString(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

/** 오늘(UTC)의 데일리 시드. UI 경계에서만 호출한다. */
export function todayDailySeed(now: number = Date.now()): string {
  return dailySeedForDate(utcDateString(now))
}
