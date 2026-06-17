import type { DraftState } from "../domain/draft"
import type { Club } from "../domain/game"
import { useI18n } from "../i18n"
import type { TeamProfile } from "../simulation/types"
import { RadarChart } from "./RadarChart"
import { SquadPitch } from "./SquadPitch"
import { TeamStatBars } from "./TeamStatBars"

type SquadDetailModalProps = {
  readonly club: Club
  readonly squad: DraftState
  readonly profile: TeamProfile
  readonly leagueAvg?: TeamProfile | undefined
  readonly onClose: () => void
}

/** 한 구단의 라인업(피치) + 능력치 그래프(육각 레이더 + 막대)를 함께 보여주는 모달. */
export function SquadDetailModal({
  club,
  squad,
  profile,
  leagueAvg,
  onClose,
}: SquadDetailModalProps) {
  const { t } = useI18n()
  return (
    <div
      className="pitch-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose()
        }
      }}
      role="presentation"
    >
      <div className="pitch-modal">
        <button className="pitch-modal-close" onClick={onClose} type="button">
          {t("common.close")}
        </button>
        <SquadPitch club={club} squad={squad} />
        <div className="team-strength">
          <h3 className="team-strength-title">{t("radar.title")}</h3>
          <RadarChart average={leagueAvg} team={profile} />
          <div className="radar-legend">
            <span className="radar-legend-item radar-legend-item--team">{club.name}</span>
            {leagueAvg === undefined ? null : (
              <span className="radar-legend-item radar-legend-item--avg">
                {t("radar.leagueAvg")}
              </span>
            )}
          </div>
          <TeamStatBars average={leagueAvg} team={profile} />
        </div>
      </div>
    </div>
  )
}
