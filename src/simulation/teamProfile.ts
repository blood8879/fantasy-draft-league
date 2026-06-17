import type { PlayerCard, RatingAxis } from "../data/schema"
import { type DraftState, getSlotsForFormation } from "../domain/draft"
import type { TacticType } from "../domain/types"
import { computeChemistry } from "./chemistry"
import type { TeamProfile } from "./types"

type PositionedCard = {
  readonly card: PlayerCard
  readonly slotLabel: string
  readonly fit: number
}

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
    return [{ card, slotLabel: slot.label, fit: getPositionFit(card, slot.acceptedPositions) }]
  })

  const chem = computeChemistry(
    positionedCards.map((item) => ({ card: item.card, slotLabel: item.slotLabel })),
    tactic,
  )
  const bonus = chem.bonusByCardId

  return {
    attack: tacticBoost(
      tactic,
      "attack",
      averageAxis(positionedCards, ["scoring", "creation"], bonus),
    ),
    chanceCreation: averageAxis(positionedCards, ["creation", "control", "progression"], bonus),
    midfieldControl: averageAxis(positionedCards, ["control", "mental"], bonus),
    pressResistance: averageAxis(positionedCards, ["control", "mobility"], bonus),
    transition: tacticBoost(
      tactic,
      "transition",
      averageAxis(positionedCards, ["mobility", "progression"], bonus),
    ),
    defensiveStability: averageAxis(positionedCards, ["defense", "physical", "mental"], bonus),
    aerialSetPiece: averageAxis(positionedCards, ["physical", "scoring"], bonus),
    stamina: averageAxis(positionedCards, ["mobility", "mental"], bonus),
    chemistry: chem.score,
    chemistryLinks: chem.links,
    roleBalance: calculateRoleBalance(positionedCards),
    tactic,
  }
}

function getPositionFit(card: PlayerCard, acceptedPositions: readonly string[]): number {
  return card.positions.some((position) => acceptedPositions.includes(position)) ? 1 : 0.62
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
  axes: readonly RatingAxis[],
  bonusByCardId: ReadonlyMap<string, number>,
): number {
  if (cards.length === 0) {
    return 0
  }
  const total = cards.reduce((sum, positionedCard) => {
    const cardBonus = bonusByCardId.get(positionedCard.card.id) ?? 0
    const axisScore = axes.reduce(
      (axisTotal, axis) => axisTotal + positionedCard.card.internalScores[axis] + cardBonus,
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

function tacticBoost(tactic: TacticType, target: "attack" | "transition", value: number): number {
  if (tactic === "역습" && target === "transition") {
    return value + 6
  }
  if (tactic === "강한 압박" && target === "attack") {
    return value + 3
  }
  return value
}
