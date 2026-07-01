import { describe, expect, it } from "vitest"
import type { PlayerCard, RatingAxis } from "../data/schema"
import { GRADE_MULTIPLIER, resolveFit } from "./positionFit"

function scores(overrides: Partial<Record<RatingAxis, number>> = {}): Record<RatingAxis, number> {
  return {
    scoring: 70,
    creation: 70,
    progression: 70,
    control: 70,
    defense: 70,
    physical: 70,
    mobility: 70,
    mental: 70,
    ...overrides,
  }
}

function card(positions: readonly string[], s: Record<RatingAxis, number>): PlayerCard {
  return {
    id: "fit_test",
    playerId: "fit_test",
    label: "Fit",
    year: null,
    age: null,
    country: "X",
    eligibleEra: "x",
    positions,
    mainPos: positions[0] ?? "CM",
    roles: ["Player"],
    ratings: {
      scoring: "B",
      creation: "B",
      progression: "B",
      control: "B",
      defense: "B",
      physical: "B",
      mobility: "B",
      mental: "B",
    },
    internalScores: s,
    tags: ["curated_pool"],
    cost: 70,
    rarity: "Common",
    ratingRationale: "deterministic fit test rationale text",
    ratingReviewer: "test",
    ratingStatus: "draft",
  }
}

describe("position fit grades", () => {
  it("주포지션이면 Natural(1.0)", () => {
    const result = resolveFit(card(["ST"], scores()), ["ST"])
    expect(result).toEqual({ grade: "Natural", multiplier: 1.0 })
  })

  it("후보 포지션 목록에 포함되면 Natural", () => {
    const result = resolveFit(card(["RW", "ST"], scores()), ["ST"])
    expect(result.grade).toBe("Natural")
  })

  it("자기 포지션과 동떨어진 슬롯은 1.0 미만 승수를 받는다", () => {
    // 공격 특화(수비 낮음) 윙어를 센터백 슬롯에 → 적합도 하락.
    const winger = card(["RW"], scores({ defense: 45, physical: 50, scoring: 90, mobility: 90 }))
    const result = resolveFit(winger, ["CB"])
    expect(result.grade).not.toBe("Natural")
    expect(result.multiplier).toBeLessThan(1.0)
    expect(Object.values(GRADE_MULTIPLIER)).toContain(result.multiplier)
  })

  it("빈 후보 목록은 Ineffectual", () => {
    expect(resolveFit(card(["ST"], scores()), [])).toEqual({
      grade: "Ineffectual",
      multiplier: 0.5,
    })
  })

  it("결정론: 동일 입력은 동일 결과", () => {
    const c = card(["CM"], scores())
    expect(resolveFit(c, ["AM"])).toEqual(resolveFit(c, ["AM"]))
  })
})
