import { ClipboardList, Play, Swords, Trophy } from "lucide-react"
import type { ReactNode } from "react"
import type { GamePhase } from "../app/gameStore"

type AppShellProps = {
  readonly phase: GamePhase
  readonly children: ReactNode
}

const steps: readonly {
  id: string
  label: string
  icon: ReactNode
  phases: readonly GamePhase[]
}[] = [
  { id: "home", label: "준비", icon: <Play aria-hidden="true" size={18} />, phases: ["home"] },
  {
    id: "draft",
    label: "드래프트",
    icon: <ClipboardList aria-hidden="true" size={18} />,
    phases: ["draft"],
  },
  {
    id: "season",
    label: "대회",
    icon: <Swords aria-hidden="true" size={18} />,
    phases: ["season", "report"],
  },
  {
    id: "champion",
    label: "시상",
    icon: <Trophy aria-hidden="true" size={18} />,
    phases: ["champion"],
  },
]

export function AppShell({ phase, children }: AppShellProps) {
  return (
    <div className="app-frame">
      <aside className="side-rail" aria-label="진행 단계">
        <div className="brand-mark">XI</div>
        <nav className="rail-nav">
          {steps.map((step) => (
            <div
              aria-current={step.phases.includes(phase) ? "step" : undefined}
              className="rail-button rail-step"
              key={step.id}
            >
              {step.icon}
              <span>{step.label}</span>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-surface">{children}</main>
    </div>
  )
}
