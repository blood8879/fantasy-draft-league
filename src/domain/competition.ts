import type { PlayerCard } from "../data/schema"
import { type FixtureResult, getFixtureWinnerId, simulateFixture } from "../simulation/fixture"
import type { DraftState } from "./draft"
import type { Club } from "./game"
import type { GameMode } from "./game"
import { createRng, shuffle } from "./rng"

export type Fixture = {
  readonly id: string
  readonly round: number
  readonly homeId: string
  readonly awayId: string
  readonly result?: FixtureResult
}

export type Competition = {
  readonly kind: GameMode
  readonly fixtures: readonly Fixture[]
  readonly currentRound: number
  readonly totalRounds: number
}

export type StandingRow = {
  readonly clubId: string
  readonly played: number
  readonly won: number
  readonly drawn: number
  readonly lost: number
  readonly goalsFor: number
  readonly goalsAgainst: number
  readonly points: number
}

/** 개인 기록 한 줄(득점/도움/클린시트 공용). value의 의미는 호출부가 정한다. */
export type StatRow = {
  readonly cardId: string
  readonly label: string
  readonly clubId: string
  readonly value: number
}

/** 구단별 골키퍼(클린시트 집계용) */
export type GoalkeeperRef = {
  readonly cardId: string
  readonly label: string
}

export function createCompetition(
  mode: GameMode,
  clubIds: readonly string[],
  seed: string,
): Competition {
  return mode === "리그" ? createLeague(clubIds, seed) : createCup(clubIds, seed)
}

function createLeague(clubIds: readonly string[], seed: string): Competition {
  const order = shuffle(clubIds, createRng(`${seed}:league-order`))
  const anchor = order[0]
  const rotating = order.slice(1)
  // 홈/어웨이 더블 라운드로빈: 전반기(n-1) + 후반기(n-1, 홈·원정 반대) = 2*(n-1) 라운드
  const halfRounds = order.length - 1
  const fixtures: Fixture[] = []

  for (let round = 0; round < halfRounds; round += 1) {
    const wheel = [
      ...rotating.slice(rotating.length - round),
      ...rotating.slice(0, rotating.length - round),
    ]
    const lineup = [anchor, ...wheel] as readonly string[]
    for (let pair = 0; pair < lineup.length / 2; pair += 1) {
      const first = lineup[pair] as string
      const second = lineup[lineup.length - 1 - pair] as string
      const flip = (round + pair) % 2 === 1
      const home = flip ? second : first
      const away = flip ? first : second
      // 전반기 경기
      fixtures.push({
        id: `L${round + 1}-${pair + 1}`,
        round: round + 1,
        homeId: home,
        awayId: away,
      })
      // 후반기 경기(홈/원정 반대)
      fixtures.push({
        id: `L${round + 1 + halfRounds}-${pair + 1}`,
        round: round + 1 + halfRounds,
        homeId: away,
        awayId: home,
      })
    }
  }
  return { kind: "리그", fixtures, currentRound: 1, totalRounds: halfRounds * 2 }
}

function createCup(clubIds: readonly string[], seed: string): Competition {
  const order = shuffle(clubIds, createRng(`${seed}:cup-draw`))
  const totalRounds = Math.round(Math.log2(order.length))
  const fixtures: Fixture[] = []
  for (let pair = 0; pair < order.length / 2; pair += 1) {
    fixtures.push({
      id: `C1-${pair + 1}`,
      round: 1,
      homeId: order[pair * 2] as string,
      awayId: order[pair * 2 + 1] as string,
    })
  }
  return { kind: "컵", fixtures, currentRound: 1, totalRounds }
}

export function getCupRoundName(competition: Competition, round: number): string {
  const teamsInRound = 2 ** (competition.totalRounds - round + 1)
  if (teamsInRound === 2) {
    return "결승"
  }
  if (teamsInRound === 4) {
    return "준결승"
  }
  return `${teamsInRound}강`
}

export function getRoundFixtures(competition: Competition, round: number): readonly Fixture[] {
  return competition.fixtures.filter((fixture) => fixture.round === round)
}

