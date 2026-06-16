import type { TacticType } from "../domain/types"
import type { ChemistryLink } from "./chemistry"

export type TeamProfile = {
  readonly attack: number
  readonly chanceCreation: number
  readonly midfieldControl: number
  readonly pressResistance: number
  readonly transition: number
  readonly defensiveStability: number
  readonly aerialSetPiece: number
  readonly stamina: number
  readonly chemistry: number
  readonly chemistryLinks: readonly ChemistryLink[]
  readonly roleBalance: number
  readonly tactic: TacticType
}
