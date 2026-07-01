import { deriveAttributes } from "../data/attributes"
import type { AttributeKey, PlayerAttributes, PlayerCard } from "../data/schema"
import { type DraftState, getSlotsForFormation } from "../domain/draft"
import type { TacticType } from "../domain/types"
import { computeChemistry } from "./chemistry"
import { resolveFit } from "./positionFit"
import type { TeamProfile } from "./types"

type PositionedCard = {
  readonly card: PlayerCard
  readonly slotLabel: string
  /** 포지션 적합도 승수(resolveFit). Natural=1.0 ~ Ineffectual=0.5 */
  readonly fit: number
  readonly attributes: PlayerAttributes
}

/** 팀 프로필 차원별 소비 속성(시뮬 소비 매핑). 변경 시 SIM_VERSION 범프 대상. */
export const PROFILE_DIM_ATTRIBUTES = {
  attack: ["finishing", "longShots"],
  chanceCreation: ["vision", "passing", "firstTouch"],
  midfieldControl: ["passing", "composure", "workRate"],
  pressResistance: ["firstTouch", "dribbling"],
  transition: ["pace", "dribbling"],
  defensiveStability: ["tackling", "marking", "strength"],
  aerialSetPiece: ["strength", "finishing"],
  stamina: ["stamina", "workRate"],
} as const satisfies Record<string, readonly AttributeKey[]>

export function createTeamProfile(
  draft: DraftState,
  cards: readonly PlayerCard[],
  tactic: TacticType,
): TeamProfile {
  const positionedCards = draft.picks.flatMap((pick) => {
    const slot = getSlotsForFormation(draft.formation).find(
      (candidate) => candidate.id === pick.slotId,
    )
    const card = cards.find((candidate) => candidate.id === pick.cardId)
    if (slot === undefined || card === undefined) {
      return []
    }
    const fit = resolveFit(card, slot.acceptedPositions).multiplier
    return [{ card, slotLabel: slot.label, fit, attributes: deriveAttributes(card) }]
  })

  const chem = computeChemistry(
    positionedCards.map((item) => ({ card: item.card, slotLabel: item.slotLabel })),
  )
  const bonus = chem.bonusByCardId

  return {
    attack: tacticBoost(
      tactic,
      "attack",
      averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.attack, bonus),
    ),
    chanceCreation: averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.chanceCreation, bonus),
    midfieldControl: averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.midfieldControl, bonus),
    pressResistance: averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.pressResistance, bonus),
    transition: tacticBoost(
      tactic,
      "transition",
      averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.transition, bonus),
    ),
    defensiveStability: averageAxis(
      positionedCards,
      PROFILE_DIM_ATTRIBUTES.defensiveStability,
      bonus,
    ),
    aerialSetPiece: averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.aerialSetPiece, bonus),
    stamina: averageAxis(positionedCards, PROFILE_DIM_ATTRIBUTES.stamina, bonus),
    chemistry: chem.score,
    chemistryLinks: chem.links,
    roleBalance: calculateRoleBalance(positionedCards),
    tactic,
  }
}

const PROFILE_KEYS = [
  "attack",
  "chanceCreation",
  "midfieldControl",
  "pressResistance",
  "transition",
  "defensiveStability",
  "aerialSetPiece",
  "stamina",
  "chemistry",
  "roleBalance",
] as const

/** 여러 팀 프로필을 축별로 평균낸다(리그 평균선 비교용). 빈 배열이면 undefined. */
export function averageProfiles(profiles: readonly TeamProfile[]): TeamProfile | undefined {
  const first = profiles[0]
  if (first === undefined) {
    return undefined
  }
  const acc: Record<string, number> = {}
  for (const key of PROFILE_KEYS) {
    acc[key] = Math.round(
      profiles.reduce((sum, profile) => sum + (profile[key] as number), 0) / profiles.length,
    )
  }
  return { ...(acc as unknown as TeamProfile), chemistryLinks: [], tactic: first.tactic }
}

function averageAxis(
  cards: readonly PositionedCard[],
  axes: readonly AttributeKey[],
  bonusByCardId: ReadonlyMap<string, number>,
): number {
  if (cards.length === 0) {
    return 0
  }
  const total = cards.reduce((sum, positionedCard) => {
    const cardBonus = bonusByCardId.get(positionedCard.card.id) ?? 0
    const axisScore = axes.reduce(
      (axisTotal, axis) => axisTotal + positionedCard.attributes[axis] + cardBonus,
      0,
    )
    return sum + (axisScore / axes.length) * positionedCard.fit
  }, 0)
  return Math.round(total / cards.length)
}

function calculateRoleBalance(cards: readonly PositionedCard[]): number {
  const poorFits = cards.filter((item) => item.fit < 1).length
  const attackerHeavy = cards.filter((item) => item.card.ratings.defense === "D").length
  return Math.max(35, 92 - poorFits * 18 - Math.max(0, attackerHeavy - 2) * 4)
}

/** 전술 보정 델타(시뮬 소비). 변경 시 SIM_VERSION 범프 대상. */
export const TACTIC_BOOST = { counterTransition: 6, pressAttack: 3 } as const

function tacticBoost(tactic: TacticType, target: "attack" | "transition", value: number): number {
  if (tactic === "역습" && target === "transition") {
    return value + TACTIC_BOOST.counterTransition
  }
  if (tactic === "강한 압박" && target === "attack") {
    return value + TACTIC_BOOST.pressAttack
  }
  return value
}
