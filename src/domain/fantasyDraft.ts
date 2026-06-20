import type { PlayerCard, RatingAxis } from "../data/schema"
import { ratingAxes } from "../data/schema"
import {
  type DraftSlot,
  type DraftState,
  type SlotId,
  cardFitsSlot,
  createEmptyDraft,
  getOpenSlots,
  isDraftComplete,
  setDraftPick,
} from "./draft"
import type { Club, ManagerPersona } from "./game"
import { aiPersonas } from "./game"
import { createRng, shuffle, weightedPick } from "./rng"

/** 한 번의 지명 차례에 제시되는 후보 카드 수 */
export const CANDIDATE_COUNT = 10

/** 후보 추첨 가중치: 희귀한 카드일수록 덜 등장해 "운"의 묘미를 만든다 */
const rarityDrawWeight: Readonly<Record<string, number>> = {
  Legend: 2,
  Epic: 4,
  Rare: 8,
  Common: 14,
}

export type DraftLogEntry = {
  readonly overall: number
  readonly round: number
  readonly clubId: string
  readonly slotId: SlotId
  readonly cardId: string
}

export type FantasyDraftState = {
  readonly seed: string
  readonly order: readonly string[]
  readonly squads: Readonly<Record<string, DraftState>>
  readonly log: readonly DraftLogEntry[]
  readonly availableCardIds: readonly string[]
}

export const SQUAD_SIZE = 11

export function createFantasyDraft(
  clubs: readonly Club[],
  cards: readonly PlayerCard[],
  seed: string,
): FantasyDraftState {
  const order = shuffle(
    clubs.map((club) => club.id),
    createRng(`${seed}:draft-order`),
  )
  const squads = Object.fromEntries(
    clubs.map((club) => [club.id, createEmptyDraft(club.formation)]),
  )
  return {
    seed,
    order,
    squads,
    log: [],
    availableCardIds: cards.map((card) => card.id),
  }
}

export function getTotalPicks(state: FantasyDraftState): number {
  return state.order.length * SQUAD_SIZE
}

export function isFantasyDraftComplete(state: FantasyDraftState): boolean {
  return state.log.length >= getTotalPicks(state)
}

export function getCurrentRound(state: FantasyDraftState): number {
  return Math.floor(state.log.length / state.order.length) + 1
}

export function getCurrentClubId(state: FantasyDraftState): string | undefined {
  if (isFantasyDraftComplete(state)) {
    return undefined
  }
  const round = Math.floor(state.log.length / state.order.length)
  const indexInRound = state.log.length % state.order.length
  const isReversed = round % 2 === 1
  return isReversed ? state.order[state.order.length - 1 - indexInRound] : state.order[indexInRound]
}

export function getUpcomingClubIds(state: FantasyDraftState, count: number): readonly string[] {
  const upcoming: string[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const pickNumber = state.log.length + offset
    if (pickNumber >= getTotalPicks(state)) {
      break
    }
    const round = Math.floor(pickNumber / state.order.length)
    const indexInRound = pickNumber % state.order.length
    const clubId =
      round % 2 === 1
        ? state.order[state.order.length - 1 - indexInRound]
        : state.order[indexInRound]
    if (clubId !== undefined) {
      upcoming.push(clubId)
    }
  }
  return upcoming
}

/** 카드를 배치할 수 있는 빈 슬롯(포메이션 순서상 첫 자리). 없으면 undefined */
export function placeCardInBestSlot(squad: DraftState, card: PlayerCard): DraftSlot | undefined {
  return getOpenSlots(squad).find((slot) => cardFitsSlot(card, slot))
}

/**
 * 이번 차례 구단에게 제시할 후보 카드 N장을 결정적으로 추첨한다.
 *
 * 비어 있는 슬롯들이 받을 수 있는 포지션을 골고루 커버하도록 포지션을 라운드로빈하며
 * rarity 가중(희귀할수록 드물게)으로 비복원 추출한다. 그래서 후보에는 여러 포지션이
 * 섞여 나오고, 유저는 원하는 포지션을 골라 지명할 수 있다. nonce를 올리면(리롤)
 * 같은 상황에서 다른 후보가 나온다.
 */
