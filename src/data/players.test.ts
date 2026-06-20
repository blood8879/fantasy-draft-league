import { describe, expect, it } from "vitest"
import { playerCards, players } from "./seed"
import { validatePlayerDataset } from "./validatePlayerDataset"

describe("player seed data", () => {
  it("contains the Phase 2 minimum dataset size", () => {
    const uniquePlayerIds = new Set(players.map((player) => player.id))

    expect(players.length).toBeGreaterThanOrEqual(15)
    expect(uniquePlayerIds.size).toBeGreaterThanOrEqual(15)
    expect(playerCards.length).toBeGreaterThanOrEqual(45)
  })

  it("contains multiple year cards for selected players", () => {
    const henryCards = playerCards.filter((card) => card.playerId === "thierry_henry")
    const messiCards = playerCards.filter((card) => card.playerId === "lionel_messi")

    expect(henryCards.map((card) => card.year)).toEqual([2002, 2004])
    expect(messiCards.map((card) => card.year)).toEqual([2011, 2015, 2022])
  })

  it("passes data validation rules", () => {
    const result = validatePlayerDataset({ players, playerCards })

    expect(result).toEqual({ kind: "valid" })
  })

  it("does not expose placeholder player data", () => {
    const fakeMarker =
      /\b(depth|placeholder|synthetic|fictional|fake)\b|example\.com|internal-depth/i
    const visiblePlayerData = players.flatMap((player) => [
      player.displayName,
      ...player.publicSourceNotes,
      ...player.sourceRefs.map((sourceRef) => `${sourceRef.label} ${sourceRef.url}`),
      ...player.rightsRiskNotes,
    ])
    const visibleCardData = playerCards.flatMap((card) => [
      card.label,
      card.ratingRationale,
      card.ratingReviewer,
      ...card.tags,
    ])

    expect(
      [...visiblePlayerData, ...visibleCardData].filter((value) => fakeMarker.test(value)),
    ).toEqual([])
  })

  it("does not expose year-version labels or invent age for curated cards", () => {
    const curatedCards = playerCards.filter((card) => card.id.startsWith("curated_"))
    const curatedPlayers = players.filter((player) => player.id.startsWith("curated_"))

    expect(curatedCards.length).toBeGreaterThan(0)
    // 라벨에 연도를 노출하지 않고(연도는 별도 필드), 나이는 추정하지 않는다.
    expect(curatedCards.filter((card) => /^\d{4}\s/.test(card.label))).toEqual([])
    expect(curatedCards.filter((card) => card.age !== null)).toEqual([])
    expect(curatedPlayers.filter((player) => player.birthYear !== null)).toEqual([])
    // 시즌 카드의 연도는 합리적 범위(1950~2026)
    expect(
      curatedCards.filter((card) => card.year !== null && (card.year < 1950 || card.year > 2026)),
    ).toEqual([])
  })

  it("uses position-based OVR ranges for curated cards", () => {
    const curatedCards = playerCards.filter((card) => card.id.startsWith("curated_"))

    // 포지션별 OVR(cost)은 40~99 범위 안에 있어야 한다
    for (const card of curatedCards) {
      expect(card.cost).toBeGreaterThanOrEqual(40)
      expect(card.cost).toBeLessThanOrEqual(99)
    }

    // 최상위 아이콘은 Legend 레어도 + 높은 OVR로 노출된다
    const messi = curatedCards.find((card) => card.label === "Lionel Messi")
    expect(messi?.rarity).toBe("Legend")
    expect(messi?.cost ?? 0).toBeGreaterThanOrEqual(90)
  })

  it("uses only 2000-2026 years for verified season cards", () => {
    const seasonCards = playerCards.filter((card) => !card.id.startsWith("curated_"))

    expect(seasonCards.length).toBeGreaterThanOrEqual(160)
    expect(seasonCards.filter((card) => card.year === null)).toEqual([])
    expect(
      seasonCards.filter((card) => card.year !== null && (card.year < 2000 || card.year > 2026)),
    ).toEqual([])
    expect(seasonCards.map((card) => card.label)).not.toContain("1998 Ronaldo")
    expect(seasonCards.map((card) => card.label)).not.toContain("1999 Henry")
  })

  it("contains credible 2000-2026 season-card depth by draft position", () => {
    const seasonCards = playerCards.filter((card) => !card.id.startsWith("curated_"))
    const positions = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "ST", "LW"] as const

    for (const position of positions) {
      const cardsForPosition = seasonCards.filter((card) => card.positions.includes(position))
      expect(
        cardsForPosition.length,
        `${position} should have season-card depth`,
      ).toBeGreaterThanOrEqual(10)
    }
  })

  it("uses credible self-rated costs for named season cards", () => {
    const costById = new Map(playerCards.map((card) => [card.id, card.cost]))

    expect(costById.get("benzema_2022")).toBeGreaterThanOrEqual(90)
    expect(costById.get("ferran_torres_2021")).toBeGreaterThanOrEqual(78)
    expect(costById.get("antony_2022")).toBeGreaterThanOrEqual(75)
    expect(costById.get("benzema_2022")).toBeGreaterThan(costById.get("ferran_torres_2021") ?? 0)
  })
})
