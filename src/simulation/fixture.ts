import type { PlayerCard } from "../data/schema"
import type { DraftState } from "../domain/draft"
import type { Club } from "../domain/game"
import { type Rng, createRng, weightedPick } from "../domain/rng"
import { createTeamProfile } from "./teamProfile"
import type { TeamProfile } from "./types"

export type GoalScorer = {
  readonly cardId: string
  readonly label: string
  readonly count: number
}

export type ShootoutResult = {
  readonly home: number
  readonly away: number
  readonly winnerClubId: string
}

export type FixtureResult = {
  readonly homeGoals: number
  readonly awayGoals: number
  readonly homeXg: number
  readonly awayXg: number
  readonly homeScorers: readonly GoalScorer[]
  readonly awayScorers: readonly GoalScorer[]
  readonly homeAssists: readonly GoalScorer[]
  readonly awayAssists: readonly GoalScorer[]
  readonly homeProfile: TeamProfile
  readonly awayProfile: TeamProfile
  readonly shootout: ShootoutResult | undefined
}

type FixtureSide = {
  readonly club: Club
  readonly squad: DraftState
}

type SimulateFixtureInput = {
  readonly seed: string
  readonly home: FixtureSide
  readonly away: FixtureSide
  readonly cards: readonly PlayerCard[]
  readonly allowDraw: boolean
}

/** 홈 어드밴티지: 홈팀 기대득점(xG)에 더해지는 보너스 */
const HOME_XG_BONUS = 0.32

export function simulateFixture(input: SimulateFixtureInput): FixtureResult {
  const homeProfile = createTeamProfile(input.home.squad, input.cards, input.home.club.tactic)
  const awayProfile = createTeamProfile(input.away.squad, input.cards, input.away.club.tactic)
  const rng = createRng(`${input.seed}:${input.home.club.id}v${input.away.club.id}`)

  const homeXg = sideXg(homeProfile, awayProfile, HOME_XG_BONUS)
  const awayXg = sideXg(awayProfile, homeProfile, 0)
  const homeGoals = sampleGoals(homeXg, rng)
  const awayGoals = sampleGoals(awayXg, rng)

  const home = attributeGoals(input.home.squad, input.cards, homeGoals, rng)
  const away = attributeGoals(input.away.squad, input.cards, awayGoals, rng)

  const shootout =
    !input.allowDraw && homeGoals === awayGoals
      ? resolveShootout(input.home.club.id, input.away.club.id, homeProfile, awayProfile, rng)
      : undefined

  return {
    homeGoals,
    awayGoals,
    homeXg: roundOne(homeXg),
    awayXg: roundOne(awayXg),
    homeScorers: home.scorers,
    awayScorers: away.scorers,
    homeAssists: home.assists,
    awayAssists: away.assists,
    homeProfile,
    awayProfile,
    shootout,
  }
}

export function getFixtureWinnerId(
  result: FixtureResult,
  homeId: string,
  awayId: string,
): string | undefined {
  if (result.homeGoals > result.awayGoals) {
    return homeId
  }
  if (result.awayGoals > result.homeGoals) {
    return awayId
  }
  return result.shootout?.winnerClubId
}

export function describeMatchForClub(result: FixtureResult, isHome: boolean): readonly string[] {
  const mine = isHome ? result.homeProfile : result.awayProfile
  const theirs = isHome ? result.awayProfile : result.homeProfile
  const myGoals = isHome ? result.homeGoals : result.awayGoals
  const theirGoals = isHome ? result.awayGoals : result.homeGoals

  const lines: string[] = []
  if (mine.midfieldControl > theirs.midfieldControl + 3) {
    lines.push("중원 장악력에서 우위를 점하며 경기 템포를 통제했습니다.")
  } else if (theirs.midfieldControl > mine.midfieldControl + 3) {
    lines.push("중원 싸움에서 밀리며 점유 구간을 자주 내줬습니다.")
  }
  if (mine.attack > theirs.defensiveStability + 4) {
    lines.push("공격진이 상대 수비 라인을 반복적으로 흔들었습니다.")
  }
  if (theirs.attack > mine.defensiveStability + 4) {
    lines.push("상대 공격력이 우리 수비 안정성을 상회해 위험 장면이 많았습니다.")
  }
  if (mine.pressResistance < theirs.attack - 8) {
    lines.push("강한 압박 아래에서 빌드업이 흔들리는 장면이 나왔습니다.")
  }
  if (mine.chemistry >= 90) {
    lines.push("같은 시대 선수 조합의 케미스트리가 시너지를 냈습니다.")
  }
  if (myGoals > theirGoals) {
    lines.push("결정적인 순간의 집중력이 승점을 가져왔습니다.")
  } else if (myGoals < theirGoals) {
    lines.push("기회 대비 마무리가 아쉬워 승부가 기울었습니다.")
  } else {
    lines.push("양 팀 모두 결정타를 꽂지 못한 팽팽한 승부였습니다.")
  }
  return lines
}