export function isCompetitionFinished(competition: Competition): boolean {
  return competition.currentRound > competition.totalRounds
}

type PlayRoundInput = {
  readonly competition: Competition
  readonly clubsById: ReadonlyMap<string, Club>
  readonly squads: Readonly<Record<string, DraftState>>
  readonly cards: readonly PlayerCard[]
  readonly seed: string
}

export function playCurrentRound(input: PlayRoundInput): {
  readonly competition: Competition
  readonly playedFixtures: readonly Fixture[]
} {
  const { competition } = input
  if (isCompetitionFinished(competition)) {
    return { competition, playedFixtures: [] }
  }
  const playedFixtures = getRoundFixtures(competition, competition.currentRound).map((fixture) =>
    simulateOne(fixture, input),
  )
  const fixtures: Fixture[] = competition.fixtures.map(
    (fixture) => playedFixtures.find((played) => played.id === fixture.id) ?? fixture,
  )

  if (competition.kind === "컵" && competition.currentRound < competition.totalRounds) {
    const winners = playedFixtures.flatMap((fixture) => {
      const winnerId =
        fixture.result === undefined
          ? undefined
          : getFixtureWinnerId(fixture.result, fixture.homeId, fixture.awayId)
      return winnerId === undefined ? [] : [winnerId]
    })
    const nextRound = competition.currentRound + 1
    for (let pair = 0; pair < winners.length / 2; pair += 1) {
      fixtures.push({
        id: `C${nextRound}-${pair + 1}`,
        round: nextRound,
        homeId: winners[pair * 2] as string,
        awayId: winners[pair * 2 + 1] as string,
      })
    }
  }

  return {
    competition: { ...competition, fixtures, currentRound: competition.currentRound + 1 },
    playedFixtures,
  }
}

function simulateOne(fixture: Fixture, input: PlayRoundInput): Fixture {
  const homeClub = input.clubsById.get(fixture.homeId)
  const awayClub = input.clubsById.get(fixture.awayId)
  const homeSquad = input.squads[fixture.homeId]
  const awaySquad = input.squads[fixture.awayId]
  if (
    homeClub === undefined ||
    awayClub === undefined ||
    homeSquad === undefined ||
    awaySquad === undefined
  ) {
    throw new Error(`Fixture references unknown club: ${fixture.id}`)
  }
  const result = simulateFixture({
    seed: `${input.seed}:R${fixture.round}:${fixture.id}`,
    home: { club: homeClub, squad: homeSquad },
    away: { club: awayClub, squad: awaySquad },
    cards: input.cards,
    allowDraw: input.competition.kind === "리그",
  })
  return { ...fixture, result }
}

export function computeStandings(
  clubIds: readonly string[],
  fixtures: readonly Fixture[],
): readonly StandingRow[] {
  const rows = new Map<string, StandingRow>(
    clubIds.map((clubId) => [
      clubId,
      { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    ]),
  )
  for (const fixture of fixtures) {
    if (fixture.result === undefined) {
      continue
    }
    applyResult(rows, fixture.homeId, fixture.result.homeGoals, fixture.result.awayGoals)
    applyResult(rows, fixture.awayId, fixture.result.awayGoals, fixture.result.homeGoals)
  }
  return Array.from(rows.values()).sort(
    (left, right) =>
      right.points - left.points ||
      right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst) ||
      right.goalsFor - left.goalsFor ||
      left.clubId.localeCompare(right.clubId),
  )
}

function applyResult(
  rows: Map<string, StandingRow>,
  clubId: string,
  scored: number,
  conceded: number,
): void {
  const row = rows.get(clubId)
  if (row === undefined) {
    return
  }
  const won = scored > conceded ? 1 : 0
  const drawn = scored === conceded ? 1 : 0
  rows.set(clubId, {
    ...row,
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + (scored < conceded ? 1 : 0),
    goalsFor: row.goalsFor + scored,
    goalsAgainst: row.goalsAgainst + conceded,
    points: row.points + won * 3 + drawn,
  })
}

