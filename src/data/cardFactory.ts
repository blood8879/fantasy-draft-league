import type { PlayerCard, RatingGrade } from "./schema"

type CardBase = Omit<PlayerCard, "ratings" | "internalScores">

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
