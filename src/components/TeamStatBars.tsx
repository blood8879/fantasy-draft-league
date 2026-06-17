import { useI18n } from "../i18n"
import type { TeamProfile } from "../simulation/types"

type TeamStatBarsProps = {
  readonly team: TeamProfile
  readonly average?: TeamProfile | undefined
}

const BAR_AXES: readonly { readonly key: keyof TeamProfile; readonly labelKey: string }[] = [
  { key: "attack", labelKey: "axis.attack" },
  { key: "chanceCreation", labelKey: "axis.chanceCreation" },
  { key: "midfieldControl", labelKey: "axis.midfieldControl" },
  { key: "pressResistance", labelKey: "axis.pressResistance" },
  { key: "transition", labelKey: "axis.transition" },
  { key: "defensiveStability", labelKey: "axis.defensiveStability" },
  { key: "chemistry", labelKey: "chem.title" },
]

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/** 팀 능력치를 막대(progress)로 표시하고 리그 평균을 마커로 겹쳐 비교한다. */
export function TeamStatBars({ team, average }: TeamStatBarsProps) {
  const { t } = useI18n()
  return (
    <div className="stat-bars">
      {BAR_AXES.map((axis) => {
        const value = team[axis.key] as number
        const avg = average === undefined ? undefined : (average[axis.key] as number)
        return (
          <div className="stat-bar-row" key={axis.key}>
            <span className="stat-bar-label">{t(axis.labelKey)}</span>
            <span className="stat-bar-track">
              <span className="stat-bar-fill" style={{ width: `${clampPct(value)}%` }} />
              {avg === undefined ? null : (
                <span
                  aria-hidden="true"
                  className="stat-bar-avg"
                  style={{ left: `${clampPct(avg)}%` }}
                />
              )}
            </span>
            <span className="stat-bar-value">{Math.round(value)}</span>
          </div>
        )
      })}
    </div>
  )
}
