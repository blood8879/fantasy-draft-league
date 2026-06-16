import { useI18n } from "../i18n"
import type { ChemistryLink } from "../simulation/chemistry"
import { chemistryLinkText } from "./labels"

type ChemistryBadgesProps = {
  readonly links: readonly ChemistryLink[]
  readonly score: number
}

/** 활성화된 케미 목록을 배지로 표시한다(드래프트 중 우리 팀 패널용). */
export function ChemistryBadges({ links, score }: ChemistryBadgesProps) {
  const { t } = useI18n()
  return (
    <div className="chem-panel">
      <div className="chem-head">
        <span className="chem-title">{t("chem.title")}</span>
        <span className="chem-score">{score}</span>
      </div>
      {links.length === 0 ? (
        <p className="chem-empty">{t("chem.none")}</p>
      ) : (
        <ul className="chem-badges">
          {links.map((link, index) => (
            <li
              className="chem-badge"
              data-kind={link.kind}
              key={`${link.kind}-${link.label}-${index}`}
            >
              <span className="chem-badge-text">{chemistryLinkText(link, t)}</span>
              <span className="chem-badge-bonus">+{link.bonus}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