function sideXg(attacking: TeamProfile, defending: TeamProfile, homeBonus: number): number {
  const advantage =
    (attacking.attack - defending.defensiveStability) * 0.35 +
    (attacking.midfieldControl - defending.midfieldControl) * 0.3 +
    (attacking.transition - defending.pressResistance) * 0.2 +
    (attacking.chemistry - 75) * 0.15
  return clamp(
    0.25,
    4.2,
    1.28 +
      homeBonus +
      (attacking.attack - defending.defensiveStability) / 48 +
      (attacking.chanceCreation - defending.midfieldControl) / 72 +
      advantage / 90,
  )
}

function sampleGoals(xg: number, rng: Rng): number {
  const limit = Math.exp(-xg)
  let count = 0
  let probability = 1
  do {
    count += 1
    probability *= rng()
  } while (probability > limit && count <= 9)
  return count - 1
}

/** 한 골이 도움 없이 터질(개인 돌파·세트피스 등) 확률 */
const SOLO_GOAL_CHANCE = 0.28

function attributeGoals(
  squad: DraftState,
  cards: readonly PlayerCard[],
  goals: number,
  rng: Rng,
): { readonly scorers: readonly GoalScorer[]; readonly assists: readonly GoalScorer[] } {
  const lineup = squad.picks.flatMap((pick) => {
    const card = cards.find((candidate) => candidate.id === pick.cardId)
    return card === undefined ? [] : [card]
  })
  if (lineup.length === 0 || goals === 0) {
    return { scorers: [], assists: [] }
  }
  const scorerCounts = new Map<string, number>()
  const assistCounts = new Map<string, number>()
  for (let goal = 0; goal < goals; goal += 1) {
    const scorer = weightedPick(lineup, scorerWeight, rng)
    if (scorer === undefined) {
      continue
    }
    scorerCounts.set(scorer.id, (scorerCounts.get(scorer.id) ?? 0) + 1)
    // 득점자 본인을 제외한 동료 중에서 도움자를 가중 추첨한다(일부는 솔로골).
    if (rng() >= SOLO_GOAL_CHANCE) {
      const assister = weightedPick(
        lineup.filter((card) => card.id !== scorer.id),
        assistWeight,
        rng,
      )
      if (assister !== undefined) {
        assistCounts.set(assister.id, (assistCounts.get(assister.id) ?? 0) + 1)
      }
    }
  }
  return {
    scorers: toTally(scorerCounts, lineup),
    assists: toTally(assistCounts, lineup),
  }
}

function toTally(
  counts: ReadonlyMap<string, number>,
  lineup: readonly PlayerCard[],
): readonly GoalScorer[] {
  return Array.from(counts.entries()).map(([cardId, count]) => ({
    cardId,
    label: lineup.find((card) => card.id === cardId)?.label ?? cardId,
    count,
  }))
}

const positionGoalFactor: Readonly<Record<string, number>> = {
  GK: 0.01,
  CB: 0.16,
  RB: 0.26,
  LB: 0.26,
  DM: 0.34,
  CM: 0.55,
  AM: 0.85,
  RW: 0.95,
  LW: 0.95,
  ST: 1.1,
}

function scorerWeight(card: PlayerCard): number {
  const factor = Math.max(...card.positions.map((position) => positionGoalFactor[position] ?? 0.4))
  return Math.max(1, card.internalScores.scoring - 42) * factor
}

/** 도움 빈도: 창의성·전진·측면 가담이 높은 선수일수록 어시스트를 많이 만든다 */
const positionAssistFactor: Readonly<Record<string, number>> = {
  GK: 0.02,
  CB: 0.2,
  RB: 0.7,
  LB: 0.7,
  DM: 0.5,
  CM: 0.9,
  AM: 1.15,
  RW: 1.1,
  LW: 1.1,
  ST: 0.7,
}

function assistWeight(card: PlayerCard): number {
  const factor = Math.max(
    ...card.positions.map((position) => positionAssistFactor[position] ?? 0.5),
  )
  const playmaking = (card.internalScores.creation + card.internalScores.progression) / 2
  return Math.max(1, playmaking - 42) * factor
}

function resolveShootout(
  homeId: string,
  awayId: string,
  homeProfile: TeamProfile,
  awayProfile: TeamProfile,
  rng: Rng,
): ShootoutResult {
  const nerveEdge =
    (homeProfile.defensiveStability - awayProfile.defensiveStability) / 500 +
    (homeProfile.chemistry - awayProfile.chemistry) / 600
  // 홈 관중 효과로 승부차기에서도 홈팀이 약간 유리하다.
  const homeChance = clamp(0.35, 0.68, 0.53 + nerveEdge)
  const homeWins = rng() < homeChance
  const loserScore = Math.floor(rng() * 3) + 1
  return {
    home: homeWins ? 4 : loserScore,
    away: homeWins ? loserScore : 4,
    winnerClubId: homeWins ? homeId : awayId,
  }
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10
}
