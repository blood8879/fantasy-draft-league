import { useState } from "react"
import {
  type Fixture,
  type GoalkeeperRef,
  computeCleanSheets,
  computeTopAssisters,
  computeTopScorers,
} from "../domain/competition"
import type { Club } from "../domain/game"

type StatLeadersProps = {
  readonly clubs: readonly Club[]
  readonly fixtures: readonly Fixture[]
  readonly goalkeepers: ReadonlyMap<string, GoalkeeperRef>
  readonly limit?: number
}

type Tab = "scorers" | "assists" | "cleansheets"

const tabs: readonly { id: Tab; label: string; unit: string; crown: string }[] = [
  { id: "scorers", label: "득점왕", unit: "골", crown: "👑" },
  { id: "assists", label: "도움왕", unit: "도움", crown: "🅰️" },
  { id: "cleansheets", label: "클린시트", unit: "회", crown: "🧤" },
]

export function StatLeaders({ clubs, fixtures, goalkeepers, limit = 10 }: StatLeadersProps) {
  const [tab, setTab] = useState<Tab>("scorers")
  const clubsById = new Map(clubs.map((club) => [club.id, club]))

  const rows =
    tab === "scorers"
      ? computeTopScorers(fixtures, limit)
      : tab === "assists"
        ? computeTopAssisters(fixtures, limit)
        : computeCleanSheets(fixtures, goalkeepers, limit)
  const active = tabs.find((candidate) => candidate.id === tab)
  const unit = active?.unit ?? ""
  const crown = active?.crown ?? "👑"

  return (
    <div className="stat-leaders">
      <div className="stat-tabs" role="tablist">
        {tabs.map((candidate) => (
          <button
            aria-selected={tab === candidate.id}
            className="stat-tab"
            key={candidate.id}
            onClick={() => setTab(candidate.id)}
            role="tab"
            type="button"
          >
            {candidate.label}
          </button>
        ))}
      </div>
      <ol className="stat-list">
        {rows.map((row, index) => (
          <li className={index === 0 ? "stat-row stat-row--leader" : "stat-row"} key={row.cardId}>
            <span className="stat-rank">{index === 0 ? crown : index + 1}</span>
            <span className="stat-name">{row.label}</span>
            <span className="stat-club">{clubsById.get(row.clubId)?.name ?? ""}</span>
            <span className="stat-value">
              {row.value}
              {unit}
            </span>
          </li>
        ))}
        {rows.length === 0 ? <li className="pick-log-empty">아직 기록이 없습니다</li> : null}
      </ol>
    </div>
  )
}
