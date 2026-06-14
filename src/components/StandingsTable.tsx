import { type Fixture, computeStandings } from "../domain/competition"
import type { Club } from "../domain/game"
import { USER_CLUB_ID } from "../domain/game"

type StandingsTableProps = {
  readonly clubs: readonly Club[]
  readonly fixtures: readonly Fixture[]
}

/** 승점·승/무/패·득점·실점·득실차를 모두 보여주는 리그 순위표 */
export function StandingsTable({ clubs, fixtures }: StandingsTableProps) {
  const clubsById = new Map(clubs.map((club) => [club.id, club]))
  const standings = computeStandings(
    clubs.map((club) => club.id),
    fixtures,
  )

  return (
    <table className="league-table">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th className="club-col" scope="col">
            구단
          </th>
          <th scope="col" title="경기">
            경기
          </th>
          <th scope="col" title="승">
            승
          </th>
          <th scope="col" title="무">
            무
          </th>
          <th scope="col" title="패">
            패
          </th>
          <th scope="col" title="득점">
            득
          </th>
          <th scope="col" title="실점">
            실
          </th>
          <th scope="col" title="득실차">
            +/-
          </th>
          <th scope="col" title="승점">
            승점
          </th>
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
