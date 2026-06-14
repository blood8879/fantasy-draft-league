import { describe, expect, it } from "vitest"
import { cardsById, draftPool } from "../app/gameStore"
import { createFantasyDraft, fastForwardAiPicks } from "../domain/fantasyDraft"
import { type Club, aiPersonas, createAiClub, createUserClub } from "../domain/game"
import { getFixtureWinnerId, simulateFixture } from "./fixture"

const clubs: readonly Club[] = [
  createUserClub("테스트 FC", "4-3-3", "점유율"),
  ...aiPersonas.map((persona) => createAiClub(persona, persona.preferredFormations[0] ?? "4-3-3")),
]
const squads = fastForwardAiPicks(
  createFantasyDraft(clubs, draftPool, "fixture-seed"),
  cardsById,
  () => false,
).squads

const home = { club: clubs[0] as Club, squad: squads[(clubs[0] as Club).id] }
const away = { club: clubs[1] as Club, squad: squads[(clubs[1] as Club).id] }

function run(seed: string, allowDraw = true) {
  if (home.squad === undefined || away.squad === undefined) {
    throw new Error("missing squads")
  }
  return simulateFixture({
    seed,
    home: { club: home.club, squad: home.squad },
    away: { club: away.club, squad: away.squad },
    cards: draftPool,
    allowDraw,
  })
}

describe("simulateFixture", () => {
  it("is deterministic for the same seed", () => {
    expect(run("match-1")).toEqual(run("match-1"))
  })

  it("varies across seeds", () => {
    const scores = new Set(
      Array.from({ length: 30 }, (_, index) => {
        const result = run(`vary-${index}`)
        return `${result.homeGoals}-${result.awayGoals}`
      }),
    )
    expect(scores.size).toBeGreaterThan(3)
  })

  it("keeps goals within sane bounds and matches scorer counts", () => {
    for (let index = 0; index < 25; index += 1) {
      const result = run(`bounds-${index}`)
      expect(result.homeGoals).toBeGreaterThanOrEqual(0)
      expect(result.homeGoals).toBeLessThanOrEqual(9)
      expect(result.awayGoals).toBeLessThanOrEqual(9)

      const homeScored = result.homeScorers.reduce((sum, scorer) => sum + scorer.count, 0)
      const awayScored = result.awayScorers.reduce((sum, scorer) => sum + scorer.count, 0)
      expect(homeScored).toBe(result.homeGoals)
      expect(awayScored).toBe(result.awayGoals)

      const lineupIds = new Set((home.squad?.picks ?? []).map((pick) => pick.cardId))
      for (const scorer of result.homeScorers) {
        expect(lineupIds.has(scorer.cardId)).toBe(true)
      }
    }
  })

  it("resolves knockout draws with a shootout winner", () => {
    let sawShootout = false
    for (let index = 0; index < 60 && !sawShootout; index += 1) {
      const result = run(`cup-${index}`, false)
      if (result.homeGoals === result.awayGoals) {
        sawShootout = true
        expect(result.shootout).toBeDefined()
        const winner = getFixtureWinnerId(result, home.club.id, away.club.id)
        expect([home.club.id, away.club.id]).toContain(winner)
        expect(result.shootout?.home).not.toBe(result.shootout?.away)
      }
    }
    expect(sawShootout).toBe(true)
  })
})
