import { cardsById } from "../app/gameStore"
import { tacticLabel } from "../components/labels"
import { type DraftState, getSlotForFormation } from "../domain/draft"
import { formationRows } from "../domain/formations"
import type { Club } from "../domain/game"
import { useI18n } from "../i18n"

type SquadPitchProps = {
  readonly club: Club
  readonly squad: DraftState
}

/** 한 구단의 스쿼드를 포메이션 배치(피치)로 보여준다. 빈 자리는 미지명으로 표시. */
export function SquadPitch({ club, squad }: SquadPitchProps) {
  const { t } = useI18n()
  const rows = formationRows[squad.formation]
  const pickBySlot = new Map(squad.picks.map((pick) => [pick.slotId, pick.cardId]))
  const filled = squad.picks.length

  return (
    <div className="squad-pitch-wrap">
      <div className="squad-pitch-head">
        <span className="squad-pitch-club">
          <span className="club-swatch" style={{ background: club.color }} />
          {club.name}
        </span>
        <span className="squad-pitch-meta">
          {club.formation} · {tacticLabel(club.tactic, t)} · {filled}/11
        </span>
      </div>
      <div className="pitch">
        {rows.map((row, rowIndex) => (
          <div className="pitch-row" key={`${squad.formation}-${rowIndex}`}>
            {row.map((slotId) => {
              const slot = getSlotForFormation(squad.formation, slotId)
              const cardId = pickBySlot.get(slotId)
              const card = cardId === undefined ? undefined : cardsById.get(cardId)
              return (
                <div
                  className={card === undefined ? "pitch-slot pitch-slot--empty" : "pitch-slot"}
                  key={slotId}
                >
                  <span className="pitch-slot-pos">{slot.label}</span>
                  <span className="pitch-slot-name">{card?.label ?? t("pitch.unnamed")}</span>
                  {card !== undefined ? <span className="pitch-slot-cost">{card.cost}</span> : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
