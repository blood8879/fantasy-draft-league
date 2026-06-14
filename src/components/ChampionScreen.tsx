import { Trophy } from "lucide-react"
import { type GameAction, type GameState, cardsById } from "../app/gameStore"
import {
  buildGoalkeepers,
  computeStandings,
  getChampionId,
  getCupRoundName,
} from "../domain/competition"
import { USER_CLUB_ID } from "../domain/game"
import { StandingsTable } from "./StandingsTable"
import { StatLeaders } from "./StatLeaders"

type ChampionScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

export function ChampionScreen({ state, dispatch }: ChampionScreenProps) {
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
        <p className="eyebrow">{competition.kind === "리그" ? "리그 우승" : "컵 우승"}</p>
        <h1>{champion?.name ?? "?"}</h1>
        <p className="champion-sub">
          {userIsChampion
            ? "당신의 드래프트가 시즌을 지배했습니다. 우승을 축하합니다!"
            : `${champion?.managerName ?? ""} 감독의 ${champion?.name ?? ""}이(가) 트로피를 들어 올렸습니다. ${userSummary}`}
        </p>
      </header>

      <div className="champion-grid">
        <div className="draft-aside">
          <h3>{competition.kind === "리그" ? "최종 순위" : "토너먼트 결과"}</h3>
          {competition.kind === "리그" ? (
            <StandingsTable clubs={state.clubs} fixtures={competition.fixtures} />
          ) : (
            <ul className="result-lines">
              {competition.fixtures.map((fixture) => (
                <li key={fixture.id}>
                  <span>
                    [{getCupRoundName(competition, fixture.round)}]{" "}
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
          <h3>시즌 개인 기록</h3>
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
        새 시즌 시작하기
      </button>
    </section>
  )

  function buildUserSummary(): string {
    if (competition === undefined) {
      return ""
    }
    if (competition.kind === "리그") {
      const rank = standings.findIndex((row) => row.clubId === USER_CLUB_ID) + 1
      return rank > 0 ? `내 구단은 최종 ${rank}위로 마쳤습니다.` : ""
    }
    const lastUserFixture = [...competition.fixtures]
      .reverse()
      .find((fixture) => fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID)
    if (lastUserFixture === undefined) {
      return ""
    }
    return `내 구단은 ${getCupRoundName(competition, lastUserFixture.round)}에서 멈췄습니다.`
  }
}
