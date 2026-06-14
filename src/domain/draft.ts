import type { PlayerCard } from "../data/schema"
import { type DraftSlot, type SlotId, draftSlots, formationSlots } from "./formations"
import type { FormationType } from "./types"

export type { DraftSlot, SlotId } from "./formations"
export type DraftPick = {
  readonly slotId: SlotId
  readonly cardId: string
}

export type DraftState = {
  readonly formation: FormationType
  readonly picks: readonly DraftPick[]
}

export { draftSlots, formationSlots }

export function createEmptyDraft(formation: FormationType = "4-3-3"): DraftState {
  return { formation, picks: [] }
}

export function setDraftPick(draft: DraftState, slotId: SlotId, cardId: string): DraftState {
  return {
    ...draft,
    picks: [...draft.picks.filter((pick) => pick.slotId !== slotId), { slotId, cardId }],
  }
}

export function getSlotsForFormation(formation: FormationType): readonly DraftSlot[] {
  return formationSlots[formation]
}

export function getSlotForFormation(formation: FormationType, slotId: SlotId): DraftSlot {
  const slot = getSlotsForFormation(formation).find((candidate) => candidate.id === slotId)
  if (slot === undefined) {
    throw new Error(`Unknown ${formation} draft slot: ${slotId}`)
  }
  return slot
}

export function getOpenSlots(draft: DraftState): readonly DraftSlot[] {
  const filledSlotIds = new Set(draft.picks.map((pick) => pick.slotId))
  return getSlotsForFormation(draft.formation).filter((slot) => !filledSlotIds.has(slot.id))
}

export function isDraftComplete(draft: DraftState): boolean {
  return draft.picks.length === getSlotsForFormation(draft.formation).length
}

export function cardFitsSlot(card: PlayerCard, slot: DraftSlot): boolean {
  return card.positions.some((position) => slot.acceptedPositions.includes(position))
}
