import { createPlayerCard } from "./cardFactory"
import playerPoolData from "./curatedPlayerPool.json"
import {
  type CuratedTier,
  isCuratedTier,
  tierCost,
  tierRarity,
  tuneRatingsForTier,
} from "./curatedPlayerRatings"
import type { Player, PlayerCard, RatingAxis, RatingGrade } from "./schema"

const poolPositions = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "ST", "LW"] as const

type PoolPosition = (typeof poolPositions)[number]
type PoolEntry = {
  readonly displayName: string
  readonly country: string
  readonly tier: CuratedTier
}
type RatingShape = Readonly<Record<RatingAxis, RatingGrade>>
type PositionSpec = {
  readonly position: PoolPosition
  readonly role: string
  readonly tag: string
  readonly ratings: RatingShape
}

const rawPool: Readonly<Record<PoolPosition, readonly string[]>> = playerPoolData

const positionSpecs = [
  spec("GK", "Goalkeeper", "goalkeeper", {
    scoring: "D",
    creation: "D",
    progression: "D",
    control: "B",
    defense: "A",
    physical: "B",
    mobility: "B",
    mental: "A",
  }),
  spec("RB", "Fullback", "right_side", {
    scoring: "D",
    creation: "B",
    progression: "B",
    control: "B",
    defense: "B",
    physical: "B",
    mobility: "A",
    mental: "B",
  }),
  spec("CB", "Defender", "defense", {
    scoring: "D",
    creation: "C",
    progression: "C",
    control: "B",
    defense: "A",
    physical: "A",
    mobility: "B",
    mental: "A",
  }),
  spec("LB", "Fullback", "left_side", {
    scoring: "D",
    creation: "B",
    progression: "B",
    control: "B",
    defense: "B",
    physical: "B",
    mobility: "A",
    mental: "B",
  }),
  spec("DM", "Anchor", "screening", {
    scoring: "D",
    creation: "B",
    progression: "B",
    control: "A",
    defense: "A",
    physical: "B",
    mobility: "B",
    mental: "A",
  }),
  spec("CM", "Controller", "tempo", {
    scoring: "C",
    creation: "A",
    progression: "A",
    control: "A",
    defense: "B",
    physical: "B",
    mobility: "B",
    mental: "A",
  }),
  spec("AM", "Creator", "creation", {
    scoring: "B",
    creation: "A",
    progression: "A",
    control: "A",
    defense: "D",
    physical: "C",
    mobility: "B",
    mental: "A",
  }),
  spec("RW", "Wide Forward", "right_side", {
    scoring: "A",
    creation: "B",
    progression: "A",
    control: "B",
    defense: "C",
    physical: "B",
    mobility: "A",
    mental: "B",
  }),
  spec("ST", "Finisher", "box_threat", {
    scoring: "A",
    creation: "C",
    progression: "B",
    control: "B",
    defense: "D",
    physical: "A",
    mobility: "B",
    mental: "A",
  }),
  spec("LW", "Wide Forward", "left_side", {
    scoring: "A",
    creation: "B",
    progression: "A",
    control: "B",
    defense: "C",
    physical: "B",
    mobility: "A",
    mental: "B",
  }),
] as const satisfies readonly PositionSpec[]

export const curatedPoolPlayers: readonly Player[] = positionSpecs.flatMap((positionSpec) =>
  rawPool[positionSpec.position].map((entry) =>
    createPoolPlayer(positionSpec.position, parseEntry(entry)),
  ),
)

export const curatedPoolCards: readonly PlayerCard[] = positionSpecs.flatMap((positionSpec) =>
  rawPool[positionSpec.position].map((entry, index) =>
    createPoolCard(positionSpec, parseEntry(entry), index),
  ),
)

function spec(
  position: PoolPosition,
  role: string,
  tag: string,
  ratings: RatingShape,
): PositionSpec {
  return { position, role, tag, ratings }
}

function parseEntry(entry: string): PoolEntry {
  const [displayName, country, tier] = entry.split("|")
  if (displayName === undefined || country === undefined) {
    throw new Error(`Invalid curated player entry: ${entry}`)
  }
  // tier가 누락되거나 알 수 없는 값이면 평범한 1군(regular)으로 안전하게 처리한다.
  const resolvedTier: CuratedTier = tier !== undefined && isCuratedTier(tier) ? tier : "regular"
  return { displayName, country, tier: resolvedTier }
}

function createPoolPlayer(position: PoolPosition, entry: PoolEntry): Player {
  return {
    id: playerId(position, entry.displayName),
    displayName: entry.displayName,
    country: entry.country,
    birthYear: null,
    primaryPositions: [position],
    publicSourceNotes: ["Curated public footballer name and broad position only"],
    sourceRefs: [
      {
        type: "biography",
        label: `${entry.displayName} public career summary`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(entry.displayName.replaceAll(" ", "_"))}`,
      },
    ],
    rightsRiskNotes: ["Text-only player name; no photo, crest, kit, logo, or official mark"],
  }
}

function createPoolCard(positionSpec: PositionSpec, entry: PoolEntry, index: number): PlayerCard {
  const ratings = tuneRatingsForTier(positionSpec.ratings, entry.tier)
  const id = playerId(positionSpec.position, entry.displayName)
  return createPlayerCard(
    {
      id: `${id}_pool`,
      playerId: id,
      label: entry.displayName,
      year: null,
      age: null,
      country: entry.country,
      eligibleEra: "all-time pool",
      positions: [positionSpec.position],
      roles: [positionSpec.role],
      tags: [positionSpec.tag, index % 4 === 0 ? "left_foot" : "curated_pool"],
      cost: tierCost(entry.tier, id),
      rarity: tierRarity(entry.tier),
      ratingRationale: `Broad all-time player pool tier (${entry.tier}) for ${entry.displayName}; no unverified season-year, age, photo, crest, or official mark is asserted.`,
      ratingReviewer: "curated-player-pool-v2",
      ratingStatus: "draft",
    },
    ratings.scoring,
    ratings.creation,
    ratings.progression,
    ratings.control,
    ratings.defense,
    ratings.physical,
    ratings.mobility,
    ratings.mental,
  )
}

function playerId(position: PoolPosition, displayName: string): string {
  return `curated_${position.toLowerCase()}_${displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`
}
