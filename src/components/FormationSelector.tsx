import type { FormationType } from "../domain/types"
import { useI18n } from "../i18n"

type FormationSelectorProps = {
  readonly formations: readonly FormationType[]
  readonly selectedFormation: FormationType
  readonly onSelectFormation: (formation: FormationType) => void
}

type PreviewRow = {
  readonly id: string
  readonly dots: readonly string[]
}

const previewRows = {
  "4-3-3": createPreviewRows("4-3-3", [3, 3, 4, 1]),
  "4-2-3-1": createPreviewRows("4-2-3-1", [1, 3, 2, 4, 1]),
  "3-5-2": createPreviewRows("3-5-2", [2, 1, 4, 3, 1]),
  "4-4-2": createPreviewRows("4-4-2", [2, 4, 4, 1]),
  "4-1-4-1": createPreviewRows("4-1-4-1", [1, 4, 1, 4, 1]),
  "4-3-1-2": createPreviewRows("4-3-1-2", [2, 1, 3, 4, 1]),
  "5-3-2": createPreviewRows("5-3-2", [2, 3, 5, 1]),
  "3-4-3": createPreviewRows("3-4-3", [3, 4, 3, 1]),
} as const satisfies Record<FormationType, readonly PreviewRow[]>

export function FormationSelector({
  formations,
  selectedFormation,
  onSelectFormation,
}: FormationSelectorProps) {
  const { t } = useI18n()
  return (
    <fieldset className="formation-selector" aria-label={t("home.formation")}>
      {formations.map((formation) => (
        <button
          aria-pressed={selectedFormation === formation}
          className="formation-card"
          key={formation}
          onClick={() => onSelectFormation(formation)}
          type="button"
        >
          <span className="formation-card-title">{formation}</span>
          <span className="formation-mini" data-testid="formation-preview">
            {previewRows[formation].map((row) => (
              <span className="formation-mini-row" key={row.id}>
                {row.dots.map((dotId) => (
                  <span className="formation-mini-dot" key={dotId} />
                ))}
              </span>
            ))}
          </span>
        </button>
      ))}
    </fieldset>
  )
}

function createPreviewRows(
  formation: FormationType,
  counts: readonly number[],
): readonly PreviewRow[] {
  return counts.map((count, rowIndex) => ({
    id: `${formation}-row-${rowIndex}-${count}`,
    dots: Array.from(
      { length: count },
      (_, dotIndex) => `${formation}-dot-${rowIndex}-${dotIndex}`,
    ),
  }))
}
