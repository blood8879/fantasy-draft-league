import { type Competition, type Fixture, computeStandings, getChampionId } from "./competition"

export type AchievementTier = "gold" | "silver" | "bronze"

export type Achievement = {
  readonly id: string
  readonly nameKey: string
  readonly tier: AchievementTier
}

function fixtureWinner(fixture: Fixture): string | undefined {
  const result = fixture.result
  if (result === undefined) {
    return undefined
  }
  if (result.homeGoals > result.awayGoals) {
    return fixture.homeId
  }
  if (result.awayGoals > result.homeGoals) {
    return fixture.awayId
  }
  return result.shootout?.winnerClubId
}

function longestWinStreak(fixtures: readonly Fixture[], clubId: string): number {
  const played = fixtures
    .filter((fixture) => fixture.result !== undefined)
    .filter((fixture) => fixture.homeId === clubId || fixture.awayId === clubId)
    .slice()
    .sort((left, right) => left.round - right.round)
  let best = 0
  let current = 0
  for (const fixture of played) {
    if (fixtureWinner(fixture) === clubId) {
      current += 1
      best = Math.max(best, current)
    } else {
      current = 0
    }
  }
  return best
}

const TIER_ORDER: Readonly<Record<AchievementTier, number>> = { gold: 0, silver: 1, bronze: 2 }

/**
 * 시즌 종료 시 유저 구단이 달성한 업적을 산출한다. 우승·최다득점·무실점·연승 등
 * 특별한 기록에 이름을 붙여 리플레이 동기를 만든다.
 */
export function computeUserAchievements(
  competition: Competition,
  clubIds: readonly string[],
  userId: string,
): readonly Achievement[] {
  const standings = computeStandings(clubIds, competition.fixtures)
  const rank = standings.findIndex((row) => row.clubId === userId) + 1
  const row = standings.find((entry) => entry.clubId === userId)
  const streak = longestWinStreak(competition.fixtures, userId)
  const out: Achievement[] = []

  if (competition.kind === "리그") {
    if (rank === 1) {
      out.push({ id: "league_champion", nameKey: "ach.leagueChampion", tier: "gold" })
    } else if (rank === 2) {
      out.push({ id: "runner_up", nameKey: "ach.runnerUp", tier: "silver" })
    } else if (rank >= 3 && rank <= 4) {
      out.push({ id: "top4", nameKey: "ach.top4", tier: "bronze" })
    }
    if (row !== undefined) {
      const maxGoalsFor = Math.max(...standings.map((entry) => entry.goalsFor))
      const minGoalsAgainst = Math.min(...standings.map((entry) => entry.goalsAgainst))
      if (row.goalsFor === maxGoalsFor) {
        out.push({ id: "most_goals", nameKey: "ach.mostGoals", tier: "gold" })
      }
      if (row.goalsAgainst === minGoalsAgainst) {
        out.push({ id: "best_defense", nameKey: "ach.fewestConceded", tier: "gold" })
      }
      if (row.goalsFor >= 100) {
        out.push({ id: "century", nameKey: "ach.century", tier: "gold" })
      }
      if (row.played > 0 && row.lost === 0) {
        out.push({ id: "invincible", nameKey: "ach.invincible", tier: "gold" })
      }
      if (row.goalsFor - row.goalsAgainst >= 40) {
        out.push({ id: "dominant", nameKey: "ach.dominant", tier: "silver" })
      }
    }
  } else {
    const championId = getChampionId(competition, clubIds)
    if (championId === userId) {
      out.push({ id: "cup_champion", nameKey: "ach.cupChampion", tier: "gold" })
    } else {
      // 마지막(결승) 라운드에 참여했다면 준우승.
      const finalRound = Math.max(...competition.fixtures.map((fixture) => fixture.round))
      const inFinal = competition.fixtures.some(
        (fixture) =>
          fixture.round === finalRound && (fixture.homeId === userId || fixture.awayId === userId),
      )
      if (inFinal) {
        out.push({ id: "cup_runner_up", nameKey: "ach.cupRunnerUp", tier: "silver" })
      }
    }
  }

  if (streak >= 10) {
    out.push({ id: "streak10", nameKey: "ach.streak10", tier: "gold" })
  } else if (streak >= 5) {
    out.push({ id: "streak5", nameKey: "ach.streak5", tier: "bronze" })
  }

  return out.sort((left, right) => TIER_ORDER[left.tier] - TIER_ORDER[right.tier])
}
