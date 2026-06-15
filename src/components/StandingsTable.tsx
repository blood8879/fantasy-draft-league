import { type Fixture, computeStandings } from "../domain/competition"
import type { Club } from "../domain/game"
import { USER_CLUB_ID } from "../domain/game"
import { useI18n } from "../i18n"

type StandingsTableProps = {
  readonly clubs: readonly Club[]
  readonly fixtures: readonly Fixture[]
}

/** 승점·승/무/패·득점·실점·득실차를 모두 보여주는 리그 순위표 */
export function StandingsTable({ clubs, fixtures }: StandingsTableProps) {
  const { t } = useI18n()
  const clubsById = new Map(clubs.map((club) => [club.id, club]))
  const standings = computeStandings(
    clubs.map((club) => club.id),
    fixtures,
  )

  return (
    <table className="league-table">
      <thead>
        <tr>
          <th scope="col">{t("st.pos")}</th>
          <th className="club-col" scope="col">
            {t("st.club")}
          </th>
          <th scope="col">{t("st.played")}</th>
          <th scope="col">{t("st.won")}</th>
          <th scope="col">{t("st.drawn")}</th>
          <th scope="col">{t("st.lost")}</th>
          <th scope="col">{t("st.gf")}</th>
          <th scope="col">{t("st.ga")}</th>
          <th scope="col">{t("st.diff")}</th>
          <th scope="col">{t("st.points")}</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((row, index) => {
          const club = clubsById.get(row.clubId)
          const diff = row.goalsFor - row.goalsAgainst
          return (
            <tr data-user={row.clubId === USER_CLUB_ID ? "true" : undefined} key={row.clubId}>
              <td>{index + 1}</td>
              <td className="club-col">
                <span className="club-swatch" style={{ background: club?.color }} />
                {club?.name ?? row.clubId}
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td className="diff-col">{diff > 0 ? `+${diff}` : diff}</td>
              <td className="points-col">{row.points}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
