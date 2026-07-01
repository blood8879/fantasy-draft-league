import { curatedPoolCards } from "../data/curatedPlayerPool"
import type { PlayerCard } from "../data/schema"
import {
  type Competition,
  type Fixture,
  createCompetition,
  isCompetitionFinished,
  playCurrentRound,
} from "../domain/competition"
import {
  type FantasyDraftState,
  applyPick,
  createFantasyDraft,
  drawCandidates,
  fastForwardAiPicks,
  getCurrentClubId,
  isFantasyDraftComplete,
  placeCardInBestSlot,
  rollbackAfterLastPick,
  selectAiPick,
  validateCandidatePick,
} from "../domain/fantasyDraft"
import {
  type Club,
  type GameMode,
  USER_CLUB_ID,
  aiPersonas,
  createAiClub,
  createUserClub,
} from "../domain/game"
import { createRng, pickIndex } from "../domain/rng"
import type { FormationType, TacticType } from "../domain/types"

export const draftPool: readonly PlayerCard[] = curatedPoolCards

export const cardsById: ReadonlyMap<string, PlayerCard> = new Map(
  draftPool.map((card) => [card.id, card]),
)

export type GamePhase = "home" | "draft" | "season" | "report" | "champion"

/** 재경기(보상형 광고) 지원: 직전 라운드를 플레이하기 "전"의 대회 상태 스냅샷 */
export type ReplayCheckpoint = {
  readonly competition: Competition
  readonly nonce: number
}

export type GameState = {
  readonly phase: GamePhase
  readonly mode: GameMode
  readonly seasonSeed: string
  readonly clubs: readonly Club[]
  readonly draft: FantasyDraftState | undefined
  readonly competition: Competition | undefined
  readonly lastPlayedFixtures: readonly Fixture[]
  readonly pickError: string | undefined
  readonly replayCheckpoint: ReplayCheckpoint | undefined
  /** 현재 지명 차례의 후보 리롤 횟수(광고 보상). 픽이 끝나면 0으로 초기화 */
  readonly rerollNonce: number
  /** 데일리 도전 모드 여부. true면 보상광고 재경기가 비활성되고 종료 시 PB가 기록된다. */
  readonly isDaily: boolean
}

export type GameAction =
  | {
      readonly type: "START_GAME"
      readonly mode: GameMode
      readonly clubName: string
      readonly formation: FormationType
      readonly tactic: TacticType
      readonly seed: string
      readonly isDaily?: boolean
    }
  | { readonly type: "AI_PICK_STEP" }
  | { readonly type: "USER_PICK"; readonly cardId: string; readonly position?: string }
  | { readonly type: "REROLL_CANDIDATES" }
  | { readonly type: "UNDO_LAST_USER_PICK" }
  | { readonly type: "FAST_FORWARD_PICKS" }
  | { readonly type: "START_SEASON" }
  | { readonly type: "SET_TACTIC"; readonly tactic: TacticType }
  | { readonly type: "PLAY_ROUND" }
  | { readonly type: "SIMULATE_ROUNDS"; readonly count: number }
  | { readonly type: "REPLAY_ROUND" }
  | { readonly type: "CLOSE_REPORT" }
  | { readonly type: "RESUME_GAME"; readonly saved: GameState }
  | { readonly type: "NEW_GAME" }

export const initialGameState: GameState = {
  phase: "home",
  mode: "리그",
  seasonSeed: "",
  clubs: [],
  draft: undefined,
  competition: undefined,
  lastPlayedFixtures: [],
  pickError: undefined,
  replayCheckpoint: undefined,
  rerollNonce: 0,
  isDaily: false,
}

