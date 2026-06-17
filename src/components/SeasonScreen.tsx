import { useMemo, useState } from "react"
import { type GameAction, type GameState, cardsById, draftPool } from "../app/gameStore"
import { buildGoalkeepers, getRoundFixtures, isCompetitionFinished } from "../domain/competition"
import { USER_CLUB_ID } from "../domain/game"
import { tacticTypes } from "../domain/types"
import { useI18n } from "../i18n"
import { getFixtureWinnerId } from "../simulation/fixture"
import { averageProfiles, createTeamProfile } from "../simulation/teamProfile"
import type { TeamProfile } from "../simulation/types"
import { RewardedAdButton } from "./RewardedAdButton"
import { SquadDetailModal } from "./SquadDetailModal"
import { StandingsTable } from "./StandingsTable"
import { StatLeaders } from "./StatLeaders"
import { cupRoundLabel, roundLabel, tacticLabel } from "./labels"

type SeasonScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

const scoutAxes: readonly { readonly key: keyof TeamProfile; readonly labelKey: string }[] = [
  { key: "attack", labelKey: "axis.attack" },
  { key: "chanceCreation", labelKey: "axis.chanceCreation" },
  { key: "midfieldControl", labelKey: "axis.midfieldControl" },
  { key: "pressResistance", labelKey: "axis.pressResistance" },
  { key: "defensiveStability", labelKey: "axis.defensiveStability" },
]

export function SeasonScreen({ state, dispatch }: SeasonScreenProps) {
  const { t } = useI18n()
  const [scoutedRound, setScoutedRound] = useState<number | undefined>(undefined)
  const [lineupClubId, setLineupClubId] = useState<string | undefined>(undefined)
  // 리그 평균선(픽이 있는 전 구단) — 모달에서 해당 팀과 비교용.
  const leagueAvg = useMemo(() => {
    const draft = state.draft
    if (draft === undefined) {
      return undefined
    }
    const profiles = state.clubs.flatMap((club) => {
      const squad = draft.squads[club.id]
      if (squad === undefined || squad.picks.length === 0) {
        return []
      }
      return [createTeamProfile(squad, draftPool, club.tactic)]
    })
    return averageProfiles(profiles)
  }, [state.draft, state.clubs])
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

  const currentRoundLabel = roundLabel(competition, competition.currentRound, t)
  const remainingRounds = competition.totalRounds - competition.currentRound + 1

  return (
    <section className="season-screen">
      <header className="season-header">
        <div>
          <p className="eyebrow">
            {competition.kind === "리그" ? t("season.league") : t("season.cup")}
          </p>
          <h2>{finished ? t("season.ended") : t("season.next", { round: currentRoundLabel })}</h2>
        </div>
        <div className="season-header-actions">
          {!finished ? (
            <>
              <fieldset className="tactic-inline" aria-label={t("season.tactic")}>
                <span className="setup-label">{t("season.tactic")}</span>
                {tacticTypes.map((tactic) => (
                  <button
                    aria-pressed={userClub?.tactic === tactic}
                    className="tactic-chip"
                    key={tactic}
                    onClick={() => dispatch({ type: "SET_TACTIC", tactic })}
                    type="button"
                  >
                    {tacticLabel(tactic, t)}
                  </button>
                ))}
              </fieldset>
              <button
                className="primary-action primary-action--bright"
                onClick={() => dispatch({ type: "PLAY_ROUND" })}
                type="button"
              >
                {userAlive
                  ? t("season.kickoff", { round: currentRoundLabel })
                  : t("season.spectate", { round: currentRoundLabel })}
              </button>
              {remainingRounds > 1 ? (
                <div className="fast-forward-actions">
                  {remainingRounds > 5 ? (
                    <button
                      className="ghost-action"
                      onClick={() => dispatch({ type: "SIMULATE_ROUNDS", count: 5 })}
                      type="button"
                    >
                      {t("season.fast5")}
                    </button>
                  ) : null}
                  <button
                    className="ghost-action"
                    onClick={() => dispatch({ type: "SIMULATE_ROUNDS", count: remainingRounds })}
                    type="button"
                  >
                    {t("season.simEnd")}
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
              <h3>{t("season.standings")}</h3>
              <StandingsTable
                clubs={state.clubs}
                fixtures={competition.fixtures}
                onSelectClub={setLineupClubId}
              />
            </>
          ) : (
            <CupBracket state={state} />
          )}
        </div>

        <aside className="draft-aside season-side-panel">
          {opponentClub !== undefined ? (
            <div className="scout-report">
              <h3>{t("season.scoutNext", { club: opponentClub.name })}</h3>
              <p className="scout-philosophy">“{opponentClub.philosophy}”</p>
              {opponentProfile !== undefined ? (
                <ul className="scout-bars">
                  {scoutAxes.map((axis) => {
                    const value = opponentProfile[axis.key] as number
                    return (
                      <li key={axis.key}>
                        <span className="scout-axis-label">{t(axis.labelKey)}</span>
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
                  {t("season.scoutReveal")}
                </RewardedAdButton>
              )}
            </div>
          ) : null}

          <h3>{t("season.records")}</h3>
          <StatLeaders
            clubs={state.clubs}
            fixtures={competition.fixtures}
            goalkeepers={goalkeepers}
            limit={7}
          />

          {competition.kind === "리그" ? (
            <>
              <h3>{t("season.fixtures", { round: currentRoundLabel })}</h3>
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

      {(() => {
        const club = lineupClubId === undefined ? undefined : clubsById.get(lineupClubId)
        const squad =
          lineupClubId === undefined || state.draft === undefined
            ? undefined
            : state.draft.squads[lineupClubId]
        if (club === undefined || squad === undefined) {
          return null
        }
        return (
          <SquadDetailModal
            club={club}
            leagueAvg={leagueAvg}
            onClose={() => setLineupClubId(undefined)}
            profile={createTeamProfile(squad, draftPool, club.tactic)}
            squad={squad}
          />
        )
      })()}
    </section>
  )
}

function CupBracket({ state }: { readonly state: GameState }) {
  const { t } = useI18n()
  const competition = state.competition
  if (competition === undefined) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const rounds = Array.from({ length: competition.totalRounds }, (_, index) => index + 1)
  return (
    <>
      <h3>{t("season.bracket")}</h3>
      <div className="cup-bracket">
        {rounds.map((round) => {
          const fixtures = getRoundFixtures(competition, round)
          return (
            <div className="cup-round" key={round}>
              <h4>{cupRoundLabel(competition, round, t)}</h4>
              <ul>
                {fixtures.length === 0 ? <li className="cup-tbd">{t("season.tbd")}</li> : null}
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
