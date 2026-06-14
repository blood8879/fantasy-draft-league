import { describe, expect, it } from "vitest"
import {
  drawCandidates,
  getCurrentClubId,
  hasPickFrom,
  isFantasyDraftComplete,
} from "../domain/fantasyDraft"
import { USER_CLUB_ID } from "../domain/game"
import { type GameState, cardsById, gameReducer, initialGameState } from "./gameStore"

function ensure<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) {
    throw new Error(message)
  }
  return value
}

function startGame(mode: "리그" | "컵"): GameState {
  return gameReducer(initialGameState, {
    type: "START_GAME",
    mode,
    clubName: "테스트 FC",
    formation: "4-3-3",
    tactic: "점유율",
    seed: "store-seed",
  })
}

function completeDraft(state: GameState): GameState {
  let current = state
  let guard = 0
  while (current.draft !== undefined && !isFantasyDraftComplete(current.draft) && guard < 400) {
    guard += 1
    const clubId = getCurrentClubId(current.draft)
    if (clubId === undefined) {
      break
    }
    if (clubId === USER_CLUB_ID) {
      const candidates = drawCandidates(current.draft, USER_CLUB_ID, current.rerollNonce, cardsById)
      const cardId = candidates[0]
      if (cardId === undefined) {
        break
      }
      current = gameReducer(current, { type: "USER_PICK", cardId })
    } else {
      current = gameReducer(current, { type: "AI_PICK_STEP" })
    }
  }
  return current
}