export function getChampionId(
  competition: Competition,
  clubIds: readonly string[],
): string | undefined {
  if (!isCompetitionFinished(competition)) {
    return undefined
  }
  if (competition.kind === "리그") {
    return computeStandings(clubIds, competition.fixtures)[0]?.clubId
  }
  const final = competition.fixtures.find((fixture) => fixture.round === competition.totalRounds)
  if (final?.result === undefined) {
    return undefined
  }
  return getFixtureWinnerId(final.result, final.homeId, final.awayId)
}

export function computeTopScorers(fixtures: readonly Fixture[], limit: number): readonly StatRow[] {
  return tallyContributions(
    fixtures,
    (result) => result.homeScorers,
    (result) => result.awayScorers,
    limit,
  )
}

export function computeTopAssisters(
  fixtures: readonly Fixture[],
  limit: number,
): readonly StatRow[] {
  return tallyContributions(
    fixtures,
    (result) => result.homeAssists,
    (result) => result.awayAssists,
    limit,
  )
}

/** 각 구단의 골키퍼(클린시트 집계용)를 스쿼드에서 추출한다. */
export function buildGoalkeepers(
  squads: Readonly<Record<string, DraftState>>,
  cardsById: ReadonlyMap<string, PlayerCard>,
): ReadonlyMap<string, GoalkeeperRef> {
  const keepers = new Map<string, GoalkeeperRef>()
  for (const [clubId, squad] of Object.entries(squads)) {
    const gkPick = squad.picks.find((pick) => pick.slotId === "gk")
    const card = gkPick === undefined ? undefined : cardsById.get(gkPick.cardId)
    if (card !== undefined) {
      keepers.set(clubId, { cardId: card.id, label: card.label })
    }
  }
  return keepers
}

export function computeCleanSheets(
  fixtures: readonly Fixture[],
  goalkeepers: ReadonlyMap<string, GoalkeeperRef>,
  limit: number,
): readonly StatRow[] {
  const sheetsByClub = new Map<string, number>()
  for (const fixture of fixtures) {
    if (fixture.result === undefined) {
      continue
    }
    // 정규시간 무실점에 클린시트를 부여한다(승부차기는 무관).
    if (fixture.result.awayGoals === 0) {
      sheetsByClub.set(fixture.homeId, (sheetsByClub.get(fixture.homeId) ?? 0) + 1)
    }
    if (fixture.result.homeGoals === 0) {
      sheetsByClub.set(fixture.awayId, (sheetsByClub.get(fixture.awayId) ?? 0) + 1)
    }
  }
  return Array.from(sheetsByClub.entries())
    .flatMap(([clubId, value]) => {
      const keeper = goalkeepers.get(clubId)
      return keeper === undefined
        ? []
        : [{ cardId: keeper.cardId, label: keeper.label, clubId, value }]
    })
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, limit)
}

function tallyContributions(
  fixtures: readonly Fixture[],
  homeSelector: (
    result: FixtureResult,
  ) => readonly { cardId: string; label: string; count: number }[],
  awaySelector: (
    result: FixtureResult,
  ) => readonly { cardId: string; label: string; count: number }[],
  limit: number,
): readonly StatRow[] {
  const totals = new Map<string, StatRow>()
  for (const fixture of fixtures) {
    if (fixture.result === undefined) {
      continue
    }
    addContributions(totals, homeSelector(fixture.result), fixture.homeId)
    addContributions(totals, awaySelector(fixture.result), fixture.awayId)
  }
  return Array.from(totals.values())
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, limit)
}

function addContributions(
  totals: Map<string, StatRow>,
  contributions: readonly { cardId: string; label: string; count: number }[],
  clubId: string,
): void {
  for (const item of contributions) {
    const existing = totals.get(item.cardId)
    totals.set(item.cardId, {
      cardId: item.cardId,
      label: item.label,
      clubId,
      value: (existing?.value ?? 0) + item.count,
    })
  }
}
