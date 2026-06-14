import { curatedPoolCards } from "./curatedPlayerPool"
import type { PlayerCard } from "./schema"
import { seasonCards } from "./seasonCards"

export const playerCards: readonly PlayerCard[] = [...seasonCards, ...curatedPoolCards] as const
