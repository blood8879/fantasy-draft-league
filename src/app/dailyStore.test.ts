import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { commitDailyResult, loadDailyPb } from "./dailyStore"
import type { PickLog, RunScore } from "./runScore"

function memStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => map.clear(),
  }
}

const globalRef = globalThis as unknown as { localStorage?: unknown }

function score(total: number): RunScore {
  return { total, teamCount: 16, breakdown: { rank: 1, points: 9, gd: 5, achBonus: 120 } }
}

const pickLog: PickLog = {
  seed: "daily-2026-06-30",
  simVersion: 1,
  datasetVersion: 1,
  format: "컵",
  picks: [],
}

describe("daily PB store", () => {
  let original: unknown
  beforeEach(() => {
    original = globalRef.localStorage
    globalRef.localStorage = memStorage()
  })
  afterEach(() => {
    globalRef.localStorage = original
  })

  it("첫 결과는 신기록으로 기록되고 시드로 조회된다", () => {
    const result = commitDailyResult("daily-2026-06-30", "컵", score(1200), pickLog)
    expect(result.isNewRecord).toBe(true)
    expect(result.bestTotal).toBe(1200)
    expect(result.attempts).toBe(1)
    expect(loadDailyPb("daily-2026-06-30")?.bestTotal).toBe(1200)
  })

  it("더 낮은 점수는 PB를 교체하지 않지만 시도 횟수는 증가한다", () => {
    commitDailyResult("daily-2026-06-30", "컵", score(1200), pickLog)
    const lower = commitDailyResult("daily-2026-06-30", "컵", score(900), pickLog)
    expect(lower.isNewRecord).toBe(false)
    expect(lower.bestTotal).toBe(1200)
    expect(lower.attempts).toBe(2)
    expect(loadDailyPb("daily-2026-06-30")?.bestTotal).toBe(1200)
  })

  it("더 높은 점수는 PB를 교체한다", () => {
    commitDailyResult("daily-2026-06-30", "컵", score(1200), pickLog)
    const higher = commitDailyResult("daily-2026-06-30", "컵", score(1500), pickLog)
    expect(higher.isNewRecord).toBe(true)
    expect(higher.bestTotal).toBe(1500)
  })

  it("다른 시드는 독립적으로 누적된다", () => {
    commitDailyResult("daily-2026-06-30", "컵", score(1200), pickLog)
    expect(loadDailyPb("daily-2026-07-01")).toBeUndefined()
  })

  it("PB 키는 자유 플레이 SAVE_KEY와 분리되어 NEW_GAME에 영향받지 않는다", () => {
    commitDailyResult("daily-2026-06-30", "컵", score(1200), pickLog)
    // 자유 플레이 저장 키를 지워도(=NEW_GAME 효과) 데일리 PB는 유지
    ;(globalRef.localStorage as ReturnType<typeof memStorage>).removeItem(
      "legend-draft-league-save-v1",
    )
    expect(loadDailyPb("daily-2026-06-30")?.bestTotal).toBe(1200)
  })
})
