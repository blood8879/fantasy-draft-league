import { useState } from "react"
import { useI18n } from "../i18n"
import { type ChemistryLink, chemistryGrade } from "../simulation/chemistry"
import { chemistryDesc, chemistryGradeLabel, chemistryLinkText } from "./labels"

type ChemistryBadgesProps = {
  readonly links: readonly ChemistryLink[]
  readonly score: number
}

/** 활성화된 케미 목록을 배지로 표시한다. 배지를 누르면 등급·효과·설명 상세가 펼쳐진다. */
export function ChemistryBadges({ links, score }: ChemistryBadgesProps) {
  const { t } = useI18n()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
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
          {links.map((link, index) => {
            const grade = chemistryGrade(link.bonus)
            const open = openIndex === index
            return (
              <li
                className={open ? "chem-li chem-li--open" : "chem-li"}
                key={`${link.kind}-${link.label}-${index}`}
              >
                <button
                  aria-expanded={open}
                  className="chem-badge"
                  data-grade={grade}
                  data-kind={link.kind}
                  onClick={() => setOpenIndex(open ? null : index)}
                  type="button"
                >
                  <span
                    aria-label={t(`chem.grade.${grade}`)}
                    className="chem-gem"
                    data-grade={grade}
                  />
                  <span className="chem-badge-text">{chemistryLinkText(link, t)}</span>
                  <span className="chem-badge-bonus">+{link.bonus}</span>
                </button>
                {open ? (
                  <div className="chem-detail" data-grade={grade}>
                    <p className="chem-detail-grade">
                      <span className="chem-detail-grade-name" data-grade={grade}>
                        {chemistryGradeLabel(grade, t)}
                      </span>
                      <span className="chem-detail-effect">
                        {t("chem.detail.allStats", {
                          bonus: link.bonus,
                          count: link.members.length,
                        })}
                      </span>
                    </p>
                    <p className="chem-detail-desc">{chemistryDesc(link.kind, t)}</p>
                    {link.members.length > 0 ? (
                      <div className="chem-detail-members">
                        <span className="chem-detail-members-label">
                          {t("chem.detail.members")}
                        </span>
                        <span className="chem-detail-members-list">{link.members.join(", ")}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
