import { Trophy } from "lucide-react"
import { useState } from "react"
import { type GameAction, type GameState, cardsById, draftPool } from "../app/gameStore"
import { computeUserAchievements } from "../domain/achievements"
import { buildGoalkeepers, computeStandings, getChampionId } from "../domain/competition"
import { USER_CLUB_ID } from "../domain/game"
import { useI18n } from "../i18n"
import { createTeamProfile } from "../simulation/teamProfile"
import { ShareResultButton } from "./ShareResultButton"
import { SquadPitch } from "./SquadPitch"
import { StandingsTable } from "./StandingsTable"
import { StatLeaders } from "./StatLeaders"
import { cupRoundLabel, ordinal } from "./labels"

type ChampionScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

export function ChampionScreen({ state, dispatch }: ChampionScreenProps) {
  const { t, locale } = useI18n()
  const [scoutClubId, setScoutClubId] = useState<string | undefined>(undefined)
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

  // 공유 카드용 데이터(내 구단 베스트 XI + 성적 요약).
  const userClub = clubsById.get(USER_CLUB_ID)
  const userSquad = state.draft?.squads[USER_CLUB_ID]
  const userRank = standings.findIndex((row) => row.clubId === USER_CLUB_ID) + 1
  const shareBadge = userIsChampion
    ? t("share.champions")
    : competition.kind === "리그" && userRank > 0
      ? ordinal(userRank, locale)
      : t("share.knockedOut")
  const shareSubtitle = userIsChampion ? t("share.subWin") : userSummary
  const userPicks = userSquad?.picks ?? []
  const shareAvgOvr =
    userPicks.length > 0
      ? Math.round(
          userPicks.reduce((sum, pick) => sum + (cardsById.get(pick.cardId)?.cost ?? 0), 0) /
            userPicks.length,
        )
      : 0
  const userProfile =
    userSquad !== undefined && userClub !== undefined
      ? createTeamProfile(userSquad, draftPool, userClub.tactic)
      : undefined
  const userRow = standings.find((row) => row.clubId === USER_CLUB_ID)
  const statsLine =
    competition.kind === "리그" && userRow !== undefined && userRank > 0
      ? t("share.recordLeague", {
          rank: ordinal(userRank, locale),
          w: userRow.won,
          d: userRow.drawn,
          l: userRow.lost,
          gf: userRow.goalsFor,
          ga: userRow.goalsAgainst,
        })
      : undefined
  const achievements = computeUserAchievements(
    competition,
    state.clubs.map((club) => club.id),
    USER_CLUB_ID,
  )

  const scoutClub = scoutClubId === undefined ? undefined : clubsById.get(scoutClubId)
  const scoutSquad =
    scoutClubId === undefined || state.draft === undefined
      ? undefined
      : state.draft.squads[scoutClubId]

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

      {achievements.length > 0 ? (
        <div className="achievements-strip">
          <h3>{t("ach.title")}</h3>
          <ul className="achievement-list">
            {achievements.map((achievement) => (
              <li className="achievement-badge" data-tier={achievement.tier} key={achievement.id}>
                {t(achievement.nameKey)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="champion-grid">
        <div className="draft-aside">
          <h3>
            {competition.kind === "리그"
              ? t("champion.finalStandings")
              : t("champion.tournamentResult")}
          </h3>
          {competition.kind === "리그" ? (
            <StandingsTable
              clubs={state.clubs}
              fixtures={competition.fixtures}
              onSelectClub={setScoutClubId}
            />
          ) : (
            <ul className="result-lines">
              {competition.fixtures.map((fixture) => (
                <li key={fixture.id}>
                  <span>
                    [{cupRoundLabel(competition, fixture.round, t)}]{" "}
                    <button
                      className="club-link"
                      onClick={() => setScoutClubId(fixture.homeId)}
                      type="button"
                    >
                      {clubsById.get(fixture.homeId)?.name}
                    </button>
                  </span>
                  <strong>
                    {fixture.result?.homeGoals} : {fixture.result?.awayGoals}
                  </strong>
                  <button
                    className="club-link"
                    onClick={() => setScoutClubId(fixture.awayId)}
                    type="button"
                  >
                    {clubsById.get(fixture.awayId)?.name}
                  </button>
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

      {userClub !== undefined && userSquad !== undefined && userProfile !== undefined ? (
        <ShareResultButton
          achievements={achievements.map((achievement) => t(achievement.nameKey))}
          avgOvr={shareAvgOvr}
          badge={shareBadge}
          cards={cardsById}
          club={userClub}
          profile={userProfile}
          squad={userSquad}
          statsLine={statsLine}
          subtitle={shareSubtitle}
        />
      ) : null}

      <button
        className="primary-action"
        onClick={() => dispatch({ type: "NEW_GAME" })}
        type="button"
      >
        {t("champion.newSeason")}
      </button>

      {scoutClub !== undefined && scoutSquad !== undefined ? (
        <div
          className="pitch-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setScoutClubId(undefined)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setScoutClubId(undefined)
            }
          }}
          role="presentation"
        >
          <div className="pitch-modal">
            <button
              className="pitch-modal-close"
              onClick={() => setScoutClubId(undefined)}
              type="button"
            >
              {t("common.close")}
            </button>
            <SquadPitch club={scoutClub} squad={scoutSquad} />
          </div>
        </div>
      ) : null}
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
