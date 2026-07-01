import { cardsById } from "../app/gameStore"
import { tacticLabel } from "../components/labels"
import { deriveAttributes } from "../data/attributes"
import { positionOvr } from "../data/cardFactory"
import { attributeKeys } from "../data/schema"
import type { PlayerCard } from "../data/schema"
import { type DraftState, getSlotForFormation } from "../domain/draft"
import { formationRows } from "../domain/formations"
import type { Club } from "../domain/game"
import { type I18nValue, useI18n } from "../i18n"
import { chemistryGrade, computeChemistry } from "../simulation/chemistry"
import { type PositionFitGrade, resolveFit } from "../simulation/positionFit"

type SquadPitchProps = {
  readonly club: Club
  readonly squad: DraftState
}

/** 슬롯 약어를 포지션 그룹(피치 도트 색)으로. */
function slotGroup(label: string): "gk" | "def" | "mid" | "fwd" {
  const s = label.toUpperCase()
  if (s.includes("GK")) {
    return "gk"
  }
  if (s.includes("WB") || s === "RB" || s === "LB" || s.includes("CB")) {
    return "def"
  }
  if (
    s.includes("DM") ||
    s.includes("CM") ||
    s.includes("AM") ||
    s.includes("RM") ||
    s.includes("LM")
  ) {
    return "mid"
  }
  return "fwd"
}

/** 한 구단의 스쿼드를 포메이션 도트 피치로 보여준다. 빈 자리는 미지명으로 표시. */
export function SquadPitch({ club, squad }: SquadPitchProps) {
  const { t } = useI18n()
  const rows = formationRows[squad.formation]
  const pickBySlot = new Map(squad.picks.map((pick) => [pick.slotId, pick.cardId]))
  const filled = squad.picks.length

  // 케미로 능력치가 오른 선수를 +N으로 표시하기 위한 보너스/종류 맵.
  const chem = computeChemistry(
    squad.picks.flatMap((pick) => {
      const card = cardsById.get(pick.cardId)
      if (card === undefined) {
        return []
      }
      return [{ card, slotLabel: getSlotForFormation(squad.formation, pick.slotId).label }]
    }),
  )
  const chemBonus = chem.bonusByCardId

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
      <div className="pitch pitch--dots">
        {rows.map((row, rowIndex) => {
          const top = 9 + ((rowIndex + 0.5) / rows.length) * 82
          return row.map((slotId, col) => {
            const left = 10 + ((col + 0.5) / row.length) * 80
            const slot = getSlotForFormation(squad.formation, slotId)
            const cardId = pickBySlot.get(slotId)
            const card = cardId === undefined ? undefined : cardsById.get(cardId)
            const bonus = cardId === undefined ? 0 : (chemBonus.get(cardId) ?? 0)
            const fitGrade =
              card === undefined ? undefined : resolveFit(card, slot.acceptedPositions).grade
            return (
              <div
                className="pitch-dot-wrap"
                key={slotId}
                style={{ top: `${top}%`, left: `${left}%` }}
              >
                <div
                  className="pitch-dot"
                  data-empty={card === undefined ? "true" : undefined}
                  data-group={slotGroup(slot.label)}
                >
                  {card === undefined
                    ? slot.label
                    : positionOvr(card.internalScores, slot.acceptedPositions[0] ?? slot.label)}
                  {card?.year != null ? (
                    <span className="pitch-dot-yearbadge">'{String(card.year).slice(2)}</span>
                  ) : null}
                  {bonus > 0 && cardId !== undefined ? (
                    <span className="pitch-dot-bonus" data-grade={chemistryGrade(bonus)}>
                      +{bonus}
                    </span>
                  ) : null}
                </div>
                <div className="pitch-dot-name">{card?.label ?? t("pitch.unnamed")}</div>
                {fitGrade !== undefined ? <FitBadge grade={fitGrade} t={t} /> : null}
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}

/** 14속성 그리드(deriveAttributes로 파생). 카드 상세에서 8축 등급과 공존하는 보조 표시. */
export function AttributeGrid({
  card,
  t,
}: {
  readonly card: PlayerCard
  readonly t: I18nValue["t"]
}) {
  const attrs = deriveAttributes(card)
  return (
    <div className="attr-grid">
      {attributeKeys.map((key) => (
        <div className="attr-chip" key={key}>
          <span className="attr-chip-label">{t(`attr.${key}`)}</span>
          <span className="attr-chip-value">{attrs[key]}</span>
        </div>
      ))}
    </div>
  )
}

/** 포지션 적합 등급 배지. 등급별 색은 game.css의 data-grade로 구분. */
export function FitBadge({
  grade,
  t,
}: {
  readonly grade: PositionFitGrade
  readonly t: I18nValue["t"]
}) {
  const key = grade.toLowerCase()
  return (
    <span className="fit-badge" data-grade={key}>
      {t(`fit.${key}`)}
    </span>
  )
}
