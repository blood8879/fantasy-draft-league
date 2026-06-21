import { createPlayerCardWithScores, positionOvr } from "./cardFactory"
import { type CuratedTier, tierRarity } from "./curatedPlayerRatings"
import seasonsData from "./curatedPlayerSeasons.json"
import type { Player, PlayerCard, RatingAxis } from "./schema"

type SeasonEntry = {
  readonly country: string
  readonly mainPos: string
  readonly positions: readonly string[]
  readonly legend: boolean
  readonly seasons: readonly {
    readonly year: number | null
    readonly club: string
    readonly league: string
    readonly tier: string
    readonly skills: readonly number[]
  }[]
}

const data = seasonsData as Record<string, SeasonEntry>

const roleByPosition: Readonly<Record<string, string>> = {
  GK: "Goalkeeper",
  RB: "Fullback",
  LB: "Fullback",
  CB: "Defender",
  DM: "Anchor",
  CM: "Midfielder",
  AM: "Playmaker",
  RW: "Winger",
  LW: "Winger",
  ST: "Forward",
}

/** "Lionel Messi", "Giorgio Chiellini (LB)" → 표시용 깨끗한 이름 */
function cleanName(key: string): string {
  return key.replace(/\s*\([A-Z]+\)\s*$/, "")
}

function playerId(name: string, mainPos: string): string {
  return `curated_${mainPos.toLowerCase()}_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`
}

function toScores(skills: readonly number[]): Record<RatingAxis, number> {
  return {
    scoring: skills[0] ?? 60,
    creation: skills[1] ?? 60,
    progression: skills[2] ?? 60,
    control: skills[3] ?? 60,
    defense: skills[4] ?? 60,
    physical: skills[5] ?? 60,
    mobility: skills[6] ?? 60,
    mental: skills[7] ?? 60,
  }
}

/** 시즌 OVR로 등급(tier)을 일관되게 산출한다(에이전트가 준 tier 인플레 방지). */
function ovrToTier(ovr: number): CuratedTier {
  if (ovr >= 96) {
    return "goat"
  }
  if (ovr >= 92) {
    return "icon"
  }
  if (ovr >= 87) {
    return "legend"
  }
  if (ovr >= 81) {
    return "elite"
  }
  if (ovr >= 74) {
    return "strong"
  }
  if (ovr >= 67) {
    return "regular"
  }
  return "squad"
}

function buildCards(): readonly PlayerCard[] {
  const cards: PlayerCard[] = []
  for (const [key, entry] of Object.entries(data)) {
    const name = cleanName(key)
    const pid = playerId(name, entry.mainPos)
    const role = roleByPosition[entry.mainPos] ?? "Player"
    entry.seasons.forEach((season, index) => {
      const scores = toScores(season.skills)
      const cost = positionOvr(scores, entry.mainPos)
      const tier = ovrToTier(cost)
      const idSuffix = season.year === null ? `career${index}` : String(season.year)
      cards.push(
        createPlayerCardWithScores(
          {
            id: `${pid}_${idSuffix}`,
            playerId: pid,
            label: name,
            year: season.year,
            age: null,
            country: entry.country,
            club: season.club,
            league: season.league,
            eligibleEra: entry.legend ? "career peak" : String(season.year ?? "season"),
            positions: entry.positions,
            roles: [role],
            tags: ["curated_pool", entry.legend ? "legend_card" : "season_card"],
            cost,
            rarity: tierRarity(tier),
            ratingRationale: `Curated ${entry.legend ? "career-peak" : `${season.year} season`} card for ${name} (${entry.mainPos}); attributes are independently estimated from broadly known public reputation, no photo/crest/official mark asserted.`,
            ratingReviewer: "curated-seasons-v1",
            ratingStatus: "draft",
          },
          scores,
        ),
      )
    })
  }
  return cards
}

function buildPlayers(): readonly Player[] {
  const seen = new Map<string, Player>()
  for (const [key, entry] of Object.entries(data)) {
    const name = cleanName(key)
    const pid = playerId(name, entry.mainPos)
    if (seen.has(pid)) {
      continue
    }
    seen.set(pid, {
      id: pid,
      displayName: name,
      country: entry.country,
      birthYear: null,
      primaryPositions: [...entry.positions],
      publicSourceNotes: ["Curated public footballer name and broad positions only"],
      sourceRefs: [
        {
          type: "biography",
          label: `${name} public career summary`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replaceAll(" ", "_"))}`,
        },
      ],
      rightsRiskNotes: ["Text-only player name; no photo, crest, kit, logo, or official mark"],
    })
  }
  return Array.from(seen.values())
}

export const curatedPoolPlayers: readonly Player[] = buildPlayers()
export const curatedPoolCards: readonly PlayerCard[] = buildCards()
