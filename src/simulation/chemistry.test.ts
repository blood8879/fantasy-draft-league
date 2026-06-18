import { describe, expect, it } from "vitest"
import type { PlayerCard } from "../data/schema"
import { type ChemistryInput, computeChemistry } from "./chemistry"

let counter = 0

function card(overrides: Partial<PlayerCard> & { readonly country: string }): PlayerCard {
  counter += 1
  const score = overrides.cost ?? 75
  return {
    id: `card-${counter}`,
    playerId: `p-${counter}`,
    label: `Player ${counter}`,
    year: null,
    age: null,
    eligibleEra: "all-time pool",
    positions: ["CM"],
    roles: ["Midfielder"],
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
    internalScores: {
      scoring: 70,
      creation: 70,
      progression: 70,
      control: 70,
      defense: 70,
      physical: 70,
      mobility: 70,
      mental: 70,
    },
    tags: ["curated_pool"],
    cost: score,
    rarity: "Common",
    ratingRationale: "test card rationale that is long enough",
    ratingReviewer: "test",
    ratingStatus: "draft",
    ...overrides,
  }
}

function input(c: PlayerCard, slotLabel = "CM"): ChemistryInput {
  return { card: c, slotLabel }
}

describe("computeChemistry", () => {
  it("빈 스쿼드는 중립 점수 75를 돌려준다", () => {
    const result = computeChemistry([], "점유율")
    expect(result.score).toBe(75)
    expect(result.links).toHaveLength(0)
  })

  it("같은 국적 4명이면 국적 케미가 활성화되고 해당 선수에 보너스가 붙는다", () => {
    const dutch = Array.from({ length: 4 }, () => card({ country: "Netherlands" }))
    const result = computeChemistry(
      dutch.map((c) => input(c)),
      "점유율",
    )
    const nation = result.links.find((link) => link.kind === "nation")
    expect(nation?.label).toBe("Netherlands")
    expect(nation?.count).toBe(4)
    for (const c of dutch) {
      expect(result.bonusByCardId.get(c.id) ?? 0).toBeGreaterThan(0)
    }
    expect(result.score).toBeGreaterThan(75)
  })

  it("국적 3명만으로는 국적 케미가 생기지 않는다", () => {
    const three = Array.from({ length: 3 }, () => card({ country: "Brazil" }))
    const result = computeChemistry(
      three.map((c) => input(c)),
      "점유율",
    )
    expect(result.links.some((link) => link.kind === "nation")).toBe(false)
  })

  it("같은 클럽 2명이면 클럽 케미가 활성화된다", () => {
    const pair = [
      card({ country: "Spain", club: "Barcelona" }),
      card({ country: "Argentina", club: "Barcelona" }),
    ]
    const result = computeChemistry(
      pair.map((c) => input(c)),
      "점유율",
    )
    expect(result.links.some((link) => link.kind === "club" && link.label === "Barcelona")).toBe(
      true,
    )
  })

  it("평균 전력이 낮으면 언더독 케미가 붙는다", () => {
    const weak = Array.from({ length: 5 }, () => card({ country: "Mixed", cost: 55 }))
    // 국적이 모두 같으면 nation 케미도 붙으니 국적을 분산
    weak.forEach((c, i) => {
      // @ts-expect-error 테스트 편의상 country 덮어쓰기
      c.country = `Nation${i}`
    })
    const result = computeChemistry(
      weak.map((c) => input(c)),
      "점유율",
    )
    expect(result.links.some((link) => link.kind === "underdog")).toBe(true)
  })

  it("카드 보너스는 상한(+12)을 넘지 않는다", () => {
    // 같은 국적 8명 + 같은 클럽 4명 + 언더독을 한 선수에 겹쳐도 상한이 적용된다
    const stacked = Array.from({ length: 8 }, () =>
      card({ country: "Italy", club: "Juventus", cost: 55 }),
    )
    const result = computeChemistry(
      stacked.map((c) => input(c)),
      "점유율",
    )
    for (const c of stacked) {
      expect(result.bonusByCardId.get(c.id) ?? 0).toBeLessThanOrEqual(12)
    }
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
