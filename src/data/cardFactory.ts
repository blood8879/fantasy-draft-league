import type { PlayerCard, RatingAxis, RatingGrade } from "./schema"

type CardBase = Omit<PlayerCard, "ratings" | "internalScores">

/**
 * 개별 internal 점수(40~99)에서 표시 등급(grade)을 역산한다.
 * 경계는 validatePlayerDataset.scoreFitsGrade와 정확히 일치해야 한다.
 * (S 90-99 / A 80-89 / B 68-79 / C 55-67 / D 40-54)
 */
export function scoreToGrade(score: number): RatingGrade {
  if (score >= 90) {
    return "S"
  }
  if (score >= 80) {
    return "A"
  }
  if (score >= 68) {
    return "B"
  }
  if (score >= 55) {
    return "C"
  }
  return "D"
}

/**
 * 선수별로 직접 매긴 8축 internal 점수로 카드를 만든다(능력치 개별화 경로).
 * grade는 점수에서 역산하고, 점수는 40~99로 안전하게 클램프한다.
 */
export function createPlayerCardWithScores(
  base: CardBase,
  scores: Readonly<Record<RatingAxis, number>>,
): PlayerCard {
  const clamp = (value: number): number => Math.max(40, Math.min(99, Math.round(value)))
  const internalScores: Record<RatingAxis, number> = {
    scoring: clamp(scores.scoring),
    creation: clamp(scores.creation),
    progression: clamp(scores.progression),
    control: clamp(scores.control),
    defense: clamp(scores.defense),
    physical: clamp(scores.physical),
    mobility: clamp(scores.mobility),
    mental: clamp(scores.mental),
  }
  return {
    ...base,
    ratings: {
      scoring: scoreToGrade(internalScores.scoring),
      creation: scoreToGrade(internalScores.creation),
      progression: scoreToGrade(internalScores.progression),
      control: scoreToGrade(internalScores.control),
      defense: scoreToGrade(internalScores.defense),
      physical: scoreToGrade(internalScores.physical),
      mobility: scoreToGrade(internalScores.mobility),
      mental: scoreToGrade(internalScores.mental),
    },
    internalScores,
  }
}

export function createPlayerCard(
  base: CardBase,
  scoring: RatingGrade,
  creation: RatingGrade,
  progression: RatingGrade,
  control: RatingGrade,
  defense: RatingGrade,
  physical: RatingGrade,
  mobility: RatingGrade,
  mental: RatingGrade,
): PlayerCard {
  return {
    ...base,
    ratings: { scoring, creation, progression, control, defense, physical, mobility, mental },
    internalScores: {
      scoring: gradeToScore(scoring),
      creation: gradeToScore(creation),
      progression: gradeToScore(progression),
      control: gradeToScore(control),
      defense: gradeToScore(defense),
      physical: gradeToScore(physical),
      mobility: gradeToScore(mobility),
      mental: gradeToScore(mental),
    },
  }
}

function gradeToScore(grade: RatingGrade): number {
  switch (grade) {
    case "S":
      return 94
    case "A":
      return 84
    case "B":
      return 74
    case "C":
      return 61
    case "D":
      return 48
    default:
      return assertNever(grade)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected rating grade: ${value}`)
}
