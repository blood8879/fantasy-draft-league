import type { PlayerCard } from "./schema"

const reviewer = "internal-rubric-v1"
const status = "draft"

export function card(
  id: string,
  playerId: string,
  label: string,
  year: number,
  age: number,
  country: string,
  positions: readonly string[],
  roles: readonly string[],
  tags: readonly string[],
  cost: number,
  rarity: PlayerCard["rarity"],
  ratingRationale: string,
): Omit<PlayerCard, "ratings" | "internalScores"> {
  const eligibleEra = `${Math.floor(year / 10) * 10}s`
  return {
    id,
    playerId,
    label,
    year,
    age,
    country,
    eligibleEra,
    positions,
    roles,
    tags,
    cost,
    rarity,
    ratingRationale,
    ratingReviewer: reviewer,
    ratingStatus: status,
  }
}
