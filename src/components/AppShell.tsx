import { ClipboardList, Play, Swords, Trophy } from "lucide-react"
import type { ReactNode } from "react"
import type { GamePhase } from "../app/gameStore"
import { useI18n } from "../i18n"

type AppShellProps = {
  readonly phase: GamePhase
  readonly children: ReactNode
}

const steps: readonly {
  id: string
  labelKey: string
  icon: ReactNode
  phases: readonly GamePhase[]
}[] = [
  {
    id: "home",
    labelKey: "nav.prep",
    icon: <Play aria-hidden="true" size={18} />,
    phases: ["home"],
  },
  {
    id: "draft",
    labelKey: "nav.draft",
    icon: <ClipboardList aria-hidden="true" size={18} />,
    phases: ["draft"],
  },
  {
    id: "season",
    labelKey: "nav.season",
    icon: <Swords aria-hidden="true" size={18} />,
    phases: ["season", "report"],
  },
  {
    id: "champion",
    labelKey: "nav.awards",
    icon: <Trophy aria-hidden="true" size={18} />,
    phases: ["champion"],
  },
]

export function AppShell({ phase, children }: AppShellProps) {
  const { t } = useI18n()
  return (
    <div className="app-frame">
      <aside className="side-rail" aria-label="Progress">
        <div className="brand-mark">XI</div>
        <nav className="rail-nav">
          {steps.map((step) => (
            <div
              aria-current={step.phases.includes(phase) ? "step" : undefined}
              className="rail-button rail-step"
              key={step.id}
            >
              {step.icon}
              <span>{t(step.labelKey)}</span>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-surface">{children}</main>
    </div>
  )
}
