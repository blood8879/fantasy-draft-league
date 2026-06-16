import { useI18n } from "../i18n"
import type { TeamProfile } from "../simulation/types"

type RadarChartProps = {
  readonly team: TeamProfile
  /** 비교 기준선(리그 평균). 없으면 우리 팀만 그린다. */
  readonly average?: TeamProfile | undefined
}

const AXES: readonly { readonly key: keyof TeamProfile; readonly labelKey: string }[] = [
  { key: "attack", labelKey: "axis.attack" },
  { key: "chanceCreation", labelKey: "axis.chanceCreation" },
  { key: "transition", labelKey: "axis.transition" },
  { key: "defensiveStability", labelKey: "axis.defensiveStability" },
  { key: "pressResistance", labelKey: "axis.pressResistance" },
  { key: "midfieldControl", labelKey: "axis.midfieldControl" },
]

const SIZE = 230
const CX = SIZE / 2
const CY = SIZE / 2
const MAX_R = 78

function clamp01(value: number): number {
  return Math.max(0, Math.min(100, value)) / 100
}

function pointAt(index: number, ratio: number): readonly [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES.length
  const r = MAX_R * ratio
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

function polygon(values: readonly number[]): string {
  return values
    .map((value, index) => {
      const [x, y] = pointAt(index, clamp01(value))
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

/** 위닝일레븐식 육각 레이더. 우리 팀(채움)과 리그 평균(점선)을 겹쳐 비교한다. */
export function RadarChart({ team, average }: RadarChartProps) {
  const { t } = useI18n()
  const teamValues = AXES.map((axis) => team[axis.key] as number)
  const avgValues =
    average === undefined ? undefined : AXES.map((axis) => average[axis.key] as number)

  return (
    <svg
      className="radar-chart"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={t("radar.title")}
    >
      <title>{t("radar.title")}</title>
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          className="radar-grid"
          key={ring}
          points={AXES.map((_, index) => {
            const [x, y] = pointAt(index, ring)
            return `${x.toFixed(1)},${y.toFixed(1)}`
          }).join(" ")}
        />
      ))}
      {AXES.map((axis, index) => {
        const [x, y] = pointAt(index, 1)
        return <line className="radar-spoke" key={axis.key} x1={CX} y1={CY} x2={x} y2={y} />
      })}
      {avgValues !== undefined ? (
        <polygon className="radar-area radar-area--avg" points={polygon(avgValues)} />
      ) : null}
      <polygon className="radar-area radar-area--team" points={polygon(teamValues)} />
      {AXES.map((axis, index) => {
        const [x, y] = pointAt(index, 1.16)
        return (
          <text
            className="radar-label"
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {t(axis.labelKey)}
          </text>
        )
      })}
    </svg>
  )
}