function runRound(state: GameState, competition: Competition, seed: string) {
  if (state.draft === undefined) {
    throw new Error("runRound requires a completed draft")
  }
  return playCurrentRound({
    competition,
    clubsById: new Map(state.clubs.map((club) => [club.id, club])),
    squads: state.draft.squads,
    cards: draftPool,
    seed,
  })
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const rng = createRng(`${action.seed}:setup`)
      // 리그는 20팀(더블 라운드로빈 38라운드), 컵은 16팀(16강 토너먼트)
      const aiCount = (action.mode === "리그" ? 20 : 16) - 1
      const clubs: readonly Club[] = [
        createUserClub(action.clubName, action.formation, action.tactic),
        ...aiPersonas
          .slice(0, aiCount)
          .map((persona) =>
            createAiClub(
              persona,
              persona.preferredFormations[pickIndex(rng, persona.preferredFormations.length)] ??
                "4-3-3",
            ),
          ),
      ]
      return {
        ...initialGameState,
        phase: "draft",
        mode: action.mode,
        seasonSeed: action.seed,
        isDaily: action.isDaily ?? false,
        clubs,
        draft: createFantasyDraft(clubs, draftPool, action.seed),
      }
    }
    case "AI_PICK_STEP": {
      if (state.draft === undefined) {
        return state
      }
      const clubId = getCurrentClubId(state.draft)
      if (clubId === undefined || clubId === USER_CLUB_ID) {
        return state
      }
      const pick = selectAiPick(state.draft, clubId, cardsById)
      return {
        ...state,
        draft: applyPick(state.draft, clubId, pick.slotId, pick.cardId),
      }
    }
    case "USER_PICK": {
      if (state.draft === undefined) {
        return state
      }
      const candidates = drawCandidates(state.draft, USER_CLUB_ID, state.rerollNonce, cardsById)
      const error = validateCandidatePick(state.draft, USER_CLUB_ID, action.cardId, candidates)
      if (error !== undefined) {
        return { ...state, pickError: error }
      }
      const squad = state.draft.squads[USER_CLUB_ID]
      const card = cardsById.get(action.cardId)
      const slot =
        squad === undefined || card === undefined
          ? undefined
          : placeCardInBestSlot(squad, card, action.position)
      if (slot === undefined) {
        return { ...state, pickError: "이 카드를 배치할 빈 자리가 없습니다" }
      }
      return {
        ...state,
        pickError: undefined,
        rerollNonce: 0,
        draft: applyPick(state.draft, USER_CLUB_ID, slot.id, action.cardId),
      }
    }
    case "REROLL_CANDIDATES": {
      if (state.draft === undefined) {
        return state
      }
      return { ...state, rerollNonce: state.rerollNonce + 1 }
    }
    case "UNDO_LAST_USER_PICK": {
      if (state.draft === undefined) {
        return state
      }
      return {
        ...state,
        pickError: undefined,
        rerollNonce: 0,
        draft: rollbackAfterLastPick(state.draft, USER_CLUB_ID, draftPool),
      }
    }
    case "FAST_FORWARD_PICKS": {
      if (state.draft === undefined) {
        return state
      }
      return {
        ...state,
        draft: fastForwardAiPicks(state.draft, cardsById, (clubId) => clubId === USER_CLUB_ID),
      }
    }
    case "START_SEASON": {
      if (state.draft === undefined || !isFantasyDraftComplete(state.draft)) {
        return state
      }
      return {
        ...state,
        phase: "season",
        competition: createCompetition(
          state.mode,
          state.clubs.map((club) => club.id),
          state.seasonSeed,
        ),
      }
    }
    case "SET_TACTIC": {
      return {
        ...state,
        clubs: state.clubs.map((club) => (club.isUser ? { ...club, tactic: action.tactic } : club)),
      }
    }
    case "PLAY_ROUND": {
      if (
        state.competition === undefined ||
        state.draft === undefined ||
        isCompetitionFinished(state.competition)
      ) {
        return state
      }
      const checkpoint = state.competition
      const outcome = runRound(state, checkpoint, state.seasonSeed)
      return {
        ...state,
        phase: "report",
        competition: outcome.competition,
        lastPlayedFixtures: outcome.playedFixtures,
        replayCheckpoint: { competition: checkpoint, nonce: 0 },
      }
    }
    case "SIMULATE_ROUNDS": {
      if (
        state.competition === undefined ||
        state.draft === undefined ||
        isCompetitionFinished(state.competition)
      ) {
        return state
      }
      // 결과 화면을 거치지 않고 여러 라운드를 연속으로 시뮬레이션한다.
      let competition = state.competition
      let lastPlayed = state.lastPlayedFixtures
      for (let played = 0; played < action.count; played += 1) {
        if (isCompetitionFinished(competition)) {
          break
        }
        const outcome = runRound(state, competition, state.seasonSeed)
        competition = outcome.competition
        lastPlayed = outcome.playedFixtures
      }
      return {
        ...state,
        phase: isCompetitionFinished(competition) ? "champion" : "season",
        competition,
        lastPlayedFixtures: lastPlayed,
        replayCheckpoint: undefined,
      }
    }
    case "REPLAY_ROUND": {
      // 데일리 점수 모드에선 보상광고 재경기를 비활성(무결성 보호).
      if (state.replayCheckpoint === undefined || state.draft === undefined || state.isDaily) {
        return state
      }
      const nonce = state.replayCheckpoint.nonce + 1
      const outcome = runRound(
        state,
        state.replayCheckpoint.competition,
        `${state.seasonSeed}:replay${nonce}`,
      )
      return {
        ...state,
        phase: "report",
        competition: outcome.competition,
        lastPlayedFixtures: outcome.playedFixtures,
        replayCheckpoint: { ...state.replayCheckpoint, nonce },
      }
    }
    case "CLOSE_REPORT": {
      if (state.competition === undefined) {
        return state
      }
      return {
        ...state,
        phase: isCompetitionFinished(state.competition) ? "champion" : "season",
        replayCheckpoint: undefined,
      }
    }
    case "RESUME_GAME": {
      return action.saved
    }
    case "NEW_GAME": {
      return initialGameState
    }
    default: {
      return state
    }
  }
}

const SAVE_KEY = "legend-draft-league-save-v1"

export function loadSavedGame(): GameState | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY)
    if (raw === null || raw === undefined) {
      return undefined
    }
    const parsed = JSON.parse(raw) as GameState
    if (parsed.phase === "home" || parsed.clubs.length === 0) {
      return undefined
    }
    return parsed
  } catch {
    return undefined
  }
}

export function saveGame(state: GameState): void {
  try {
    if (state.phase === "home") {
      globalThis.localStorage?.removeItem(SAVE_KEY)
      return
    }
    globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // 저장 불가 환경(프라이빗 모드 등)에서는 진행만 유지한다
  }
}
