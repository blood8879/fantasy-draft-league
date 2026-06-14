import { useAds } from "../ads/useAds"
import type { GameAction, GameState } from "../app/gameStore"
import { type Fixture, getCupRoundName, isCompetitionFinished } from "../domain/competition"
import { USER_CLUB_ID } from "../domain/game"
import { describeMatchForClub, getFixtureWinnerId } from "../simulation/fixture"
import { RewardedAdButton } from "./RewardedAdButton"

type MatchReportProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

/** 전면 광고를 끼울 라운드 간격 (3라운드마다 1회). */
const INTERSTITIAL_EVERY = 3

export function MatchReport({ state, dispatch }: MatchReportProps) {
  const { showInterstitial } = useAds()
  const competition = state.competition
  if (competition === undefined || state.lastPlayedFixtures.length === 0) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const playedRound = state.lastPlayedFixtures[0]?.round ?? 1
  const roundLabel =
    competition.kind === "리그" ? `${playedRound}라운드` : getCupRoundName(competition, playedRound)
  const userFixture = state.lastPlayedFixtures.find(
    (fixture) => fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID,
  )
  const otherFixtures = state.lastPlayedFixtures.filter((fixture) => fixture !== userFixture)
  const finished = isCompetitionFinished(competition)

  const userWon =
    userFixture?.result !== undefined &&
    getFixtureWinnerId(userFixture.result, userFixture.homeId, userFixture.awayId) === USER_CLUB_ID
  const canReplay =
    state.replayCheckpoint !== undefined && userFixture?.result !== undefined && !userWon

  async function handleContinue() {
    if (!finished && playedRound % INTERSTITIAL_EVERY === 0) {
      await showInterstitial()
    }
    dispatch({ type: "CLOSE_REPORT" })
  }

  return (
    <section className="match-report">
      <header>
        <p className="eyebrow">{roundLabel} 결과</p>
        <h2>{userFixture === undefined ? "이번 라운드 결과" : headline(userFixture)}</h2>
      </header>

      {userFixture?.result !== undefined ? (
        <UserMatchCard fixture={userFixture} state={state} />
      ) : null}

      <div className="draft-aside other-results">
        <h3>{userFixture === undefined ? "경기 결과" : "다른 경기"}</h3>
        <ul className="result-lines">
          {(userFixture === undefined ? state.lastPlayedFixtures : otherFixtures).map((fixture) => (
            <li key={fixture.id}>
              <span>{clubsById.get(fixture.homeId)?.name}</span>
              <strong>
                {fixture.result?.homeGoals} : {fixture.result?.awayGoals}
                {fixture.result?.shootout !== undefined
                  ? ` (승부차기 ${fixture.result.shootout.home}-${fixture.result.shootout.away})`
                  : ""}
              </strong>
              <span>{clubsById.get(fixture.awayId)?.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="report-actions">
        {canReplay ? (
          <RewardedAdButton
            action="replay_match"
            onReward={() => dispatch({ type: "REPLAY_ROUND" })}
          >
            재경기 도전
          </RewardedAdButton>
        ) : null}
        <button
          className="primary-action primary-action--bright"
          onClick={handleContinue}
          type="button"
        >
          {finished ? "시즌 결산 보기" : "계속 진행"}
        </button>
      </div>
    </section>
  )

  function headline(fixture: Fixture): string {
    const result = fixture.result
    if (result === undefined) {
      return "경기 결과"
    }
    const isHome = fixture.homeId === USER_CLUB_ID
    const myGoals = isHome ? result.homeGoals : result.awayGoals
    const theirGoals = isHome ? result.awayGoals : result.homeGoals
    if (result.shootout !== undefined) {
      return result.shootout.winnerClubId === USER_CLUB_ID
        ? "승부차기 끝에 승리!"
        : "승부차기 패배…"
    }
    if (myGoals > theirGoals) {
      return "승리!"
    }
    if (myGoals < theirGoals) {
      return "패배…"
    }
    return "무승부"
  }
}

function UserMatchCard({
  fixture,
  state,
}: {
  readonly fixture: Fixture
  readonly state: GameState
}) {
  const result = fixture.result
  if (result === undefined) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const isHome = fixture.homeId === USER_CLUB_ID
  const notes = describeMatchForClub(result, isHome)

  return (
    <div className="draft-aside user-match-card">
      <div className="scoreboard">
        <span className="scoreboard-club" data-user={isHome ? "true" : undefined}>
          {clubsById.get(fixture.homeId)?.name}
        </span>
        <span className="scoreboard-score">
          {result.homeGoals} : {result.awayGoals}
        </span>
        <span className="scoreboard-club" data-user={isHome ? undefined : "true"}>
          {clubsById.get(fixture.awayId)?.name}
        </span>
      </div>
      {result.shootout !== undefined ? (
        <p className="shootout-line">
          승부차기 {result.shootout.home} - {result.shootout.away}
        </p>
      ) : null}
      <p className="xg-line">
        xG {result.homeXg} : {result.awayXg}
      </p>
      <div className="scorer-columns">
        <ul>
          {result.homeScorers.map((scorer) => (
            <li key={scorer.cardId}>
              ⚽ {scorer.label}
              {scorer.count > 1 ? ` ×${scorer.count}` : ""}
            </li>
          ))}
        </ul>
        <ul className="scorer-away">
          {result.awayScorers.map((scorer) => (
            <li key={scorer.cardId}>
              ⚽ {scorer.label}
              {scorer.count > 1 ? ` ×${scorer.count}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <ul className="match-notes">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  )
}
