import { describe, expect, it } from "vitest"
import type { Competition, Fixture } from "../domain/competition"
import type { FixtureResult } from "../simulation/fixture"
import { computeRunScore } from "./runScore"

function res(homeGoals: number, awayGoals: number, shootoutWinner?: string): FixtureResult {
  const base = { homeGoals, awayGoals }
  if (shootoutWinner !== undefined) {
    return {
      ...base,
      shootout: { home: 4, away: 3, winnerClubId: shootoutWinner },
    } as unknown as FixtureResult
  }
  return base as unknown as FixtureResult
}

function fixture(round: number, homeId: string, awayId: string, result?: FixtureResult): Fixture {
  const base = { id: `${round}-${homeId}-${awayId}`, round, homeId, awayId }
  return result === undefined ? base : { ...base, result }
}

describe("computeRunScore", () => {
  it("리그: 단일 정수, 1위가 꼴찌보다 높다", () => {
    const clubIds = ["user", "a"]
    // user가 a를 두 번 이김
    const league: Competition = {
      kind: "리그",
      currentRound: 3,
      totalRounds: 2,
      fixtures: [fixture(1, "user", "a", res(3, 0)), fixture(2, "a", "user", res(0, 2))],
    }
    const score = computeRunScore(league, clubIds, "user")
    expect(Number.isInteger(score.total)).toBe(true)
    expect(score.breakdown.rank).toBe(1)
    expect(score.breakdown.points).toBe(6)
    expect(score.breakdown.gd).toBe(5)
    // 같은 대회에서 a(꼴찌)의 점수는 user보다 낮아야 한다
    const loser = computeRunScore(league, clubIds, "a")
    expect(score.total).toBeGreaterThan(loser.total)
  })

  it("컵: 진출 stage가 순위를 지배(챔피언=1위 > 1라운드 탈락)", () => {
    const clubIds = ["user", "a", "b", "c"] // 4팀, totalRounds=2
    // 챔피언 시나리오: user가 준결승(R1)·결승(R2) 모두 승
    const champ: Competition = {
      kind: "컵",
      currentRound: 3,
      totalRounds: 2,
      fixtures: [
        fixture(1, "user", "a", res(2, 0)),
        fixture(1, "b", "c", res(1, 0)),
        fixture(2, "user", "b", res(1, 0)),
      ],
    }
    // 1라운드 탈락 시나리오: user가 R1에서 패
    const early: Competition = {
      kind: "컵",
      currentRound: 3,
      totalRounds: 2,
      fixtures: [
        fixture(1, "user", "a", res(0, 2)),
        fixture(1, "b", "c", res(1, 0)),
        fixture(2, "a", "b", res(1, 0)),
      ],
    }
    const champScore = computeRunScore(champ, clubIds, "user")
    const earlyScore = computeRunScore(early, clubIds, "user")
    expect(champScore.breakdown.rank).toBe(1)
    expect(earlyScore.breakdown.rank).toBeGreaterThan(champScore.breakdown.rank)
    expect(champScore.total).toBeGreaterThan(earlyScore.total)
  })

  it("슛아웃 KO(0-GD)는 stage 밴딩이 지배한다", () => {
    const clubIds = ["user", "a", "b", "c"]
    // user가 무승부 후 슛아웃으로 승리(GD=0이지만 다음 라운드 진출)
    const comp: Competition = {
      kind: "컵",
      currentRound: 3,
      totalRounds: 2,
      fixtures: [
        fixture(1, "user", "a", res(1, 1, "user")),
        fixture(1, "b", "c", res(2, 0)),
        fixture(2, "user", "b", res(2, 1)),
      ],
    }
    const score = computeRunScore(comp, clubIds, "user")
    // 챔피언이므로 GD가 작아도 rank=1
    expect(score.breakdown.rank).toBe(1)
    expect(Number.isInteger(score.total)).toBe(true)
  })
})
