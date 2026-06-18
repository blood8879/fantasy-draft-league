import type { PlayerCard } from "../data/schema"
import type { DraftState } from "../domain/draft"
import type { Club } from "../domain/game"
import { type Rng, createRng, shuffle, weightedPick } from "../domain/rng"
import { createTeamProfile } from "./teamProfile"
import type { TeamProfile } from "./types"

export type GoalScorer = {
  readonly cardId: string
  readonly label: string
  readonly count: number
}

/** 라이브 관전용 골 이벤트(몇 분에 누가 넣었는지) */
export type MatchEvent = {
  readonly minute: number
  readonly side: "home" | "away"
  readonly cardId: string
  readonly label: string
  readonly assistLabel: string | undefined
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
  readonly events: readonly MatchEvent[]
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

  const homeRaw = buildGoalEvents(input.home.squad, input.cards, homeGoals, "home", rng)
  const awayRaw = buildGoalEvents(input.away.squad, input.cards, awayGoals, "away", rng)
  const events = assignMinutes([...homeRaw, ...awayRaw], rng)

  const shootout =
    !input.allowDraw && homeGoals === awayGoals
      ? resolveShootout(input.home.club.id, input.away.club.id, homeProfile, awayProfile, rng)
      : undefined

  return {
    homeGoals,
    awayGoals,
    homeXg: roundOne(homeXg),
    awayXg: roundOne(awayXg),
    homeScorers: tallyEvents(
      events,
      "home",
      (event) => event.cardId,
      (event) => event.label,
    ),
    awayScorers: tallyEvents(
      events,
      "away",
      (event) => event.cardId,
      (event) => event.label,
    ),
    homeAssists: tallyAssists(events, "home"),
    awayAssists: tallyAssists(events, "away"),
    events,
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

function sideXg(attacking: TeamProfile, defending: TeamProfile, homeBonus: number): number {
  const advantage =
    (attacking.attack - defending.defensiveStability) * 0.35 +
    (attacking.midfieldControl - defending.midfieldControl) * 0.3 +
    (attacking.transition - defending.pressResistance) * 0.2
  // 케미는 상대 팀 케미와의 차이로 직접 xG에 반영한다(잘 짜인 스쿼드가 확실히 유리하도록).
  const chemistryEdge = (attacking.chemistry - defending.chemistry) / 55
  return clamp(
    0.25,
    4.2,
    1.28 +
      homeBonus +
      (attacking.attack - defending.defensiveStability) / 48 +
      (attacking.chanceCreation - defending.midfieldControl) / 72 +
      advantage / 90 +
      chemistryEdge,
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

type RawGoal = Omit<MatchEvent, "minute">

/** 한 팀의 골들에 대해 득점자·도움자를 정하되, 분(minute)은 아직 비워둔다. */
function buildGoalEvents(
  squad: DraftState,
  cards: readonly PlayerCard[],
  goals: number,
  side: "home" | "away",
  rng: Rng,
): readonly RawGoal[] {
  const lineup = squad.picks.flatMap((pick) => {
    const card = cards.find((candidate) => candidate.id === pick.cardId)
    return card === undefined ? [] : [card]
  })
  if (lineup.length === 0 || goals === 0) {
    return []
  }
  const result: RawGoal[] = []
  for (let goal = 0; goal < goals; goal += 1) {
    const scorer = weightedPick(lineup, scorerWeight, rng)
    if (scorer === undefined) {
      continue
    }
    // 득점자 본인을 제외한 동료 중에서 도움자를 가중 추첨한다(일부는 솔로골).
    const assister =
      rng() >= SOLO_GOAL_CHANCE
        ? weightedPick(
            lineup.filter((card) => card.id !== scorer.id),
            assistWeight,
            rng,
          )
        : undefined
    result.push({
      side,
      cardId: scorer.id,
      label: scorer.label,
      assistLabel: assister?.label,
    })
  }
  return result
}

/** 양 팀 골에 1~90분을 결정적으로 배정하고 분 순서대로 정렬한다. */
function assignMinutes(raw: readonly RawGoal[], rng: Rng): readonly MatchEvent[] {
  if (raw.length === 0) {
    return []
  }
  const minutes = uniqueMinutes(raw.length, rng)
  const shuffled = shuffle(raw, rng)
  return shuffled
    .map((goal, index) => ({ ...goal, minute: minutes[index] ?? 90 }))
    .sort((left, right) => left.minute - right.minute)
}

function uniqueMinutes(count: number, rng: Rng): readonly number[] {
  const picked = new Set<number>()
  let guard = 0
  while (picked.size < count && guard < count * 20 + 50) {
    guard += 1
    picked.add(1 + Math.floor(rng() * 90))
  }
  return Array.from(picked)
}

function tallyEvents(
  events: readonly MatchEvent[],
  side: "home" | "away",
  keyOf: (event: MatchEvent) => string,
  labelOf: (event: MatchEvent) => string,
): readonly GoalScorer[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const event of events) {
    if (event.side !== side) {
      continue
    }
    const key = keyOf(event)
    const existing = counts.get(key)
    counts.set(key, { label: labelOf(event), count: (existing?.count ?? 0) + 1 })
  }
  return Array.from(counts.entries()).map(([cardId, value]) => ({
    cardId,
    label: value.label,
    count: value.count,
  }))
}

function tallyAssists(events: readonly MatchEvent[], side: "home" | "away"): readonly GoalScorer[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.side === side && event.assistLabel !== undefined) {
      counts.set(event.assistLabel, (counts.get(event.assistLabel) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries()).map(([label, count]) => ({ cardId: label, label, count }))
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