export function drawCandidates(
  state: FantasyDraftState,
  clubId: string,
  nonce: number,
  cardsById: ReadonlyMap<string, PlayerCard>,
  count: number = CANDIDATE_COUNT,
): readonly string[] {
  const squad = state.squads[clubId]
  if (squad === undefined) {
    return []
  }
  const openSlots = getOpenSlots(squad)
  if (openSlots.length === 0) {
    return []
  }
  const openPositions = unique(openSlots.flatMap((slot) => slot.acceptedPositions))
  const cardsByPosition = new Map<string, string[]>()
  for (const id of state.availableCardIds) {
    const card = cardsById.get(id)
    if (card === undefined) {
      continue
    }
    for (const position of card.positions) {
      if (openPositions.includes(position)) {
        const bucket = cardsByPosition.get(position) ?? []
        bucket.push(id)
        cardsByPosition.set(position, bucket)
      }
    }
  }

  const rng = createRng(`${state.seed}:cand:${state.log.length}:${clubId}:${nonce}`)
  const rotation = shuffle(openPositions, rng)
  const result: string[] = []
  const used = new Set<string>()
  let progressed = true
  while (result.length < count && progressed) {
    progressed = false
    for (const position of rotation) {
      if (result.length >= count) {
        break
      }
      const pool = (cardsByPosition.get(position) ?? []).filter((id) => !used.has(id))
      if (pool.length === 0) {
        continue
      }
      const picked = weightedPick(
        pool,
        (id) => rarityDrawWeight[cardsById.get(id)?.rarity ?? "Common"] ?? 8,
        rng,
      )
      if (picked !== undefined) {
        result.push(picked)
        used.add(picked)
        progressed = true
      }
    }
  }
  return result
}

export function validateCandidatePick(
  state: FantasyDraftState,
  clubId: string,
  cardId: string,
  candidates: readonly string[],
): string | undefined {
  if (getCurrentClubId(state) !== clubId) {
    return "지금은 이 구단의 차례가 아닙니다"
  }
  if (!candidates.includes(cardId)) {
    return "제시된 후보 카드 중에서만 선택할 수 있습니다"
  }
  return undefined
}

function unique<T>(items: readonly T[]): readonly T[] {
  return Array.from(new Set(items))
}

export function applyPick(
  state: FantasyDraftState,
  clubId: string,
  slotId: SlotId,
  cardId: string,
): FantasyDraftState {
  const squad = state.squads[clubId]
  if (squad === undefined) {
    throw new Error(`Unknown draft club: ${clubId}`)
  }
  // 같은 선수의 다른 시즌 카드까지 모두 풀에서 제외한다(한 선수는 한 번만 뽑힐 수 있음).
  const pickedPlayer = playerIdOfCard(cardId)
  return {
    ...state,
    squads: { ...state.squads, [clubId]: setDraftPick(squad, slotId, cardId) },
    log: [
      ...state.log,
      {
        overall: state.log.length + 1,
        round: getCurrentRound(state),
        clubId,
        slotId,
        cardId,
      },
    ],
    availableCardIds: state.availableCardIds.filter(
      (id) => id !== cardId && playerIdOfCard(id) !== pickedPlayer,
    ),
  }
}

/** 카드 id(`{playerId}_{연도|careerN}`)에서 선수 식별자(playerId)를 떼어낸다. */
function playerIdOfCard(cardId: string): string {
  return cardId.replace(/_(\d{4}|career\d+)$/, "")
}

export function hasPickFrom(state: FantasyDraftState, clubId: string): boolean {
  return state.log.some((entry) => entry.clubId === clubId)
}

/**
 * 보상형 광고 보상: 해당 구단의 마지막 지명과 그 이후의 모든 지명을 되돌린다.
 *
 * 스네이크 순서를 깨지 않기 위해, 마지막 유저 픽 시점 이후에 다른 구단이 한 지명까지
 * 함께 롤백한 뒤 로그를 재적용해 일관된 상태를 만든다. 결과적으로 차례가 다시 그
 * 구단으로 돌아온다. 되돌릴 지명이 없으면 원본 상태를 그대로 반환한다.
 */
