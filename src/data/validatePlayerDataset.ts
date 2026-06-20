import { type Player, type PlayerCard, PlayerCardSchema, PlayerSchema, ratingAxes } from "./schema"

export type DatasetValidationResult =
  | { readonly kind: "valid" }
  | { readonly kind: "invalid"; readonly errors: readonly string[] }

type Dataset = {
  readonly players: readonly Player[]
  readonly playerCards: readonly PlayerCard[]
}

export function validatePlayerDataset(dataset: Dataset): DatasetValidationResult {
  const errors = [
    ...validatePlayers(dataset.players),
    ...validateCards(dataset.playerCards),
    ...validateRelationships(dataset),
  ]

  if (errors.length === 0) {
    return { kind: "valid" }
  }

  return { kind: "invalid", errors }
}

function validatePlayers(players: readonly Player[]): readonly string[] {
  return players.flatMap((player) => {
    const result = PlayerSchema.safeParse(player)
    const schemaErrors = result.success
      ? []
      : [`Invalid player ${player.id}: ${result.error.message}`]
    const curatedYearErrors =
      player.id.startsWith("curated_") && player.birthYear !== null
        ? [`${player.id} broad pool player must not invent a birth year`]
        : []
    const seasonYearErrors =
      !player.id.startsWith("curated_") && player.birthYear === null
        ? [`${player.id} season player must keep a verified birth year`]
        : []
    return [...schemaErrors, ...curatedYearErrors, ...seasonYearErrors]
  })
}

function validateCards(playerCards: readonly PlayerCard[]): readonly string[] {
  return playerCards.flatMap((card) => {
    const schemaResult = PlayerCardSchema.safeParse(card)
    const schemaErrors = schemaResult.success
      ? []
      : [`Invalid card ${card.id}: ${schemaResult.error.message}`]
    const ratingErrors = ratingAxes.flatMap((axis) => {
      const grade = card.ratings[axis]
      const score = card.internalScores[axis]
      return scoreFitsGrade(grade, score)
        ? []
        : [`${card.id}.${axis} grade ${grade} does not match score ${score}`]
    })
    const rationaleErrors =
      Object.values(card.ratings).includes("S") && card.ratingRationale.length < 30
        ? [`${card.id} has S grade without enough rationale`]
        : []
    return [...schemaErrors, ...ratingErrors, ...rationaleErrors, ...validateCardYearPolicy(card)]
  })
}

function validateCardYearPolicy(card: PlayerCard): readonly string[] {
  if (card.id.startsWith("curated_")) {
    // 시즌 카드는 연도(year)를 가질 수 있다. 단 라벨에 연도를 노출하지 않고,
    // 나이(age)는 추정하지 않으며, 연도는 합리적 범위(1950~2026)여야 한다.
    const labelErrors = /^\d{4}\s/.test(card.label)
      ? [`${card.id} card must not expose a season-year label`]
      : []
    const ageErrors = card.age !== null ? [`${card.id} curated card must not invent age data`] : []
    const yearErrors =
      card.year !== null && (card.year < 1950 || card.year > 2026)
        ? [`${card.id} curated card year must be between 1950 and 2026`]
        : []
    return [...labelErrors, ...ageErrors, ...yearErrors]
  }

  if (card.year === null || card.age === null) {
    return [`${card.id} season card must keep verified year and age data`]
  }
  return card.year < 2000 || card.year > 2026
    ? [`${card.id} season card year must be between 2000 and 2026`]
    : []
}

function validateRelationships(dataset: Dataset): readonly string[] {
  const playerIds = new Set(dataset.players.map((player) => player.id))
  return dataset.playerCards.flatMap((card) =>
    playerIds.has(card.playerId) ? [] : [`${card.id} references missing player ${card.playerId}`],
  )
}

function scoreFitsGrade(grade: PlayerCard["ratings"]["scoring"], score: number): boolean {
  switch (grade) {
    case "S":
      return score >= 90 && score <= 99
    case "A":
      return score >= 80 && score <= 89
    case "B":
      return score >= 68 && score <= 79
    case "C":
      return score >= 55 && score <= 67
    case "D":
      return score >= 40 && score <= 54
    default:
      return assertNever(grade)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected grade: ${value}`)
}
