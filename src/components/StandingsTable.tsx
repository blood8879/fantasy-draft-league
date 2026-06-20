import type { CSSProperties } from "react"
import { type Fixture, computeStandings } from "../domain/competition"
import type { Club } from "../domain/game"
import { USER_CLUB_ID } from "../domain/game"
import { useI18n } from "../i18n"
import { getFixtureWinnerId } from "../simulation/fixture"

type StandingsTableProps = {
  readonly clubs: readonly Club[]
  readonly fixtures: readonly Fixture[]
  /** 주어지면 구단명을 클릭해 스쿼드를 열 수 있다. */
  readonly onSelectClub?: (clubId: string) => void
}

type FormResult = "W" | "D" | "L"

/** 한 구단의 최근 3경기 폼(최신이 오른쪽). */
function recentForm(fixtures: readonly Fixture[], clubId: string): readonly FormResult[] {
  const played = fixtures
    .filter((fixture) => fixture.result !== undefined)
    .filter((fixture) => fixture.homeId === clubId || fixture.awayId === clubId)
    .slice()
    .sort((left, right) => left.round - right.round)
    .slice(-3)
  return played.map((fixture) => {
    if (fixture.result === undefined) {
      return "D"
    }
    const winner = getFixtureWinnerId(fixture.result, fixture.homeId, fixture.awayId)
    if (winner === undefined) {
      return "D"
    }
    return winner === clubId ? "W" : "L"
  })
}

/** 승점·폼·승점 비례 컬러바를 보여주는 리그 순위표 */
export function StandingsTable({ clubs, fixtures, onSelectClub }: StandingsTableProps) {
  const { t } = useI18n()
  const clubsById = new Map(clubs.map((club) => [club.id, club]))
  const standings = computeStandings(
    clubs.map((club) => club.id),
    fixtures,
  )
  const maxPoints = Math.max(1, ...standings.map((row) => row.points))

  return (
    <div className="standings">
      <div className="standings-head">
        <span>{t("st.pos")}</span>
        <span>{t("st.club")}</span>
        <span>{t("st.played")}</span>
        <span>{t("st.points")}</span>
        <span>{t("season.form")}</span>
      </div>
      {standings.map((row, index) => {
        const club = clubsById.get(row.clubId)
        const rank = index + 1
        const form = recentForm(fixtures, row.clubId)
        const barStyle = {
          width: `${(row.points / maxPoints) * 100}%`,
          "--clr": club?.color ?? "#7c9d88",
        } as CSSProperties
        return (
          <div
            className="standings-row"
            data-user={row.clubId === USER_CLUB_ID ? "true" : undefined}
            key={row.clubId}
          >
            <span aria-hidden="true" className="standings-bar" style={barStyle} />
            <span className="standings-rank" data-top={rank <= 4 ? "true" : undefined}>
              {rank}
            </span>
            <span className="standings-club">
              <span className="club-swatch" style={{ background: club?.color }} />
              {onSelectClub === undefined ? (
                <span className="standings-club-name">{club?.name ?? row.clubId}</span>
              ) : (
                <button
                  className="club-link standings-club-name"
                  onClick={() => onSelectClub(row.clubId)}
                  type="button"
                >
                  {club?.name ?? row.clubId}
                </button>
              )}
            </span>
            <span className="standings-played">{row.played}</span>
            <span className="standings-pts">{row.points}</span>
            <span className="standings-form">
              {form.map((result, formIndex) => (
                <span
                  className="form-badge"
                  data-r={result}
                  // biome-ignore lint/suspicious/noArrayIndexKey: 폼은 순서 자체가 의미
                  key={formIndex}
                >
                  {result}
                </span>
              ))}
            </span>
          </div>
        )
      })}
    </div>
  )
}
