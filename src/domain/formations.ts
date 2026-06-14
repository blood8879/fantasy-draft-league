import type { FormationType } from "./types"

export type SlotId = string

export type DraftSlot = {
  readonly id: SlotId
  readonly label: string
  readonly acceptedPositions: readonly string[]
  readonly pitchArea: string
}

const s = (
  id: SlotId,
  label: string,
  acceptedPositions: readonly string[],
  pitchArea: string,
): DraftSlot => ({ id, label, acceptedPositions, pitchArea })

const backFour = [
  s("rb", "RB", ["RB"], "rb"),
  s("rcb", "CB", ["CB"], "rcb"),
  s("lcb", "CB", ["CB"], "lcb"),
  s("lb", "LB", ["LB"], "lb"),
] as const

const keeper = [s("gk", "GK", ["GK"], "gk")] as const

export const formationSlots = {
  "4-3-3": [
    ...keeper,
    ...backFour,
    s("rcm", "CM", ["CM"], "rcm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("am", "AM", ["AM"], "am"),
    s("rw", "RW", ["RW"], "rw"),
    s("st", "ST", ["ST"], "st"),
    s("lw", "LW", ["LW"], "lw"),
  ],
  "4-2-3-1": [
    ...keeper,
    ...backFour,
    s("rdm", "DM", ["DM"], "rdm"),
    s("ldm", "DM", ["DM"], "ldm"),
    s("ram", "RW", ["RW"], "ram"),
    s("cam", "AM", ["AM"], "cam"),
    s("lam", "LW", ["LW"], "lam"),
    s("st", "ST", ["ST"], "st"),
  ],
  "3-5-2": [
    ...keeper,
    s("rcb", "CB", ["CB"], "rcb"),
    s("cb", "CB", ["CB"], "cb"),
    s("lcb", "CB", ["CB"], "lcb"),
    s("rwb", "RWB", ["RB", "RW"], "rwb"),
    s("lwb", "LWB", ["LB", "LW"], "lwb"),
    s("rcm", "CM", ["CM"], "rcm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("cam", "AM", ["AM"], "cam"),
    s("rst", "ST", ["ST"], "rst"),
    s("lst", "ST", ["ST"], "lst"),
  ],
  "4-4-2": [
    ...keeper,
    ...backFour,
    s("rm", "RM", ["RW", "RB"], "rm"),
    s("rcm", "CM", ["CM"], "rcm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("lm", "LM", ["LW", "LB"], "lm"),
    s("rst", "ST", ["ST"], "rst"),
    s("lst", "ST", ["ST"], "lst"),
  ],
  "4-1-4-1": [
    ...keeper,
    ...backFour,
    s("dm", "DM", ["DM"], "dm"),
    s("rm", "RM", ["RW", "RB"], "rm"),
    s("rcm", "CM", ["CM"], "rcm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("lm", "LM", ["LW", "LB"], "lm"),
    s("st", "ST", ["ST"], "st"),
  ],
  "4-3-1-2": [
    ...keeper,
    ...backFour,
    s("dm", "DM", ["DM"], "dm"),
    s("rcm", "CM", ["CM"], "rcm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("am", "AM", ["AM"], "am"),
    s("rst", "ST", ["ST"], "rst"),
    s("lst", "ST", ["ST"], "lst"),
  ],
  "5-3-2": [
    ...keeper,
    s("rwb", "RWB", ["RB", "RW"], "rwb"),
    s("rcb", "CB", ["CB"], "rcb"),
    s("cb", "CB", ["CB"], "cb"),
    s("lcb", "CB", ["CB"], "lcb"),
    s("lwb", "LWB", ["LB", "LW"], "lwb"),
    s("rcm", "CM", ["CM"], "rcm"),
    s("dm", "DM", ["DM"], "dm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("rst", "ST", ["ST"], "rst"),
    s("lst", "ST", ["ST"], "lst"),
  ],
  "3-4-3": [
    ...keeper,
    s("rcb", "CB", ["CB"], "rcb"),
    s("cb", "CB", ["CB"], "cb"),
    s("lcb", "CB", ["CB"], "lcb"),
    s("rm", "RM", ["RW", "RB"], "rm"),
    s("rcm", "CM", ["CM"], "rcm"),
    s("lcm", "CM", ["CM"], "lcm"),
    s("lm", "LM", ["LW", "LB"], "lm"),
    s("rw", "RW", ["RW"], "rw"),
    s("st", "ST", ["ST"], "st"),
    s("lw", "LW", ["LW"], "lw"),
  ],
} as const satisfies Record<FormationType, readonly DraftSlot[]>

export const draftSlots = formationSlots["4-3-3"]

/**
 * 포메이션별 슬롯을 피치 라인(공격 라인이 위, 골키퍼가 아래)으로 묶은 배치.
 * 스쿼드를 포메이션 형태로 시각화할 때 사용한다.
 */
export const formationRows = {
  "4-3-3": [["lw", "st", "rw"], ["lcm", "am", "rcm"], ["lb", "lcb", "rcb", "rb"], ["gk"]],
  "4-2-3-1": [["st"], ["lam", "cam", "ram"], ["ldm", "rdm"], ["lb", "lcb", "rcb", "rb"], ["gk"]],
  "3-5-2": [["lst", "rst"], ["cam"], ["lwb", "lcm", "rcm", "rwb"], ["lcb", "cb", "rcb"], ["gk"]],
  "4-4-2": [["lst", "rst"], ["lm", "lcm", "rcm", "rm"], ["lb", "lcb", "rcb", "rb"], ["gk"]],
  "4-1-4-1": [["st"], ["lm", "lcm", "rcm", "rm"], ["dm"], ["lb", "lcb", "rcb", "rb"], ["gk"]],
  "4-3-1-2": [["lst", "rst"], ["am"], ["lcm", "rcm"], ["dm"], ["lb", "lcb", "rcb", "rb"], ["gk"]],
  "5-3-2": [["lst", "rst"], ["lcm", "dm", "rcm"], ["lwb", "lcb", "cb", "rcb", "rwb"], ["gk"]],
  "3-4-3": [["lw", "st", "rw"], ["lm", "lcm", "rcm", "rm"], ["lcb", "cb", "rcb"], ["gk"]],
} as const satisfies Record<FormationType, readonly (readonly SlotId[])[]>
