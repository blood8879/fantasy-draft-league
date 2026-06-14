import type { PlayerCard, RatingAxis } from "../data/schema"
import { type DraftState, getSlotsForFormation } from "../domain/draft"
import type { TacticType } from "../domain/types"
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

  return {
    attack: tacticBoost(tactic, "attack", averageAxis(positionedCards, ["scoring", "creation"])),
    chanceCreation: averageAxis(positionedCards, ["creation", "control", "progression"]),
    midfieldControl: averageAxis(positionedCards, ["control", "mental"]),
    pressResistance: averageAxis(positionedCards, ["control", "mobility"]),
    transition: tacticBoost(
      tactic,
      "transition",
      averageAxis(positionedCards, ["mobility", "progression"]),
    ),
    defensiveStability: averageAxis(positionedCards, ["defense", "physical", "mental"]),
    aerialSetPiece: averageAxis(positionedCards, ["physical", "scoring"]),
    stamina: averageAxis(positionedCards, ["mobility", "mental"]),
    chemistry: calculateChemistry(positionedCards),
    roleBalance: calculateRoleBalance(positionedCards),
    tactic,
  }
}

function getPositionFit(card: PlayerCard, acceptedPositions: readonly string[]): number {
  return card.positions.some((position) => acceptedPositions.includes(position)) ? 1 : 0.62
}

function averageAxis(cards: readonly PositionedCard[], axes: readonly RatingAxis[]): number {
  if (cards.length === 0) {
    return 0
  }
  const total = cards.reduce((sum, positionedCard) => {
    const axisScore = axes.reduce(
      (axisTotal, axis) => axisTotal + positionedCard.card.internalScores[axis],
      0,
    )
    return sum + (axisScore / axes.length) * positionedCard.fit
  }, 0)
  return Math.round(total / cards.length)
}

function calculateChemistry(cards: readonly PositionedCard[]): number {
  const eras = new Map<string, number>()
  for (const item of cards) {
    eras.set(item.card.eligibleEra, (eras.get(item.card.eligibleEra) ?? 0) + 1)
  }
  const bestEraCount = Math.max(...Array.from(eras.values()), 0)
  return Math.min(100, 68 + bestEraCount * 4)
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
