import type { Rarity, RatingAxis, RatingGrade } from "./schema"

/**
 * 선수 등급(tier). 데이터에는 tier 한 단계만 표기하고, cost·rarity·능력치 보정은
 * 전부 tier에서 자동 산출한다. 덕분에 수백~수천 명 규모로 풀을 늘려도 선수마다
 * tier 한 글자만 붙이면 일관된 능력치 곡선이 나온다.
 */
export const curatedTiers = ["icon", "legend", "elite", "strong", "regular", "squad"] as const
export type CuratedTier = (typeof curatedTiers)[number]

type TierConfig = {
  /** cost 하한 */
  readonly costBase: number
  /** cost 변동 폭(같은 tier 안에서의 분산) */
  readonly costSpread: number
  readonly rarity: Rarity
  /** 포지션 기본 등급(grade) 대비 부스트 단계 (음수면 강등) */
  readonly boost: number
}

const tierConfig: Readonly<Record<CuratedTier, TierConfig>> = {
  icon: { costBase: 93, costSpread: 6, rarity: "Legend", boost: 3 },
  legend: { costBase: 88, costSpread: 5, rarity: "Legend", boost: 2 },
  elite: { costBase: 83, costSpread: 5, rarity: "Epic", boost: 1 },
  strong: { costBase: 77, costSpread: 6, rarity: "Rare", boost: 0 },
  regular: { costBase: 70, costSpread: 7, rarity: "Common", boost: -1 },
  squad: { costBase: 62, costSpread: 8, rarity: "Common", boost: -2 },
}

export function isCuratedTier(value: string): value is CuratedTier {
  return (curatedTiers as readonly string[]).includes(value)
}

export function tierRarity(tier: CuratedTier): Rarity {
  return tierConfig[tier].rarity
}

/** tier 안에서 이름 기반으로 cost를 결정적으로 분산시킨다(같은 tier도 카드마다 약간 다름). */
export function tierCost(tier: CuratedTier, variantKey: string): number {
  const config = tierConfig[tier]
  return Math.min(99, config.costBase + (hashKey(variantKey) % config.costSpread))
}

export function tuneRatingsForTier(
  ratings: Readonly<Record<RatingAxis, RatingGrade>>,
  tier: CuratedTier,
): Readonly<Record<RatingAxis, RatingGrade>> {
  const steps = tierConfig[tier].boost
  if (steps === 0) {
    return ratings
  }
  return {
    scoring: boostGrade(ratings.scoring, steps),
    creation: boostGrade(ratings.creation, steps),
    progression: boostGrade(ratings.progression, steps),
    control: boostGrade(ratings.control, steps),
    defense: boostGrade(ratings.defense, steps),
    physical: boostGrade(ratings.physical, steps),
    mobility: boostGrade(ratings.mobility, steps),
    mental: boostGrade(ratings.mental, steps),
  }
}

const gradeOrder = ["D", "C", "B", "A", "S"] as const

function boostGrade(grade: RatingGrade, steps: number): RatingGrade {
  const index = gradeOrder.indexOf(grade)
  const target = Math.min(gradeOrder.length - 1, Math.max(0, index + steps))
  return gradeOrder[target] ?? grade
}

function hashKey(key: string): number {
  let hash = 2166136261
  for (const character of key) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
