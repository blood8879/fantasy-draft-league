import { describe, expect, it } from "vitest"
import { dailySeedForDate, todayDailySeed, utcDateString } from "./dailySeed"

describe("daily seed", () => {
  it("dailySeedForDate는 순수·결정론(같은 날짜 같은 시드)", () => {
    expect(dailySeedForDate("2026-06-30")).toBe("daily-2026-06-30")
    expect(dailySeedForDate("2026-06-30")).toBe(dailySeedForDate("2026-06-30"))
    expect(dailySeedForDate("2026-07-01")).not.toBe(dailySeedForDate("2026-06-30"))
  })

  it("utcDateString은 UTC 경계 기준 YYYY-MM-DD", () => {
    // 2026-06-30T23:30:00Z → 같은 UTC 날짜
    expect(utcDateString(Date.UTC(2026, 5, 30, 23, 30, 0))).toBe("2026-06-30")
    // 2026-07-01T00:30:00Z → 다음 날
    expect(utcDateString(Date.UTC(2026, 6, 1, 0, 30, 0))).toBe("2026-07-01")
  })

  it("todayDailySeed는 주어진 시각의 UTC 시드", () => {
    expect(todayDailySeed(Date.UTC(2026, 5, 30, 12, 0, 0))).toBe("daily-2026-06-30")
  })
})
