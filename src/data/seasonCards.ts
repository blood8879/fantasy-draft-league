import { card } from "./cardBuilder"
import { createPlayerCard } from "./cardFactory"
import type { Player, PlayerCard, RatingGrade } from "./schema"
import {
  type SeasonCardDefinition,
  type SeasonProfile,
  seasonCardDefinitions,
} from "./seasonCardDefinitions"

type RatingTuple = readonly [
  RatingGrade,
  RatingGrade,
  RatingGrade,
  RatingGrade,
  RatingGrade,
  RatingGrade,
  RatingGrade,
  RatingGrade,
]

type ProfileSpec = {
  readonly roles: readonly string[]
  readonly ratings: RatingTuple
  readonly rationale: string
}

const profileSpecs: Readonly<Record<SeasonProfile, ProfileSpec>> = {
  gk_keeper: spec(
    ["Goalkeeper"],
    ["D", "C", "D", "B", "S", "B", "B", "S"],
    "shot-stopping and command profile from a verified 2000-2026 senior season",
  ),
  gk_sweeper: spec(
    ["Sweeper Keeper"],
    ["D", "B", "B", "A", "S", "B", "A", "S"],
    "sweeper-keeper profile from a verified 2000-2026 senior season",
  ),
  fullback_attacker: spec(
    ["Fullback", "Wing Support"],
    ["C", "A", "A", "B", "B", "B", "A", "B"],
    "attacking fullback profile from a verified 2000-2026 senior season",
  ),
  fullback_balanced: spec(
    ["Fullback"],
    ["D", "B", "B", "B", "A", "B", "B", "A"],
    "balanced wide defender profile from a verified 2000-2026 senior season",
  ),
  center_back: spec(
    ["Defender"],
    ["D", "C", "B", "B", "S", "A", "B", "A"],
    "central defender profile from a verified 2000-2026 senior season",
  ),
  dm_anchor: spec(
    ["Anchor", "Screen"],
    ["C", "B", "B", "A", "S", "A", "B", "A"],
    "defensive midfield profile from a verified 2000-2026 senior season",
  ),
  cm_controller: spec(
    ["Controller"],
    ["B", "A", "A", "S", "B", "B", "B", "A"],
    "central midfield controller profile from a verified 2000-2026 senior season",
  ),
  am_creator: spec(
    ["Creator"],
    ["A", "S", "A", "S", "C", "B", "A", "A"],
    "attacking creator profile from a verified 2000-2026 senior season",
  ),
  wing_forward: spec(
    ["Wide Forward"],
    ["A", "A", "S", "B", "C", "B", "S", "A"],
    "wide forward profile from a verified 2000-2026 senior season",
  ),
  striker: spec(
    ["Finisher"],
    ["S", "B", "A", "B", "D", "A", "A", "A"],
    "striker profile from a verified 2000-2026 senior season",
  ),
}

export const seasonPlayers: readonly Player[] = uniqueSeasonPlayers(seasonCardDefinitions)

export const seasonCards: readonly PlayerCard[] = seasonCardDefinitions.map((definition) => {
  const profile = profileSpecs[definition.profile]
  const [scoring, creation, progression, control, defense, physical, mobility, mental] =
    profile.ratings
  return createPlayerCard(
    card(
      `${definition.playerId}_${definition.year}`,
      canonicalPlayerId(definition.playerId),
      `${definition.year} ${definition.displayName}`,
      definition.year,
      definition.year - definition.birthYear,
      definition.country,
      definition.positions,
      profile.roles,
      [...definition.tags, `season_${definition.year}`],
      definition.cost,
      definition.rarity,
      `${profile.rationale}; ${definition.displayName} is represented only as text, without photos, crests, kits, or official competition marks.`,
    ),
    scoring,
    creation,
    progression,
    control,
    defense,
    physical,
    mobility,
    mental,
  )
})

function spec(roles: readonly string[], ratings: RatingTuple, rationale: string): ProfileSpec {
  return { roles, ratings, rationale }
}

function uniqueSeasonPlayers(definitions: readonly SeasonCardDefinition[]): readonly Player[] {
  const playersById = new Map<string, Player>()
  for (const definition of definitions) {
    const playerId = canonicalPlayerId(definition.playerId)
    if (playersById.has(playerId)) {
      continue
    }
    playersById.set(playerId, {
      id: playerId,
      displayName: definition.displayName,
      country: definition.country,
      birthYear: definition.birthYear,
      primaryPositions: definition.positions,
      publicSourceNotes: ["Public biographical and senior career facts only"],
      sourceRefs: [
        {
          type: "biography",
          label: `${definition.displayName} public career summary`,
          url: `https://en.wikipedia.org/wiki/${definition.wikiSlug}`,
        },
      ],
      rightsRiskNotes: [
        "Text-only player name; no photo, crest, kit, logo, or official competition mark",
      ],
    })
  }
  return Array.from(playersById.values())
}

function canonicalPlayerId(playerId: string): string {
  return playerId.replace(/_(rw|lw|st)$/, "")
}
