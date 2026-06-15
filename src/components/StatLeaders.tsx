import { useState } from "react"
import {
  type Fixture,
  type GoalkeeperRef,
  computeCleanSheets,
  computeTopAssisters,
  computeTopScorers,
} from "../domain/competition"
import type { Club } from "../domain/game"
import { useI18n } from "../i18n"

type StatLeadersProps = {
  readonly clubs: readonly Club[]
  readonly fixtures: readonly Fixture[]
  readonly goalkeepers: ReadonlyMap<string, GoalkeeperRef>
  readonly limit?: number
}

type Tab = "scorers" | "assists" | "cleansheets"

const tabs: readonly { id: Tab; labelKey: string; unitKey: string; crown: string }[] = [
  { id: "scorers", labelKey: "stat.scorers", unitKey: "stat.unit.goals", crown: "👑" },
  { id: "assists", labelKey: "stat.assists", unitKey: "stat.unit.assists", crown: "🅰️" },
  {
    id: "cleansheets",
    labelKey: "stat.cleansheets",
    unitKey: "stat.unit.cleansheets",
    crown: "🧤",
  },
]

export function StatLeaders({ clubs, fixtures, goalkeepers, limit = 10 }: StatLeadersProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>("scorers")
  const clubsById = new Map(clubs.map((club) => [club.id, club]))

  const rows =
    tab === "scorers"
      ? computeTopScorers(fixtures, limit)
      : tab === "assists"
        ? computeTopAssisters(fixtures, limit)
        : computeCleanSheets(fixtures, goalkeepers, limit)
  const active = tabs.find((candidate) => candidate.id === tab)
  const unit = active === undefined ? "" : t(active.unitKey)
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
            {t(candidate.labelKey)}
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
        {rows.length === 0 ? <li className="pick-log-empty">{t("stat.empty")}</li> : null}
      </ol>
    </div>
  )
}
