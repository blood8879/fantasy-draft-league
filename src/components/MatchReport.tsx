import { useEffect, useMemo, useRef, useState } from "react"
import { useAds } from "../ads/useAds"
import type { GameAction, GameState } from "../app/gameStore"
import { type Fixture, getCupRoundName, isCompetitionFinished } from "../domain/competition"
import { type Club, USER_CLUB_ID } from "../domain/game"
import { getFixtureWinnerId } from "../simulation/fixture"

type MatchReportProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

/** 전면 광고를 끼울 라운드 간격 (3라운드마다 1회). */
const INTERSTITIAL_EVERY = 3
/** 90분을 실제 몇 초에 보여줄지 (관전 속도) */
const MATCH_DURATION_MS = 9000
const FULL_TIME = 90

export function MatchReport({ state, dispatch }: MatchReportProps) {
  const { showInterstitial } = useAds()
  const competition = state.competition
  const userFixture = state.lastPlayedFixtures.find(
    (fixture) => fixture.homeId === USER_CLUB_ID || fixture.awayId === USER_CLUB_ID,
  )

  if (competition === undefined || state.lastPlayedFixtures.length === 0) {
    return null
  }
  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const playedRound = state.lastPlayedFixtures[0]?.round ?? 1
  const roundLabel =
    competition.kind === "리그" ? `${playedRound}라운드` : getCupRoundName(competition, playedRound)
  const otherFixtures = state.lastPlayedFixtures.filter((fixture) => fixture !== userFixture)
  const finished = isCompetitionFinished(competition)

  async function handleContinue() {
    if (!finished && playedRound % INTERSTITIAL_EVERY === 0) {
      await showInterstitial()
    }
    dispatch({ type: "CLOSE_REPORT" })
  }

  // 유저 경기가 있으면 라이브 관전, 없으면(부전승 등) 라운드 결과만 보여준다.
  if (userFixture?.result === undefined) {
    return (
      <section className="match-report">
        <header>
          <p className="eyebrow">{roundLabel} 결과</p>
          <h2>이번 라운드 결과</h2>
        </header>
        <OtherResults clubsById={clubsById} fixtures={state.lastPlayedFixtures} title="경기 결과" />
        <button
          className="primary-action primary-action--bright"
          onClick={handleContinue}
          type="button"
        >
          {finished ? "시즌 결산 보기" : "계속 진행"}
        </button>
      </section>
    )
  }

  return (
    <LiveMatch
      clubsById={clubsById}
      finished={finished}
      fixture={userFixture}
      onContinue={handleContinue}
      onReplay={
        state.replayCheckpoint !== undefined ? () => dispatch({ type: "REPLAY_ROUND" }) : undefined
      }
      otherFixtures={otherFixtures}
      roundLabel={roundLabel}
    />
  )
}

