import type { PlayerCard } from "../data/schema"

export type ChemistryKind =
  | "nation"
  | "club"
  | "league"
  | "line"
  | "underdog"
  | "rivalry"
  | "region"
  | "era"

/**
 * 활성화된 케미 한 건. label은 표시용 원본 값:
 * nation→국가명, club→클럽명, league→리그명(고유명사라 번역 안 함),
 * line→"def"|"mid"|"att", rivalry·region→i18n 키, underdog는 빈 값.
 */
export type ChemistryLink = {
  readonly kind: ChemistryKind
  readonly label: string
  readonly count: number
  readonly bonus: number
}

/** 사이 안 좋은 두 국가가 함께 있으면 경쟁심으로 시너지(긍정 케미). */
const RIVALRIES: readonly { readonly a: string; readonly b: string; readonly nameKey: string }[] = [
  { a: "Argentina", b: "England", nameKey: "chem.rival.argEng" },
  { a: "Brazil", b: "Argentina", nameKey: "chem.rival.braArg" },
  { a: "France", b: "England", nameKey: "chem.rival.fraEng" },
  { a: "Germany", b: "Netherlands", nameKey: "chem.rival.gerNed" },
  { a: "England", b: "Germany", nameKey: "chem.rival.engGer" },
  { a: "Brazil", b: "Uruguay", nameKey: "chem.rival.braUru" },
]

/** 같은 권역(역사·문화적으로 가까운) 국가들이 모이면 우호 케미. */
const REGIONS: readonly { readonly countries: readonly string[]; readonly nameKey: string }[] = [
  { countries: ["Spain", "Portugal"], nameKey: "chem.region.iberia" },
  { countries: ["Netherlands", "Belgium"], nameKey: "chem.region.lowlands" },
  { countries: ["Denmark", "Sweden", "Norway"], nameKey: "chem.region.scandinavia" },
  { countries: ["Croatia", "Serbia"], nameKey: "chem.region.balkans" },
]

export type ChemistryInput = {
  readonly card: PlayerCard
  readonly slotLabel: string
}

export type ChemistryResult = {
  readonly score: number
  readonly bonusByCardId: ReadonlyMap<string, number>
  /** 카드별로 가장 큰 보너스를 준 케미 종류(피치 색 구분용). */
  readonly dominantKindByCardId: ReadonlyMap<string, ChemistryKind>
  readonly links: readonly ChemistryLink[]
}

/** 카드 한 장이 받을 수 있는 케미 보너스 총합 상한(능력치 점수 가산). 밸런스 안전장치. */
const MAX_CARD_BONUS = 12

const EMPTY: ChemistryResult = {
  score: 75,
  bonusByCardId: new Map(),
  dominantKindByCardId: new Map(),
  links: [],
}

type Line = "def" | "mid" | "att"

function lineOf(slotLabel: string): Line | null {
  const s = slotLabel.toUpperCase()
  // 윙백(RWB/LWB)·풀백·센터백·골키퍼는 수비 라인.
  if (s.includes("WB") || s.includes("GK") || s === "RB" || s === "LB" || s.includes("CB")) {
    return "def"
  }
  if (
    s.includes("DM") ||
    s.includes("CM") ||
    s.includes("AM") ||
    s.includes("RM") ||
    s.includes("LM")
  ) {
    return "mid"
  }
  if (s.includes("LW") || s.includes("RW") || s.includes("ST") || s.includes("CF")) {
    return "att"
  }
  return null
}

type KindBonusMap = Map<string, Map<ChemistryKind, number>>

function addBonus(
  totals: Map<string, number>,
  kindBonus: KindBonusMap,
  cardId: string,
  amount: number,
  kind: ChemistryKind,
): void {
  totals.set(cardId, Math.min(MAX_CARD_BONUS, (totals.get(cardId) ?? 0) + amount))
  const byKind = kindBonus.get(cardId) ?? new Map<ChemistryKind, number>()
  byKind.set(kind, (byKind.get(kind) ?? 0) + amount)
  kindBonus.set(cardId, byKind)
}

/**
 * 스쿼드(부분 스쿼드 포함)의 케미를 계산한다. 같은 국적/클럽/리그/라인이 모이거나,
 * 전술에 맞는 강점을 가졌거나, 약체 구성이면 해당 선수의 능력치에 소폭 보너스를 준다.
 * 보너스는 카드별 +8 이내로 제한해 밸런스를 크게 흔들지 않는다.
 */
