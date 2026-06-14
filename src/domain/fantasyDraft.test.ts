import { describe, expect, it } from "vitest"
import { cardsById, draftPool } from "../app/gameStore"
import { cardFitsSlot, getSlotForFormation, isDraftComplete } from "./draft"
import {
  applyPick,
  createFantasyDraft,
  drawCandidates,
  fastForwardAiPicks,
  getCurrentClubId,
  getTotalPicks,
  hasPickFrom,
  isFantasyDraftComplete,
  placeCardInBestSlot,
  rollbackAfterLastPick,
  selectAiPick,
  validateCandidatePick,
} from "./fantasyDraft"
import { type Club, USER_CLUB_ID, aiPersonas, createAiClub, createUserClub } from "./game"

function createClubs(): readonly Club[] {
  return [
    createUserClub("테스트 FC", "4-3-3", "점유율"),
    ...aiPersonas.map((persona) =>
      createAiClub(persona, persona.preferredFormations[0] ?? "4-3-3"),
    ),
  ]
}

function completeDraftWithoutUser(clubs: readonly Club[], seed: string) {
  const state = createFantasyDraft(clubs, draftPool, seed)
  return fastForwardAiPicks(state, cardsById, () => false)
}

describe("fantasy draft", () => {
  it("includes every club exactly once in the first-round order", () => {
    const clubs = createClubs()
    const state = createFantasyDraft(clubs, draftPool, "seed-a")

    expect([...state.order].sort()).toEqual(clubs.map((club) => club.id).sort())
    expect(state.availableCardIds).toHaveLength(draftPool.length)
  })

  it("follows snake order between rounds", () => {
    const clubs = createClubs()
    let state = createFantasyDraft(clubs, draftPool, "seed-b")
    const firstRound: string[] = []
    const secondRound: string[] = []

    for (let pick = 0; pick < clubs.length * 2; pick += 1) {
      const clubId = getCurrentClubId(state)
      if (clubId === undefined) {
        throw new Error("draft ended early")
      }
      if (pick < clubs.length) {
        firstRound.push(clubId)
      } else {
        secondRound.push(clubId)
      }
      const aiPick = selectAiPick(state, clubId, cardsById)
      state = applyPick(state, clubId, aiPick.slotId, aiPick.cardId)
    }

    expect(firstRound).toEqual([...state.order])
    expect(secondRound).toEqual([...state.order].reverse())
  })

  it("completes a full draft with valid, non-overlapping squads", () => {
    const clubs = createClubs()
    const state = completeDraftWithoutUser(clubs, "seed-c")

    expect(isFantasyDraftComplete(state)).toBe(true)
    expect(state.log).toHaveLength(getTotalPicks(state))

    const allPicked = state.log.map((entry) => entry.cardId)
    expect(new Set(allPicked).size).toBe(allPicked.length)

    for (const club of clubs) {
      const squad = state.squads[club.id]
      if (squad === undefined) {
        throw new Error(`missing squad for ${club.id}`)
      }
      expect(isDraftComplete(squad)).toBe(true)
      for (const pick of squad.picks) {
        const card = cardsById.get(pick.cardId)
        const slot = getSlotForFormation(squad.formation, pick.slotId)
        expect(card).toBeDefined()
        if (card !== undefined) {
          expect(cardFitsSlot(card, slot)).toBe(true)
        }
      }
    }
  })

  it("is deterministic for the same seed", () => {
    const clubs = createClubs()
    const first = completeDraftWithoutUser(clubs, "seed-d")
    const second = completeDraftWithoutUser(clubs, "seed-d")

    expect(first.log).toEqual(second.log)
  })

  it("only accepts a card from the presented candidate set", () => {
    const clubs = createClubs()
    let state = createFantasyDraft(clubs, draftPool, "seed-e")
    state = fastForwardAiPicks(state, cardsById, (clubId) => clubId === USER_CLUB_ID)

    expect(getCurrentClubId(state)).toBe(USER_CLUB_ID)

    const candidates = drawCandidates(state, USER_CLUB_ID, 0, cardsById)
    expect(candidates.length).toBeGreaterThan(0)
    const offered = candidates[0] as string

    // 후보 안 카드는 허용
    expect(validateCandidatePick(state, USER_CLUB_ID, offered, candidates)).toBeUndefined()

    // 후보 밖 카드는 거부
    const outside = draftPool.find((card) => !candidates.includes(card.id))?.id as string
    expect(validateCandidatePick(state, USER_CLUB_ID, outside, candidates)).toContain("후보 카드")

    // 다른 구단 차례면 거부
    expect(validateCandidatePick(state, "catenaccio", offered, candidates)).toContain(
      "차례가 아닙니다",
    )
  })

  it("presents a mix of positions, all placeable in some open slot", () => {
    const clubs = createClubs()
    let state = createFantasyDraft(clubs, draftPool, "seed-h")
    state = fastForwardAiPicks(state, cardsById, (clubId) => clubId === USER_CLUB_ID)
    const candidates = drawCandidates(state, USER_CLUB_ID, 0, cardsById)
    const squad = state.squads[USER_CLUB_ID]
    if (squad === undefined) {
      throw new Error("user squad missing")
    }

    expect(candidates.length).toBeGreaterThan(0)
    // 모든 후보는 어딘가 빈 슬롯에 배치 가능해야 한다(자유 포지션 지명)
    const positions = new Set<string>()
    for (const id of candidates) {
      const card = cardsById.get(id)
      expect(card).toBeDefined()
      if (card !== undefined) {
        expect(placeCardInBestSlot(squad, card)).toBeDefined()
        for (const position of card.positions) {
          positions.add(position)
        }
      }
    }
    // 빈 자리가 11개인 첫 픽에서는 여러 포지션이 섞여 제시된다
    expect(positions.size).toBeGreaterThan(1)
  })

  it("rolls back the last pick of a club and everything after it", () => {
    const clubs = createClubs()
    let state = createFantasyDraft(clubs, draftPool, "seed-f")
    // 1라운드 전체 + 2라운드 일부 진행
    for (let pick = 0; pick < clubs.length + 3; pick += 1) {
      const clubId = getCurrentClubId(state)
      if (clubId === undefined) {
        break
      }
      const aiPick = selectAiPick(state, clubId, cardsById)
      state = applyPick(state, clubId, aiPick.slotId, aiPick.cardId)
    }

    const target = clubs[2]?.id as string
    expect(hasPickFrom(state, target)).toBe(true)
    const logLengthBefore = state.log.length
    const availableBefore = new Set(state.availableCardIds)

    const rolledBack = rollbackAfterLastPick(state, target, draftPool)

    // target의 마지막 픽 인덱스 이후가 모두 사라졌으므로 로그가 짧아진다
    expect(rolledBack.log.length).toBeLessThan(logLengthBefore)
    // 되돌린 시점부터 다시 target 차례
    expect(getCurrentClubId(rolledBack)).toBe(target)
    // 로그/스쿼드/가용카드가 일관됨: 픽 수 = 스쿼드 픽 총합
    const squadPicks = Object.values(rolledBack.squads).reduce(
      (sum, squad) => sum + squad.picks.length,
      0,
    )
    expect(squadPicks).toBe(rolledBack.log.length)
    expect(rolledBack.availableCardIds.length).toBe(draftPool.length - rolledBack.log.length)
    // 롤백으로 풀려난 카드가 다시 가용해졌다
    expect(rolledBack.availableCardIds.length).toBeGreaterThan(availableBefore.size)
  })

  it("returns the same state when there is no pick to roll back", () => {
    const clubs = createClubs()
    const state = createFantasyDraft(clubs, draftPool, "seed-g")
    expect(rollbackAfterLastPick(state, USER_CLUB_ID, draftPool)).toBe(state)
  })
})