describe("게임 상태 + 보상형 광고 액션", () => {
  it("리그는 20팀, 컵은 16팀으로 드래프트를 시작한다", () => {
    const league = startGame("리그")
    expect(league.phase).toBe("draft")
    expect(league.clubs).toHaveLength(20)
    expect(league.clubs.filter((club) => club.isUser)).toHaveLength(1)
    expect(league.draft).toBeDefined()

    const cup = startGame("컵")
    expect(cup.clubs).toHaveLength(16)
  })

  describe("랜덤 후보 지명", () => {
    it("제시된 후보 밖 카드는 거부하고, 후보 안 카드는 지명된다", () => {
      let state = startGame("리그")
      state = gameReducer(state, { type: "FAST_FORWARD_PICKS" })
      const draft = ensure(state.draft, "draft missing")
      expect(getCurrentClubId(draft)).toBe(USER_CLUB_ID)

      const candidates = drawCandidates(draft, USER_CLUB_ID, state.rerollNonce, cardsById)
      expect(candidates.length).toBeGreaterThan(0)

      // 후보에 없는 카드(다른 포지션 등)는 거부된다
      const notCandidate = ensure(
        draft.availableCardIds.find((id) => !candidates.includes(id)),
        "no non-candidate card",
      )
      const rejected = gameReducer(state, { type: "USER_PICK", cardId: notCandidate })
      expect(rejected.pickError).toContain("후보 카드")
      expect(hasPickFrom(ensure(rejected.draft, "draft missing"), USER_CLUB_ID)).toBe(false)

      // 후보 안 카드는 지명된다
      const accepted = gameReducer(state, {
        type: "USER_PICK",
        cardId: ensure(candidates[0], "no candidate"),
      })
      expect(accepted.pickError).toBeUndefined()
      expect(hasPickFrom(ensure(accepted.draft, "draft missing"), USER_CLUB_ID)).toBe(true)
    })

    it("REROLL_CANDIDATES는 다른 후보 묶음을 제시한다", () => {
      let state = startGame("리그")
      state = gameReducer(state, { type: "FAST_FORWARD_PICKS" })
      const draft = ensure(state.draft, "draft missing")
      const before = drawCandidates(draft, USER_CLUB_ID, state.rerollNonce, cardsById)

      const rerolled = gameReducer(state, { type: "REROLL_CANDIDATES" })
      expect(rerolled.rerollNonce).toBe(1)
      const after = drawCandidates(
        ensure(rerolled.draft, "draft missing"),
        USER_CLUB_ID,
        rerolled.rerollNonce,
        cardsById,
      )
      // 같은 슬롯이라도 nonce가 다르면 후보 구성이 (대개) 달라진다
      expect(after.join(",")).not.toBe(before.join(","))
    })
  })

  describe("UNDO_LAST_USER_PICK (지명 되돌리기 보상)", () => {
    it("마지막 유저 지명을 되돌리고 차례를 유저에게 돌려준다", () => {
      let state = startGame("리그")
      state = gameReducer(state, { type: "FAST_FORWARD_PICKS" })
      const draftAtTurn = ensure(state.draft, "draft missing")
      const candidates = drawCandidates(draftAtTurn, USER_CLUB_ID, state.rerollNonce, cardsById)
      const cardId = ensure(candidates[0], "no candidate")

      state = gameReducer(state, { type: "USER_PICK", cardId })
      expect(hasPickFrom(ensure(state.draft, "draft missing"), USER_CLUB_ID)).toBe(true)
      state = gameReducer(state, { type: "FAST_FORWARD_PICKS" })
      expect(ensure(state.draft, "draft missing").availableCardIds).not.toContain(cardId)

      const afterUndo = gameReducer(state, { type: "UNDO_LAST_USER_PICK" })
      const undoneDraft = ensure(afterUndo.draft, "draft missing")
      expect(hasPickFrom(undoneDraft, USER_CLUB_ID)).toBe(false)
      expect(getCurrentClubId(undoneDraft)).toBe(USER_CLUB_ID)
      expect(undoneDraft.availableCardIds).toContain(cardId)
    })
  })

  describe("REPLAY_ROUND (재경기 보상)", () => {
    it("같은 라운드를 다시 치르되 라운드 진행도는 그대로 유지한다", () => {
      let state = completeDraft(startGame("리그"))
      expect(isFantasyDraftComplete(ensure(state.draft, "draft missing"))).toBe(true)

      state = gameReducer(state, { type: "START_SEASON" })
      const played = gameReducer(state, { type: "PLAY_ROUND" })
      expect(played.phase).toBe("report")
      const roundAfterPlay = ensure(played.competition, "competition missing").currentRound
      expect(ensure(played.replayCheckpoint, "checkpoint missing").nonce).toBe(0)

      const replayed = gameReducer(played, { type: "REPLAY_ROUND" })
      expect(replayed.phase).toBe("report")
      expect(ensure(replayed.competition, "competition missing").currentRound).toBe(roundAfterPlay)
      expect(replayed.lastPlayedFixtures).toHaveLength(played.lastPlayedFixtures.length)
      expect(ensure(replayed.replayCheckpoint, "checkpoint missing").nonce).toBe(1)

      const replayedTwice = gameReducer(replayed, { type: "REPLAY_ROUND" })
      expect(ensure(replayedTwice.competition, "competition missing").currentRound).toBe(
        roundAfterPlay,
      )
      expect(ensure(replayedTwice.replayCheckpoint, "checkpoint missing").nonce).toBe(2)
    })

    it("CLOSE_REPORT는 재경기 체크포인트를 비운다", () => {
      let state = gameReducer(completeDraft(startGame("리그")), { type: "START_SEASON" })
      state = gameReducer(state, { type: "PLAY_ROUND" })
      const closed = gameReducer(state, { type: "CLOSE_REPORT" })
      expect(closed.replayCheckpoint).toBeUndefined()
    })
  })

  describe("SIMULATE_ROUNDS (여러 라운드 일괄 진행)", () => {
    it("여러 라운드를 한 번에 치르고 시즌을 끝낼 수 있다", () => {
      let state = gameReducer(completeDraft(startGame("리그")), { type: "START_SEASON" })
      const total = ensure(state.competition, "competition missing").totalRounds

      state = gameReducer(state, { type: "SIMULATE_ROUNDS", count: total })

      expect(state.phase).toBe("champion")
      const competition = ensure(state.competition, "competition missing")
      expect(competition.fixtures.every((fixture) => fixture.result !== undefined)).toBe(true)
    })

    it("일부 라운드만 진행하면 시즌 화면에 머문다", () => {
      let state = gameReducer(completeDraft(startGame("리그")), { type: "START_SEASON" })
      state = gameReducer(state, { type: "SIMULATE_ROUNDS", count: 3 })

      expect(state.phase).toBe("season")
      expect(ensure(state.competition, "competition missing").currentRound).toBe(4)
    })
  })
})