export function computeChemistry(inputs: readonly ChemistryInput[]): ChemistryResult {
  if (inputs.length === 0) {
    return EMPTY
  }
  const bonusByCardId = new Map<string, number>()
  const kindBonus: KindBonusMap = new Map()
  const links: ChemistryLink[] = []

  // 1) 국적 케미: 같은 나라 4명↑.
  const byNation = new Map<string, PlayerCard[]>()
  for (const { card } of inputs) {
    const list = byNation.get(card.country) ?? []
    list.push(card)
    byNation.set(card.country, list)
  }
  for (const [nation, cards] of byNation) {
    if (cards.length < 4) {
      continue
    }
    const bonus = cards.length >= 8 ? 7 : cards.length >= 6 ? 5 : 3
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "nation")
    }
    links.push({ kind: "nation", label: nation, count: cards.length, bonus })
  }

  // 2) 클럽 케미: 같은 클럽 2명↑(데이터가 좁으니 적은 인원에 보상).
  const byClub = new Map<string, PlayerCard[]>()
  for (const { card } of inputs) {
    if (card.club === undefined) {
      continue
    }
    const list = byClub.get(card.club) ?? []
    list.push(card)
    byClub.set(card.club, list)
  }
  for (const [club, cards] of byClub) {
    if (cards.length < 2) {
      continue
    }
    // 시즌 카드 시스템에서 같은 클럽을 모으긴 더 어려우므로 가중치를 높였다.
    const bonus = cards.length >= 4 ? 6 : cards.length >= 3 ? 5 : 3
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "club")
    }
    links.push({ kind: "club", label: club, count: cards.length, bonus })
  }

  // 2b) 동일 연도 케미: 같은 시즌(year)의 선수를 모으면 큰 보너스(모으기 매우 어려움).
  const byYear = new Map<number, PlayerCard[]>()
  for (const { card } of inputs) {
    if (card.year === null || card.year === undefined) {
      continue
    }
    const list = byYear.get(card.year) ?? []
    list.push(card)
    byYear.set(card.year, list)
  }
  for (const [year, cards] of byYear) {
    if (cards.length < 2) {
      continue
    }
    const bonus = cards.length >= 4 ? 7 : cards.length >= 3 ? 5 : 3
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "era")
    }
    links.push({ kind: "era", label: String(year), count: cards.length, bonus })
  }

  // 3) 리그 케미: 같은 리그 6명↑(흔하니 약하게). "Other"는 제외.
  const byLeague = new Map<string, PlayerCard[]>()
  for (const { card } of inputs) {
    if (card.league === undefined || card.league === "Other") {
      continue
    }
    const list = byLeague.get(card.league) ?? []
    list.push(card)
    byLeague.set(card.league, list)
  }
  for (const [league, cards] of byLeague) {
    if (cards.length < 6) {
      continue
    }
    const bonus = cards.length >= 9 ? 3 : 2
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "league")
    }
    links.push({ kind: "league", label: league, count: cards.length, bonus })
  }

  // 4) 라인 케미: 같은 라인(수비/중원/공격) 3명↑이 전원 같은 국적이면 연계 보너스.
  const byLine = new Map<Line, PlayerCard[]>()
  for (const { card, slotLabel } of inputs) {
    const line = lineOf(slotLabel)
    if (line === null) {
      continue
    }
    const list = byLine.get(line) ?? []
    list.push(card)
    byLine.set(line, list)
  }
  for (const [line, cards] of byLine) {
    if (cards.length < 3) {
      continue
    }
    const allSameNation = cards.every((card) => card.country === cards[0]?.country)
    if (!allSameNation) {
      continue
    }
    const bonus = 3
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "line")
    }
    links.push({ kind: "line", label: line, count: cards.length, bonus })
  }

  // 5) 라이벌 케미: 사이 안 좋은 두 국가가 함께 있으면 경쟁심으로 시너지(긍정).
  for (const rivalry of RIVALRIES) {
    const members = inputs
      .map((item) => item.card)
      .filter((card) => card.country === rivalry.a || card.country === rivalry.b)
    const hasA = members.some((card) => card.country === rivalry.a)
    const hasB = members.some((card) => card.country === rivalry.b)
    if (!hasA || !hasB) {
      continue
    }
    const bonus = 3
    for (const card of members) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "rivalry")
    }
    links.push({ kind: "rivalry", label: rivalry.nameKey, count: members.length, bonus })
  }

  // 6) 지역 우호 케미: 같은 권역의 두 나라 이상이 모이면 보너스.
  for (const region of REGIONS) {
    const members = inputs
      .map((item) => item.card)
      .filter((card) => region.countries.includes(card.country))
    const distinctCountries = new Set(members.map((card) => card.country))
    if (distinctCountries.size < 2) {
      continue
    }
    const bonus = 2
    for (const card of members) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "region")
    }
    links.push({ kind: "region", label: region.nameKey, count: members.length, bonus })
  }

  // 7) 언더독 케미: 평균 전력(cost)이 낮은 구성에 소폭 보정.
  const avgCost = inputs.reduce((sum, { card }) => sum + card.cost, 0) / inputs.length
  if (avgCost < 70) {
    const bonus = avgCost < 62 ? 4 : 3
    for (const { card } of inputs) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "underdog")
    }
    links.push({ kind: "underdog", label: "", count: inputs.length, bonus })
  }

  // 케미 점수(0~100): 카드별 평균 보너스를 중립 75 기준으로 환산. fixture와 UI가 함께 소비.
  let total = 0
  for (const { card } of inputs) {
    total += bonusByCardId.get(card.id) ?? 0
  }
  const avgBonus = total / inputs.length
  const score = Math.max(70, Math.min(100, Math.round(75 + avgBonus * 3)))

  // 카드별로 가장 큰 보너스를 준 케미 종류를 골라 둔다(피치 색 구분용).
  const dominantKindByCardId = new Map<string, ChemistryKind>()
  for (const [cardId, byKind] of kindBonus) {
    let bestKind: ChemistryKind | undefined
    let bestValue = -1
    for (const [kind, value] of byKind) {
      if (value > bestValue) {
        bestValue = value
        bestKind = kind
      }
    }
    if (bestKind !== undefined) {
      dominantKindByCardId.set(cardId, bestKind)
    }
  }

  links.sort((a, b) => b.bonus - a.bonus || b.count - a.count)
  return { score, bonusByCardId, dominantKindByCardId, links }
}