export function rollbackAfterLastPick(
  state: FantasyDraftState,
  clubId: string,
  cards: readonly PlayerCard[],
): FantasyDraftState {
  let lastIndex = -1
  for (let index = state.log.length - 1; index >= 0; index -= 1) {
    if (state.log[index]?.clubId === clubId) {
      lastIndex = index
      break
    }
  }
  if (lastIndex === -1) {
    return state
  }

  const truncatedLog = state.log.slice(0, lastIndex)
  const emptySquads = Object.fromEntries(
    Object.entries(state.squads).map(([id, squad]) => [id, createEmptyDraft(squad.formation)]),
  )
  let rebuilt: FantasyDraftState = {
    ...state,
    squads: emptySquads,
    log: [],
    availableCardIds: cards.map((card) => card.id),
  }
  for (const entry of truncatedLog) {
    rebuilt = applyPick(rebuilt, entry.clubId, entry.slotId, entry.cardId)
  }
  return rebuilt
}

export function selectAiPick(
  state: FantasyDraftState,
  clubId: string,
  cardsById: ReadonlyMap<string, PlayerCard>,
): { readonly slotId: SlotId; readonly cardId: string } {
  const squad = state.squads[clubId]
  if (squad === undefined || isDraftComplete(squad)) {
    throw new Error(`AI pick requested for invalid club: ${clubId}`)
  }
  // AI도 유저와 동일하게 랜덤 후보를 받고, 그 안에서 자기 철학에 맞는 카드를 고른다.
  const candidates = drawCandidates(state, clubId, 0, cardsById)
  if (candidates.length === 0) {
    throw new Error(`No candidate available for club: ${clubId}`)
  }
  const persona = aiPersonas.find((candidate) => candidate.id === clubId)
  const rng = createRng(`${state.seed}:aipick:${state.log.length}:${clubId}`)

  let best: { card: PlayerCard; score: number } | undefined
  for (const cardId of candidates) {
    const card = cardsById.get(cardId)
    if (card === undefined || placeCardInBestSlot(squad, card) === undefined) {
      continue
    }
    // 자기 자리가 부족한 포지션을 약간 더 급하게 채우도록 슬롯 희소성을 가산한다.
    const score = scoreCardForPersona(card, persona) + slotScarcityBonus(squad, card) + rng() * 4
    if (best === undefined || score > best.score) {
      best = { card, score }
    }
  }
  if (best === undefined) {
    throw new Error(`No placeable candidate for club: ${clubId}`)
  }
  const slot = placeCardInBestSlot(squad, best.card)
  if (slot === undefined) {
    throw new Error(`No slot for chosen card in club: ${clubId}`)
  }
  return { slotId: slot.id, cardId: best.card.id }
}

/** 남은 빈 슬롯 중 이 카드만 채울 수 있는 자리가 적을수록 가산점(끝까지 못 채우는 사태 방지) */
function slotScarcityBonus(squad: DraftState, card: PlayerCard): number {
  const openSlots = getOpenSlots(squad)
  const fillableByCard = openSlots.filter((slot) => cardFitsSlot(card, slot)).length
  const total = openSlots.length
  if (total <= 1 || fillableByCard === 0) {
    return 0
  }
  // 이 카드가 들어갈 자리가 희소할수록(예: 마지막 GK 한 자리) 우선순위를 높인다.
  return (1 - fillableByCard / total) * 6
}

export function fastForwardAiPicks(
  state: FantasyDraftState,
  cardsById: ReadonlyMap<string, PlayerCard>,
  isUserClub: (clubId: string) => boolean,
): FantasyDraftState {
  let current = state
  let clubId = getCurrentClubId(current)
  while (clubId !== undefined && !isUserClub(clubId)) {
    const pick = selectAiPick(current, clubId, cardsById)
    current = applyPick(current, clubId, pick.slotId, pick.cardId)
    clubId = getCurrentClubId(current)
  }
  return current
}

function scoreCardForPersona(card: PlayerCard, persona: ManagerPersona | undefined): number {
  const weights: Readonly<Partial<Record<RatingAxis, number>>> = persona?.axisWeights ?? {}
  let weightedTotal = 0
  let weightSum = 0
  for (const axis of ratingAxes) {
    const weight = weights[axis] ?? 1
    weightedTotal += card.internalScores[axis] * weight
    weightSum += weight
  }
  const ability = weightedTotal / weightSum
  const starHunger = persona?.starHunger ?? 0.6
  return ability + card.cost * starHunger * 0.35
}
