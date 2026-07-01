import { describe, expect, it } from "vitest"
import { __resetAttributeMemoForTest } from "../data/attributes"
import type { PlayerCard, RatingAxis } from "../data/schema"
import { type DraftState, getSlotsForFormation } from "../domain/draft"
import { createTeamProfile } from "./teamProfile"

/**
 * 깊이 하한(A-T10) — 능력치/적합도가 시뮬에 실제로 소비됨을 결정론적으로 증명한다.
 * 8축 단독 선형 remap(겉치레)이라면 mainPos는 무의미하고, 이진 적합도였다면 오프포지션이
 * 무해하다. 두 메커니즘 모두 팀 프로필에 측정 가능한 영향을 줘야 한다.
 *
 * 경험적 floor(고정 mid() 점수 기준, 결정론):
 *  - mechanism 1 (mainPos→속성): 전방 3명을 동일 8축·동일 positions로 두고 mainPos만
 *    공격형 vs 수비형(CB)으로 바꾸면 attack 차원이 ≥2 차이(공격형이 높음). 단일 카드는
 *    11명 평균에 희석돼 ~1이므로 전방 3명으로 신호를 확보(상한은 정체성 flavor 수준).
 *  - mechanism 2 (적합도 multiplier): 공격수를 수비 슬롯에 오프포지션 배치하면 roleBalance가
 *    ≥10 하락(positional discipline의 실제 게임플레이 효과).
 * 순수 relabel/이진 적합도였다면 두 차이 모두 0이 되어 실패한다.
 */

const F = "4-3-3"
const FORWARD_POSITIONS = ["ST", "LW", "RW"]

function mid(): Record<RatingAxis, number> {
  return {
    scoring: 90,
    creation: 80,
    progression: 80,
    control: 78,
    defense: 78,
    physical: 80,
    mobility: 82,
    mental: 80,
  }
}

function makeCard(
  id: string,
  mainPos: string,
  positions: readonly string[],
  scores: Record<RatingAxis, number>,
): PlayerCard {
  return {
    id,
    playerId: id,
    label: id,
    year: null,
    age: null,
    country: "Testland",
    eligibleEra: "career peak",
    positions,
    mainPos,
    roles: ["Player"],
    ratings: {
      scoring: "A",
      creation: "A",
      progression: "A",
      control: "B",
      defense: "B",
      physical: "A",
      mobility: "A",
      mental: "A",
    },
    internalScores: scores,
    tags: ["curated_pool"],
    cost: 80,
    rarity: "Epic",
    ratingRationale: "deterministic depth-floor test card rationale",
    ratingReviewer: "test",
    ratingStatus: "draft",
  }
}

function isForwardSlot(accepted: readonly string[]): boolean {
  return FORWARD_POSITIONS.some((position) => accepted.includes(position))
}

/** 전 슬롯 natural-fit 스쿼드. 전방 3명의 mainPos만 공격형/수비형으로 갈아끼운다. */
function buildSquad(forwardsAsDefenders: boolean): { squad: DraftState; cards: PlayerCard[] } {
  const slots = getSlotsForFormation(F)
  const cards: PlayerCard[] = []
  const picks = slots.map((slot) => {
    const natural = slot.acceptedPositions[0] ?? "CM"
    const mainPos = isForwardSlot(slot.acceptedPositions) && forwardsAsDefenders ? "CB" : natural
    const card = makeCard(
      `f_${slot.id}${forwardsAsDefenders ? "_d" : ""}`,
      mainPos,
      [natural], // positions=슬롯 → 양쪽 모두 Natural fit, mainPos만 변수
      mid(),
    )
    cards.push(card)
    return { slotId: slot.id, cardId: card.id }
  })
  return { squad: { formation: F, picks }, cards }
}

/** 강한 공격수를 지정 슬롯에 두고 나머지는 natural-fit 필러로 채운 스쿼드. */
function buildWithStrikerAt(slotId: string): { squad: DraftState; cards: PlayerCard[] } {
  const slots = getSlotsForFormation(F)
  const cards: PlayerCard[] = []
  const striker = makeCard("striker", "ST", ["ST"], mid())
  const picks = slots.map((slot) => {
    if (slot.id === slotId) {
      cards.push(striker)
      return { slotId: slot.id, cardId: striker.id }
    }
    const natural = slot.acceptedPositions[0] ?? "CM"
    const filler = makeCard(`g_${slot.id}`, natural, [natural], mid())
    cards.push(filler)
    return { slotId: slot.id, cardId: filler.id }
  })
  return { squad: { formation: F, picks }, cards }
}

describe("attribute depth floor", () => {
  it("mainPos(공격형 vs 수비형)가 attack 차원을 ≥2 바꾼다 (겉치레 아님)", () => {
    __resetAttributeMemoForTest()
    const attacking = buildSquad(false)
    const defensive = buildSquad(true)
    const atkProfile = createTeamProfile(attacking.squad, attacking.cards, "점유율")
    const defProfile = createTeamProfile(defensive.squad, defensive.cards, "점유율")
    // 동일 8축·동일 positions, 전방 3명 mainPos만 다름 → 시뮬 소비로 attack 변별.
    expect(atkProfile.attack - defProfile.attack).toBeGreaterThanOrEqual(2)
  })

  it("적합도 multiplier: 공격수를 수비 슬롯에 오프포지션 배치하면 roleBalance가 ≥10 하락한다", () => {
    __resetAttributeMemoForTest()
    const slots = getSlotsForFormation(F)
    const strikerSlot = slots.find((slot) => slot.acceptedPositions.includes("ST"))
    const defenderSlot = slots.find(
      (slot) => slot.acceptedPositions.includes("CB") && !slot.acceptedPositions.includes("ST"),
    )
    if (strikerSlot === undefined || defenderSlot === undefined) {
      throw new Error("4-3-3 슬롯 가정 위반")
    }
    const natural = buildWithStrikerAt(strikerSlot.id)
    const foreign = buildWithStrikerAt(defenderSlot.id)
    const naturalProfile = createTeamProfile(natural.squad, natural.cards, "점유율")
    const foreignProfile = createTeamProfile(foreign.squad, foreign.cards, "점유율")
    expect(naturalProfile.roleBalance - foreignProfile.roleBalance).toBeGreaterThanOrEqual(10)
  })
})
