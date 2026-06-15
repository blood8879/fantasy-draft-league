import { Trophy } from "lucide-react"
import { type GameAction, type GameState, cardsById } from "../app/gameStore"
import { buildGoalkeepers, computeStandings, getChampionId } from "../domain/competition"
import { USER_CLUB_ID } from "../domain/game"
import { useI18n } from "../i18n"
import { StandingsTable } from "./StandingsTable"
import { StatLeaders } from "./StatLeaders"
import { cupRoundLabel, ordinal } from "./labels"

type ChampionScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

export function ChampionScreen({ state, dispatch }: ChampionScreenProps) {
  const { t, locale } = useI18n()
  const competition = state.competition
  if (competition === undefined) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const championId = getChampionId(
    competition,
    state.clubs.map((club) => club.id),
  )
  const champion = championId === undefined ? undefined : clubsById.get(championId)
  const userIsChampion = championId === USER_CLUB_ID
  const standings = computeStandings(
    state.clubs.map((club) => club.id),
    competition.fixtures,
  )
  const goalkeepers =
    state.draft === undefined ? new Map() : buildGoalkeepers(state.draft.squads, cardsById)
  const userSummary = buildUserSummary()

  return (
    <section className="champion-screen">
      <header className="champion-hero" data-user-champion={userIsChampion ? "true" : undefined}>
        <Trophy aria-hidden="true" size={44} />
        <p className="eyebrow">
          {competition.kind === "리그" ? t("champion.leagueWin") : t("champion.cupWin")}
        </p>
        <h1>{champion?.name ?? "?"}</h1>
        <p className="champion-sub">
          {userIsChampion
            ? t("champion.youWin")
            : t("champion.otherWin", {
                manager: champion?.managerName ?? "",
                club: champion?.name ?? "",
                summary: userSummary,
              })}
        </p>
      </header>

      <div className="champion-grid">
        <div className="draft-aside">
          <h3>
            {competition.kind === "리그"
              ? t("champion.finalStandings")
              : t("champion.tournamentResult")}
          </h3>
          {competition.kind === "리그" ? (
            <StandingsTable clubs={state.clubs} fixtures={competition.fixtures} />
          ) : (
            <ul className="result-lines">
              {competition.fixtures.map((fixture) => (
                <li key={fixture.id}>
                  <span>
                    [{cupRoundLabel(competition, fixture.round, t)}]{" "}
                    {clubsById.get(fixture.homeId)?.name}
                  </span>
                  <strong>
                    {fixture.result?.homeGoals} : {fixture.result?.awayGoals}
                  </strong>
                  <span>{clubsById.get(fixture.awayId)?.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="draft-aside">
          <h3>{t("champion.records")}</h3>
          <StatLeaders
            clubs={state.clubs}
            fixtures={competition.fixtures}
            goalkeepers={goalkeepers}
            limit={10}
          />
        </div>
      </div>

      <button
        className="primary-action"
        onClick={() => dispatch({ type: "NEW_GAME" })}
        type="button"
      >
        {t("champion.newSeason")}
      </button>
    </section>
  )

  function buildUserSummary(): string {
    if (competition === undefined) {
      return ""
    }
    if (competition.kind === "리그") {
      const rank = standings.findIndex((row) => row.clubId === USER_CLUB_ID) + 1
      return rank > 0 ? t("champion.userRankLeague", { rank: ordinal(rank, locale) }) : ""
    }
    const lastUserFixture = [...competition.fixtures]
      .reverse()
      .find((fixture) => fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID)
    if (lastUserFixture === undefined) {
      return ""
    }
    return t("champion.userRankCup", {
      round: cupRoundLabel(competition, lastUserFixture.round, t),
    })
  }
}