function LiveMatch({
  fixture,
  clubsById,
  otherFixtures,
  roundLabel,
  finished,
  onContinue,
  onReplay,
}: {
  readonly fixture: Fixture
  readonly clubsById: Map<string, Club>
  readonly otherFixtures: readonly Fixture[]
  readonly roundLabel: string
  readonly finished: boolean
  readonly onContinue: () => void
  readonly onReplay: (() => void) | undefined
}) {
  const result = fixture.result
  const [minute, setMinute] = useState(0)
  const [flash, setFlash] = useState<"home" | "away" | undefined>(undefined)
  const startRef = useRef<number | undefined>(undefined)
  const doneRef = useRef(false)

  const events = useMemo(() => result?.events ?? [], [result])
  const isComplete = minute >= FULL_TIME

  // 경기 시계: requestAnimationFrame으로 0' → 90' 진행 (건너뛰면 doneRef로 즉시 중단)
  useEffect(() => {
    let raf = 0
    function tick(now: number) {
      if (doneRef.current) {
        return
      }
      if (startRef.current === undefined) {
        startRef.current = now
      }
      const elapsed = now - startRef.current
      const next = Math.min(FULL_TIME, Math.round((elapsed / MATCH_DURATION_MS) * FULL_TIME))
      setMinute(next)
      if (next < FULL_TIME) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // 골이 터지는 분에 스코어보드를 번쩍이게 한다
  const shownEvents = events.filter((event) => event.minute <= minute)
  const latestMinute = shownEvents.at(-1)?.minute
  useEffect(() => {
    const justScored = events.filter((event) => event.minute === latestMinute)
    const side = justScored.at(-1)?.side
    if (side === undefined || latestMinute === undefined) {
      return undefined
    }
    setFlash(side)
    const timer = setTimeout(() => setFlash(undefined), 700)
    return () => clearTimeout(timer)
  }, [latestMinute, events])

  if (result === undefined) {
    return null
  }
  const homeName = clubsById.get(fixture.homeId)?.name ?? fixture.homeId
  const awayName = clubsById.get(fixture.awayId)?.name ?? fixture.awayId
  const homeScore = shownEvents.filter((event) => event.side === "home").length
  const awayScore = shownEvents.filter((event) => event.side === "away").length
  const userIsHome = fixture.homeId === USER_CLUB_ID

  function skip() {
    doneRef.current = true
    setMinute(FULL_TIME)
  }

  return (
    <section className="live-match">
      <header className="live-head">
        <p className="eyebrow">{roundLabel} · 라이브</p>
      </header>

      <div className={`live-board${flash !== undefined ? ` live-board--flash-${flash}` : ""}`}>
        <div className="live-team live-team--home" data-user={userIsHome ? "true" : undefined}>
          <span
            className="live-team-swatch"
            style={{ background: clubsById.get(fixture.homeId)?.color }}
          />
          <span className="live-team-name">{homeName}</span>
        </div>
        <div className="live-score-wrap">
          <span className="live-score">
            {homeScore} : {awayScore}
          </span>
          <span className="live-clock">{isComplete ? "FT" : `${minute}'`}</span>
        </div>
        <div className="live-team live-team--away" data-user={userIsHome ? undefined : "true"}>
          <span
            className="live-team-swatch"
            style={{ background: clubsById.get(fixture.awayId)?.color }}
          />
          <span className="live-team-name">{awayName}</span>
        </div>
      </div>

      <div className="live-progress">
        <span className="live-progress-fill" style={{ width: `${(minute / FULL_TIME) * 100}%` }} />
      </div>

      <div className="live-timeline">
        {shownEvents.length === 0 ? (
          <p className="live-timeline-empty">
            {isComplete ? "골 없이 끝난 경기" : "킥오프! 경기가 진행 중입니다…"}
          </p>
        ) : (
          <ul>
            {shownEvents.map((event, index) => (
              <li
                className={
                  event.side === "home"
                    ? "live-event live-event--home"
                    : "live-event live-event--away"
                }
                key={`${event.minute}-${event.cardId}-${index}`}
              >
                <span className="live-event-min">{event.minute}'</span>
                <span className="live-event-icon">⚽</span>
                <span className="live-event-text">
                  {event.label}
                  {event.assistLabel !== undefined ? (
                    <span className="live-event-assist"> (도움 {event.assistLabel})</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isComplete && result.shootout !== undefined ? (
        <p className="live-shootout">
          승부차기 {result.shootout.home} - {result.shootout.away} ·{" "}
          {getFixtureWinnerId(result, fixture.homeId, fixture.awayId) === USER_CLUB_ID
            ? "승리"
            : "패배"}
        </p>
      ) : null}

      {!isComplete ? (
        <button className="ghost-action" onClick={skip} type="button">
          건너뛰기 ⏭
        </button>
      ) : (
        <div className="live-fulltime">
          <p className="live-result-line">{resultHeadline(result, userIsHome)}</p>
          {otherFixtures.length > 0 ? (
            <OtherResults clubsById={clubsById} fixtures={otherFixtures} title="다른 경기" />
          ) : null}
          <div className="report-actions">
            {onReplay !== undefined && !didUserWin(result, userIsHome) ? (
              <button className="rewarded-ad-button" onClick={onReplay} type="button">
                재경기 도전
              </button>
            ) : null}
            <button
              className="primary-action primary-action--bright"
              onClick={onContinue}
              type="button"
            >
              {finished ? "시즌 결산 보기" : "계속 진행"}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function OtherResults({
  fixtures,
  clubsById,
  title,
}: {
  readonly fixtures: readonly Fixture[]
  readonly clubsById: Map<string, Club>
  readonly title: string
}) {
  return (
    <div className="draft-aside other-results">
      <h3>{title}</h3>
      <ul className="result-lines">
        {fixtures.map((fixture) => (
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
  )
}

function didUserWin(result: NonNullable<Fixture["result"]>, userIsHome: boolean): boolean {
  if (result.shootout !== undefined) {
    return result.shootout.winnerClubId === USER_CLUB_ID
  }
  const myGoals = userIsHome ? result.homeGoals : result.awayGoals
  const theirGoals = userIsHome ? result.awayGoals : result.homeGoals
  return myGoals > theirGoals
}

function resultHeadline(result: NonNullable<Fixture["result"]>, userIsHome: boolean): string {
  const myGoals = userIsHome ? result.homeGoals : result.awayGoals
  const theirGoals = userIsHome ? result.awayGoals : result.homeGoals
  if (result.shootout !== undefined) {
    return result.shootout.winnerClubId === USER_CLUB_ID ? "승부차기 끝에 승리!" : "승부차기 패배…"
  }
  if (myGoals > theirGoals) {
    return "승리!"
  }
  if (myGoals < theirGoals) {
    return "패배…"
  }
  return "무승부"
}
