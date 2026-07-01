import { beforeEach, describe, expect, it } from "vitest"
import { __resetAttributeMemoForTest, deriveAttributes } from "./attributes"
import { curatedPoolCards } from "./curatedPlayerPool"
import { attributeKeys } from "./schema"
import type { PlayerCard, RatingAxis } from "./schema"

const SCORES: Record<RatingAxis, number> = {
  scoring: 75,
  creation: 70,
  progression: 72,
  control: 68,
  defense: 60,
  physical: 66,
  mobility: 74,
  mental: 71,
}

function testCard(
  id: string,
  mainPos: string,
  tags: readonly string[] = ["curated_pool"],
): PlayerCard {
  return {
    id,
    playerId: id,
    label: "Test",
    year: null,
    age: null,
    country: "Testland",
    eligibleEra: "career peak",
    positions: [mainPos],
    mainPos,
    roles: ["Player"],
    ratings: {
      scoring: "B",
      creation: "B",
      progression: "B",
      control: "B",
      defense: "C",
      physical: "C",
      mobility: "B",
      mental: "B",
    },
    internalScores: SCORES,
    tags,
    cost: 70,
    rarity: "Common",
    ratingRationale: "deterministic test card rationale text",
    ratingReviewer: "test",
    ratingStatus: "draft",
  }
}

describe("attribute derivation", () => {
  beforeEach(() => {
    __resetAttributeMemoForTest()
  })

  it("모든 큐레이티드 카드의 mainPos는 비어있지 않고 playerId 프리픽스와 정합한다", () => {
    expect(curatedPoolCards.length).toBeGreaterThan(0)
    for (const card of curatedPoolCards) {
      expect(card.mainPos.length).toBeGreaterThan(0)
      expect(card.playerId.startsWith(`curated_${card.mainPos.toLowerCase()}_`)).toBe(true)
    }
  })

  it("동일 8축이라도 mainPos가 다르면 속성 벡터가 달라진다(겉치레 아님)", () => {
    const striker = deriveAttributes(testCard("t_st", "ST"))
    const centreBack = deriveAttributes(testCard("t_cb", "CB"))
    expect(striker).not.toEqual(centreBack)
    // 포지션 정체성: 스트라이커 finishing > 센터백 finishing, 센터백 marking > 스트라이커 marking.
    expect(striker.finishing).toBeGreaterThan(centreBack.finishing)
    expect(centreBack.marking).toBeGreaterThan(striker.marking)
  })

  it("모든 속성은 40~99로 클램프된다", () => {
    const attrs = deriveAttributes(testCard("t_clamp", "ST"))
    for (const key of attributeKeys) {
      expect(attrs[key]).toBeGreaterThanOrEqual(40)
      expect(attrs[key]).toBeLessThanOrEqual(99)
    }
  })

  it("결정론: 같은 카드를 두 번 파생하면 동일하다", () => {
    const a = deriveAttributes(testCard("t_det", "CM"))
    __resetAttributeMemoForTest()
    const b = deriveAttributes(testCard("t_det", "CM"))
    expect(a).toEqual(b)
  })

  it("legend_card 태그는 composure/workRate에 소폭 가산한다", () => {
    const plain = deriveAttributes(testCard("t_plain", "CM", ["curated_pool", "season_card"]))
    const legend = deriveAttributes(testCard("t_legend", "CM", ["curated_pool", "legend_card"]))
    expect(legend.composure).toBeGreaterThanOrEqual(plain.composure)
    expect(legend.workRate).toBeGreaterThanOrEqual(plain.workRate)
  })
})
