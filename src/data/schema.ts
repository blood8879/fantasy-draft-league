import { z } from "zod"

export const ratingAxes = [
  "scoring",
  "creation",
  "progression",
  "control",
  "defense",
  "physical",
  "mobility",
  "mental",
] as const

export const ratingGrades = ["S", "A", "B", "C", "D"] as const
export const rarityValues = ["Common", "Rare", "Epic", "Legend"] as const
export const ratingStatusValues = ["draft", "reviewed"] as const

export type RatingAxis = (typeof ratingAxes)[number]
export type RatingGrade = (typeof ratingGrades)[number]
export type Rarity = (typeof rarityValues)[number]
export type RatingStatus = (typeof ratingStatusValues)[number]

/** FM식 세분 속성 키(8축에서 결정론 파생). 12~16개 범위 내 14개. */
export const attributeKeys = [
  "finishing",
  "longShots",
  "passing",
  "dribbling",
  "firstTouch",
  "tackling",
  "marking",
  "positioning",
  "vision",
  "composure",
  "workRate",
  "pace",
  "stamina",
  "strength",
] as const

export type AttributeKey = (typeof attributeKeys)[number]
export type PlayerAttributes = Readonly<Record<AttributeKey, number>>

export type SourceRef = {
  readonly type: "biography" | "statistics" | "career_summary"
  readonly label: string
  readonly url: string
}

export type Player = {
  readonly id: string
  readonly displayName: string
  readonly country: string
  readonly birthYear: number | null
  readonly primaryPositions: readonly string[]
  readonly publicSourceNotes: readonly string[]
  readonly sourceRefs: readonly SourceRef[]
  readonly rightsRiskNotes: readonly string[]
}

export type PlayerCard = {
  readonly id: string
  readonly playerId: string
  readonly label: string
  readonly year: number | null
  readonly age: number | null
  readonly country: string
  readonly club?: string
  readonly league?: string
  readonly eligibleEra: string
  readonly positions: readonly string[]
  readonly mainPos: string
  readonly roles: readonly string[]
  readonly ratings: Readonly<Record<RatingAxis, RatingGrade>>
  readonly internalScores: Readonly<Record<RatingAxis, number>>
  readonly tags: readonly string[]
  readonly cost: number
  readonly rarity: Rarity
  readonly ratingRationale: string
  readonly ratingReviewer: string
  readonly ratingStatus: RatingStatus
}

export const SourceRefSchema = z.object({
  type: z.enum(["biography", "statistics", "career_summary"]),
  label: z.string().min(1),
  url: z.string().url(),
})

export const PlayerSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  country: z.string().min(1),
  birthYear: z.number().int().min(1800).max(2026).nullable(),
  primaryPositions: z.array(z.string().min(1)).min(1),
  publicSourceNotes: z.array(z.string().min(1)).min(1),
  sourceRefs: z.array(SourceRefSchema).min(1),
  rightsRiskNotes: z.array(z.string().min(1)).min(1),
})

export const RatingSchema = z.record(z.enum(ratingAxes), z.enum(ratingGrades))
export const InternalScoreSchema = z.record(z.enum(ratingAxes), z.number().int().min(40).max(99))

export const PlayerCardSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  label: z.string().min(1),
  year: z.number().int().min(1950).max(2026).nullable(),
  age: z.number().int().min(16).max(45).nullable(),
  country: z.string().min(1),
  club: z.string().min(1).optional(),
  league: z.string().min(1).optional(),
  eligibleEra: z.string().min(1),
  positions: z.array(z.string().min(1)).min(1),
  mainPos: z.string().min(1),
  roles: z.array(z.string().min(1)).min(1),
  ratings: RatingSchema,
  internalScores: InternalScoreSchema,
  tags: z.array(z.string().min(1)).min(1),
  cost: z.number().int().min(40).max(99),
  rarity: z.enum(rarityValues),
  ratingRationale: z.string().min(20),
  ratingReviewer: z.string().min(1),
  ratingStatus: z.enum(ratingStatusValues),
})
