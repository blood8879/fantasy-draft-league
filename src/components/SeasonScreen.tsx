import { useState } from "react"
import { type GameAction, type GameState, cardsById, draftPool } from "../app/gameStore"
import {
  buildGoalkeepers,
  getCupRoundName,
  getRoundFixtures,
  isCompetitionFinished,
} from "../domain/competition"
import { USER_CLUB_ID } from "../domain/game"
import { tacticTypes } from "../domain/types"
import { getFixtureWinnerId } from "../simulation/fixture"
import { createTeamProfile } from "../simulation/teamProfile"
import type { TeamProfile } from "../simulation/types"
import { RewardedAdButton } from "./RewardedAdButton"
import { StandingsTable } from "./StandingsTable"
import { StatLeaders } from "./StatLeaders"

type SeasonScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

const scoutAxes: readonly { readonly key: keyof TeamProfile; readonly label: string }[] = [
  { key: "attack", label: "공격력" },
  { key: "chanceCreation", label: "기회 창출" },
  { key: "midfieldControl", label: "중원 장악" },
  { key: "pressResistance", label: "압박 저항" },
  { key: "defensiveStability", label: "수비 안정" },
]

export function SeasonScreen({ state, dispatch }: SeasonScreenProps) {
  const [scoutedRound, setScoutedRound] = useState<number | undefined>(undefined)
  const competition = state.competition
  if (competition === undefined) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const userClub = state.clubs.find((club) => club.isUser)
  const finished = isCompetitionFinished(competition)
  const goalkeepers =
    state.draft === undefined ? new Map() : buildGoalkeepers(state.draft.squads, cardsById)

  const userFixture = finished
    ? undefined
    : getRoundFixtures(competition, competition.currentRound).find(
        (fixture) => fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID,
      )
  const opponentId =
    userFixture === undefined
      ? undefined
      : userFixture.homeId === USER_CLUB_ID
        ? userFixture.awayId
        : userFixture.homeId
  const opponentClub = opponentId === undefined ? undefined : clubsById.get(opponentId)
  const opponentSquad =
    opponentId === undefined || state.draft === undefined
      ? undefined
      : state.draft.squads[opponentId]
  const scouted = scoutedRound === competition.currentRound
  const opponentProfile =
    scouted && opponentSquad !== undefined && opponentClub !== undefined
      ? createTeamProfile(opponentSquad, draftPool, opponentClub.tactic)
      : undefined
  const userAlive =
    competition.kind === "리그" ||
    getRoundFixtures(competition, competition.currentRound).some(
      (fixture) => fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID,
    )

  const roundLabel =
    competition.kind === "리그"
      ? `${competition.currentRound}라운드`
      : getCupRoundName(competition, competition.currentRound)
  const remainingRounds = competition.totalRounds - competition.currentRound + 1

  return (
    <section className="season-screen">
      <header className="season-header">
        <div>
          <p className="eyebrow">{competition.kind === "리그" ? "리그 시즌" : "녹아웃 컵"}</p>
          <h2>{finished ? "시즌 종료" : `다음 경기: ${roundLabel}`}</h2>
        </div>
        <div className="season-header-actions">
          {!finished ? (
            <>
              <fieldset className="tactic-inline" aria-label="이번 라운드 전술">
                <span className="setup-label">전술</span>
                {tacticTypes.map((tactic) => (
                  <button
                    aria-pressed={userClub?.tactic === tactic}
                    className="tactic-chip"
                    key={tactic}
                    onClick={() => dispatch({ type: "SET_TACTIC", tactic })}
                    type="button"
                  >
                    {tactic}
                  </button>
                ))}
              </fieldset>
              <button
                className="primary-action primary-action--bright"
                onClick={() => dispatch({ type: "PLAY_ROUND" })}
                type="button"
              >
                {userAlive ? `${roundLabel} 킥오프` : `${roundLabel} 관전`}
              </button>
              {remainingRounds > 1 ? (
                <div className="fast-forward-actions">
                  {remainingRounds > 5 ? (
                    <button
                      className="ghost-action"
                      onClick={() => dispatch({ type: "SIMULATE_ROUNDS", count: 5 })}
                      type="button"
                    >
                      5라운드 빠르게
                    </button>
                  ) : null}
                  <button
                    className="ghost-action"
                    onClick={() => dispatch({ type: "SIMULATE_ROUNDS", count: remainingRounds })}
                    type="button"
                  >
                    시즌 끝까지 시뮬
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </header>

      <div className="season-grid">
        <div className="draft-aside season-main-panel">
          {competition.kind === "리그" ? (
            <>
              <h3>리그 순위표</h3>
              <StandingsTable clubs={state.clubs} fixtures={competition.fixtures} />
            </>
          ) : (
            <CupBracket state={state} />
          )}
        </div>

        <aside className="draft-aside season-side-panel">
          {opponentClub !== undefined ? (
            <div className="scout-report">
              <h3>다음 상대 · {opponentClub.name}</h3>
              <p className="scout-philosophy">“{opponentClub.philosophy}”</p>
              {opponentProfile !== undefined ? (
                <ul className="scout-bars">
                  {scoutAxes.map((axis) => {
                    const value = opponentProfile[axis.key] as number
                    return (
                      <li key={axis.key}>
                        <span className="scout-axis-label">{axis.label}</span>
                        <span className="scout-bar-track">
                          <span
                            className="scout-bar-fill"
                            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                          />
                        </span>
                        <span className="scout-axis-value">{value}</span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <RewardedAdButton
                  action="scout_report"
                  onReward={() => setScoutedRound(competition.currentRound)}
                >
                  전력 분석 보기
                </RewardedAdButton>
              )}
            </div>
          ) : null}

          <h3>개인 기록</h3>
          <StatLeaders
            clubs={state.clubs}
            fixtures={competition.fixtures}
            goalkeepers={goalkeepers}
            limit={7}
          />

          {competition.kind === "리그" ? (
            <>
              <h3>{roundLabel} 대진</h3>
              <ul className="fixture-list">
                {getRoundFixtures(
                  competition,
                  Math.min(competition.currentRound, competition.totalRounds),
                ).map((fixture) => (
                  <li
                    data-user={
                      fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID
                        ? "true"
                        : undefined
                    }
                    key={fixture.id}
                  >
                    {clubsById.get(fixture.homeId)?.name} vs {clubsById.get(fixture.awayId)?.name}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

function CupBracket({ state }: { readonly state: GameState }) {
  const competition = state.competition
  if (competition === undefined) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const rounds = Array.from({ length: competition.totalRounds }, (_, index) => index + 1)
  return (
    <>
      <h3>대진표</h3>
      <div className="cup-bracket">
        {rounds.map((round) => {
          const fixtures = getRoundFixtures(competition, round)
          return (
            <div className="cup-round" key={round}>
              <h4>{getCupRoundName(competition, round)}</h4>
              <ul>
                {fixtures.length === 0 ? <li className="cup-tbd">대진 미정</li> : null}
                {fixtures.map((fixture) => {
                  const winnerId =
                    fixture.result === undefined
                      ? undefined
                      : getFixtureWinnerId(fixture.result, fixture.homeId, fixture.awayId)
                  return (
                    <li
                      className="cup-tie"
                      data-user={
                        fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID
                          ? "true"
                          : undefined
                      }
                      key={fixture.id}
                    >
                      <CupTieSide
                        clubName={clubsById.get(fixture.homeId)?.name ?? fixture.homeId}
                        goals={fixture.result?.homeGoals}
                        isWinner={winnerId === fixture.homeId}
                        shootout={fixture.result?.shootout?.home}
                      />
                      <CupTieSide
                        clubName={clubsById.get(fixture.awayId)?.name ?? fixture.awayId}
                        goals={fixture.result?.awayGoals}
                        isWinner={winnerId === fixture.awayId}
                        shootout={fixture.result?.shootout?.away}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </>
  )
}

function CupTieSide({
  clubName,
  goals,
  isWinner,
  shootout,
}: {
  readonly clubName: string
  readonly goals: number | undefined
  readonly isWinner: boolean
  readonly shootout: number | undefined
}) {
  return (
    <span className={isWinner ? "cup-side cup-side--winner" : "cup-side"}>
      <span className="cup-side-name">{clubName}</span>
      <span className="cup-side-score">
        {goals ?? "-"}
        {shootout !== undefined ? ` (${shootout})` : ""}
      </span>
    </span>
  )
}
