import { describe, expect, it } from "vitest"
import { cardsById, draftPool } from "../app/gameStore"
import {
  type Competition,
  buildGoalkeepers,
  computeCleanSheets,
  computeStandings,
  computeTopAssisters,
  computeTopScorers,
  createCompetition,
  getChampionId,
  getRoundFixtures,
  isCompetitionFinished,
  playCurrentRound,
} from "./competition"
import type { DraftState } from "./draft"
import { createFantasyDraft, fastForwardAiPicks } from "./fantasyDraft"
import { type Club, aiPersonas, createAiClub, createUserClub } from "./game"

// 테스트는 8팀으로 더블 라운드로빈(14R)을 검증한다(실제 게임 리그는 20팀/38R).
const clubs: readonly Club[] = [
  createUserClub("테스트 FC", "4-3-3", "점유율"),
  ...aiPersonas
    .slice(0, 7)
    .map((persona) => createAiClub(persona, persona.preferredFormations[0] ?? "4-3-3")),
]
const clubIds = clubs.map((club) => club.id)
const clubsById = new Map(clubs.map((club) => [club.id, club]))
const squads: Readonly<Record<string, DraftState>> = fastForwardAiPicks(
  createFantasyDraft(clubs, draftPool, "comp-seed"),
  cardsById,
  () => false,
).squads

function playAllRounds(initial: Competition): Competition {
  let competition = initial
  let guard = 0
  while (!isCompetitionFinished(competition) && guard < 20) {
    competition = playCurrentRound({
      competition,
      clubsById,
      squads,
      cards: draftPool,
      seed: "comp-seed",
    }).competition
    guard += 1
  }
  return competition
}

describe("league competition", () => {
  it("creates a double round robin: 14 rounds, every pair home and away", () => {
    const competition = createCompetition("리그", clubIds, "comp-seed")

    expect(competition.totalRounds).toBe(14)
    expect(competition.fixtures).toHaveLength(56)

    for (let round = 1; round <= 14; round += 1) {
      const fixtures = getRoundFixtures(competition, round)
      expect(fixtures).toHaveLength(4)
      const involved = fixtures.flatMap((fixture) => [fixture.homeId, fixture.awayId])
      expect(new Set(involved).size).toBe(8)
    }

    // 각 페어는 정확히 두 번 만나고, 홈/원정이 한 번씩이어야 한다
    const pairKeys = competition.fixtures.map((fixture) =>
      [fixture.homeId, fixture.awayId].sort().join(":"),
    )
    expect(new Set(pairKeys).size).toBe(28)
    for (const key of new Set(pairKeys)) {
      expect(pairKeys.filter((candidate) => candidate === key)).toHaveLength(2)
    }
    const directed = competition.fixtures.map((fixture) => `${fixture.homeId}>${fixture.awayId}`)
    expect(new Set(directed).size).toBe(56)
  })

  it("plays rounds and keeps a consistent standings table", () => {
    const competition = playAllRounds(createCompetition("리그", clubIds, "comp-seed"))

    expect(isCompetitionFinished(competition)).toBe(true)
    const standings = computeStandings(clubIds, competition.fixtures)

    expect(standings).toHaveLength(8)
    for (const row of standings) {
      expect(row.played).toBe(14)
      expect(row.won + row.drawn + row.lost).toBe(14)
      expect(row.points).toBe(row.won * 3 + row.drawn)
    }
    const totalFor = standings.reduce((sum, row) => sum + row.goalsFor, 0)
    const totalAgainst = standings.reduce((sum, row) => sum + row.goalsAgainst, 0)
    expect(totalFor).toBe(totalAgainst)

    const champion = getChampionId(competition, clubIds)
    expect(champion).toBe(standings[0]?.clubId)
  })
})

describe("cup competition", () => {
  it("runs quarterfinal to final and produces a champion", () => {
    const competition = playAllRounds(createCompetition("컵", clubIds, "comp-seed"))

    expect(competition.totalRounds).toBe(3)
    expect(getRoundFixtures(competition, 1)).toHaveLength(4)
    expect(getRoundFixtures(competition, 2)).toHaveLength(2)
    expect(getRoundFixtures(competition, 3)).toHaveLength(1)
    expect(isCompetitionFinished(competition)).toBe(true)

    for (const fixture of competition.fixtures) {
      const result = fixture.result
      expect(result).toBeDefined()
      if (result !== undefined && result.homeGoals === result.awayGoals) {
        expect(result.shootout).toBeDefined()
      }
    }

    const champion = getChampionId(competition, clubIds)
    expect(champion).toBeDefined()
    expect(clubIds).toContain(champion)
  })
})

describe("개인 기록 집계", () => {
  it("득점 합계가 실제 총 득점과 일치한다", () => {
    const competition = playAllRounds(createCompetition("리그", clubIds, "comp-seed"))
    const scorers = computeTopScorers(competition.fixtures, 1000)

    const scorerGoals = scorers.reduce((sum, row) => sum + row.value, 0)
    const fixtureGoals = competition.fixtures.reduce(
      (sum, fixture) => sum + (fixture.result?.homeGoals ?? 0) + (fixture.result?.awayGoals ?? 0),
      0,
    )
    expect(scorerGoals).toBe(fixtureGoals)
    expect(fixtureGoals).toBeGreaterThan(0)
  })

  it("도움 합계가 골 수를 넘지 않고, 클린시트는 무실점 경기와 일치한다", () => {
    const competition = playAllRounds(createCompetition("리그", clubIds, "comp-seed"))
    const assists = computeTopAssisters(competition.fixtures, 1000)
    const goalkeepers = buildGoalkeepers(squads, cardsById)
    const cleanSheets = computeCleanSheets(competition.fixtures, goalkeepers, 1000)

    const totalAssists = assists.reduce((sum, row) => sum + row.value, 0)
    const totalGoals = competition.fixtures.reduce(
      (sum, fixture) => sum + (fixture.result?.homeGoals ?? 0) + (fixture.result?.awayGoals ?? 0),
      0,
    )
    expect(totalAssists).toBeGreaterThan(0)
    expect(totalAssists).toBeLessThanOrEqual(totalGoals)

    const totalCleanSheets = cleanSheets.reduce((sum, row) => sum + row.value, 0)
    const shutouts = competition.fixtures.reduce((sum, fixture) => {
      const result = fixture.result
      if (result === undefined) {
        return sum
      }
      return sum + (result.homeGoals === 0 ? 1 : 0) + (result.awayGoals === 0 ? 1 : 0)
    }, 0)
    expect(totalCleanSheets).toBe(shutouts)
  })
})
