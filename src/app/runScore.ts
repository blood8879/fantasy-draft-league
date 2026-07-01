import { type Achievement, computeUserAchievements } from "../domain/achievements"
import { type Competition, computeStandings, getChampionId } from "../domain/competition"
import type { FantasyDraftState } from "../domain/fantasyDraft"
import type { GameMode } from "../domain/game"
import { getFixtureWinnerId } from "../simulation/fixture"
import { DATASET_VERSION, SIM_VERSION } from "./version"

/**
 * 데일리 종합 점수(단일 정수). 동일 {seed, simVersion, datasetVersion} 내에서만 비교한다.
 * 리그(순위표)와 컵(진출 stage→순위 밴딩)을 같은 공식으로 단일 정수화한다.
 *
 *  total = round(RANK + POINTS + GD + ACH)
 *   RANK   = (N - rank + 1)/N * 1000      (1위 만점, 필드 크기 정규화)
 *   POINTS = points / max(1, 3*played) * 600
 *   GD     = (clamp(gd,-CAP,CAP)+CAP)/(2*CAP) * 200
 *   ACH    = min(400, gold*120 + silver*60 + bronze*25)
 * 슛아웃 KO(0-GD)는 GD가 0이라 stage 밴딩(RANK)이 지배한다.
 */

const GD_CAP = 30
const ACH_BONUS: Readonly<Record<Achievement["tier"], number>> = {
  gold: 120,
  silver: 60,
  bronze: 25,
}

export type RunScoreBreakdown = {
  readonly rank: number
  readonly points: number
  readonly gd: number
  readonly achBonus: number
}

export type RunScore = {
  readonly total: number
  readonly teamCount: number
  readonly breakdown: RunScoreBreakdown
}

type UserStanding = {
  readonly rank: number
  readonly points: number
  readonly gd: number
  readonly played: number
}

function leagueStanding(
  competition: Competition,
  clubIds: readonly string[],
  userId: string,
): UserStanding {
  const standings = computeStandings(clubIds, competition.fixtures)
  const index = standings.findIndex((row) => row.clubId === userId)
  const row = standings[index]
  if (row === undefined) {
    return { rank: clubIds.length, points: 0, gd: 0, played: 0 }
  }
  return {
    rank: index + 1,
    points: row.points,
    gd: row.goalsFor - row.goalsAgainst,
    played: row.played,
  }
}

function cupStanding(
  competition: Competition,
  clubIds: readonly string[],
  userId: string,
): UserStanding {
  const userFixtures = competition.fixtures.filter(
    (fixture) =>
      (fixture.homeId === userId || fixture.awayId === userId) && fixture.result !== undefined,
  )
  let wins = 0
  let gd = 0
  let reachedRound = 0
  for (const fixture of userFixtures) {
    const result = fixture.result
    if (result === undefined) {
      continue
    }
    reachedRound = Math.max(reachedRound, fixture.round)
    const isHome = fixture.homeId === userId
    const goalsFor = isHome ? result.homeGoals : result.awayGoals
    const goalsAgainst = isHome ? result.awayGoals : result.homeGoals
    gd += goalsFor - goalsAgainst
    if (getFixtureWinnerId(result, fixture.homeId, fixture.awayId) === userId) {
      wins += 1
    }
  }
  const isChampion = getChampionId(competition, clubIds) === userId
  // 진출 stage→순위 밴딩: 챔피언=1, 탈락 라운드 r → 2^(totalRounds-r)+1 (결승패=2, 4강=3...).
  const rank = isChampion
    ? 1
    : reachedRound === 0
      ? clubIds.length
      : 2 ** (competition.totalRounds - reachedRound) + 1
  return { rank, points: wins * 3, gd, played: userFixtures.length }
}

function tallyAchievements(achievements: readonly Achievement[]): number {
  const bonus = achievements.reduce((sum, achievement) => sum + ACH_BONUS[achievement.tier], 0)
  return Math.min(400, bonus)
}

export function computeRunScore(
  competition: Competition,
  clubIds: readonly string[],
  userId: string,
): RunScore {
  const standing =
    competition.kind === "리그"
      ? leagueStanding(competition, clubIds, userId)
      : cupStanding(competition, clubIds, userId)
  const teamCount = clubIds.length
  const achBonus = tallyAchievements(computeUserAchievements(competition, clubIds, userId))

  const rankPart = ((teamCount - standing.rank + 1) / teamCount) * 1000
  const pointsPart = (standing.points / Math.max(1, 3 * standing.played)) * 600
  const clampedGd = Math.max(-GD_CAP, Math.min(GD_CAP, standing.gd))
  const gdPart = ((clampedGd + GD_CAP) / (2 * GD_CAP)) * 200
  const total = Math.round(rankPart + pointsPart + gdPart + achBonus)

  return {
    total,
    teamCount,
    breakdown: {
      rank: standing.rank,
      points: standing.points,
      gd: standing.gd,
      achBonus,
    },
  }
}

export type PickLogEntry = {
  readonly pickIndex: number
  readonly slotId: string
  readonly cardId: string
}

export type PickLog = {
  readonly seed: string
  readonly simVersion: number
  readonly datasetVersion: number
  readonly format: GameMode
  readonly picks: readonly PickLogEntry[]
}

/** 결정론 재시뮬 검증(미래 서버 리더보드)을 위한 유저 픽 로그. */
export function buildPickLog(
  draft: FantasyDraftState,
  seed: string,
  format: GameMode,
  userId: string,
): PickLog {
  const squad = draft.squads[userId]
  const slotByCard = new Map((squad?.picks ?? []).map((pick) => [pick.cardId, pick.slotId]))
  const picks = draft.log
    .filter((entry) => entry.clubId === userId)
    .map((entry) => ({
      pickIndex: entry.overall,
      slotId: slotByCard.get(entry.cardId) ?? "",
      cardId: entry.cardId,
    }))
  return { seed, simVersion: SIM_VERSION, datasetVersion: DATASET_VERSION, format, picks }
}
