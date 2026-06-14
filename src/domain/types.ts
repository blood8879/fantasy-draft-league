export const tacticTypes = ["점유율", "강한 압박", "역습", "로우블록"] as const

export const formationTypes = [
  "4-3-3",
  "4-2-3-1",
  "3-5-2",
  "4-4-2",
  "4-1-4-1",
  "4-3-1-2",
  "5-3-2",
  "3-4-3",
] as const

export type TacticType = (typeof tacticTypes)[number]
export type FormationType = (typeof formationTypes)[number]
