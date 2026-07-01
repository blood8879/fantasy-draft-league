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
  /** 이 케미로 능력치 보너스를 받는 선수 표시명 목록(상세 패널용). */
  readonly members: readonly string[]
}

/** 케미 등급(보너스 크기로 결정). 보너스가 클수록(=모으기 어려운 케미일수록) 높은 등급. */
export type ChemistryGrade = "bronze" | "silver" | "gold" | "diamond"

/**
 * 카드별 보너스(+N)를 등급으로 환산한다. UI 색/표시용(여러 케미 합산값도 처리).
 * 보너스 자체는 케미 종류·인원별로 차등(아래 computeChemistry)하므로, 모으기 어려운
 * 케미(동일 시즌·동일 클럽)는 같은 인원이라도 더 높은 등급/색으로 표시된다.
 */
export function chemistryGrade(bonus: number): ChemistryGrade {
  if (bonus >= 11) {
    return "diamond"
  }
  if (bonus >= 7) {
    return "gold"
  }
  if (bonus >= 4) {
    return "silver"
  }
  return "bronze"
}

/** 상세 패널의 선수 표시명: 시즌 카드면 "이름 2012"처럼 연도를 덧붙인다. */
function memberName(card: PlayerCard): string {
  return card.year === null || card.year === undefined ? card.label : `${card.label} ${card.year}`
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

/** 카드 한 장이 받을 수 있는 케미 보너스 총합 상한(능력치 점수 가산). 밸런스 안전장치.
 *  다이아 등급(+11)이 다른 케미와 겹쳐도 일부 합산 여지를 남기되 과도한 가산은 막는다. */
const MAX_CARD_BONUS = 14

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

  // 1) 국적 케미: 같은 나라 5명↑부터(동). 의도적으로 모아야 발동하도록 허들을 높였다.
  const byNation = new Map<string, PlayerCard[]>()
  for (const { card } of inputs) {
    const list = byNation.get(card.country) ?? []
    list.push(card)
    byNation.set(card.country, list)
  }
  for (const [nation, cards] of byNation) {
    if (cards.length < 5) {
      continue
    }
    // 국가 케미: 국가별 선수 풀이 넓어 상대적으로 쉬운 편 → 보너스 곡선은 완만.
    const bonus = cards.length >= 11 ? 9 : cards.length >= 9 ? 7 : cards.length >= 7 ? 5 : 3
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "nation")
    }
    links.push({
      kind: "nation",
      label: nation,
      count: cards.length,
      bonus,
      members: cards.map(memberName),
    })
  }

  // 2) 클럽 케미: 같은 클럽 3명↑부터(동). 2명만으로는 발동하지 않게 허들을 높였다.
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
    if (cards.length < 3) {
      continue
    }
    // 클럽 케미: 같은 클럽을 모으긴 어렵다 → 국가보다 가파른 보너스.
    const bonus = cards.length >= 6 ? 11 : cards.length >= 5 ? 9 : cards.length >= 4 ? 7 : 4
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "club")
    }
    links.push({
      kind: "club",
      label: club,
      count: cards.length,
      bonus,
      members: cards.map(memberName),
    })
  }

  // 2b) 동일 연도 케미: 같은 시즌(year) 3명↑부터(동). 모으기 매우 어려운 만큼 상위 등급 보상이 크다.
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
    if (cards.length < 3) {
      continue
    }
    // 동일 시즌 케미: 가장 모으기 어렵다 → 가장 가파른 보너스(적은 인원도 높은 등급).
    const bonus = cards.length >= 6 ? 14 : cards.length >= 5 ? 12 : cards.length >= 4 ? 10 : 7
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "era")
    }
    links.push({
      kind: "era",
      label: String(year),
      count: cards.length,
      bonus,
      members: cards.map(memberName),
    })
  }

  // 3) 리그 케미: 같은 리그 7명↑부터(동, 흔하니 약하게). "Other"는 제외.
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
    if (cards.length < 7) {
      continue
    }
    // 리그 케미: 가장 흔하다(쉽다) → 가장 작은 보너스.
    const bonus = cards.length >= 11 ? 4 : cards.length >= 9 ? 3 : 2
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "league")
    }
    links.push({
      kind: "league",
      label: league,
      count: cards.length,
      bonus,
      members: cards.map(memberName),
    })
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
    // 라인 케미: 같은 라인 3명이 전원 같은 국적이어야 한다(중간 난이도).
    const bonus = 5
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "line")
    }
    links.push({
      kind: "line",
      label: line,
      count: cards.length,
      bonus,
      members: cards.map(memberName),
    })
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
    // 라이벌 케미: 특정 라이벌 두 국가를 의도적으로 함께 넣어야 한다(중상 난이도).
    const bonus = 6
    for (const card of members) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "rivalry")
    }
    links.push({
      kind: "rivalry",
      label: rivalry.nameKey,
      count: members.length,
      bonus,
      members: members.map(memberName),
    })
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
    // 지역 케미: 같은 권역 2개국 이상(비교적 쉬움).
    const bonus = 3
    for (const card of members) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "region")
    }
    links.push({
      kind: "region",
      label: region.nameKey,
      count: members.length,
      bonus,
      members: members.map(memberName),
    })
  }

  // 7) 언더독 케미: 평균 전력(cost)이 낮은 구성에 소폭 보정.
  const avgCost = inputs.reduce((sum, { card }) => sum + card.cost, 0) / inputs.length
  if (avgCost < 66) {
    // 언더독 케미: 구성만 낮으면 붙는다(쉬움) → 작은 보너스.
    const bonus = avgCost < 58 ? 4 : 2
    for (const { card } of inputs) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "underdog")
    }
    links.push({
      kind: "underdog",
      label: "",
      count: inputs.length,
      bonus,
      members: inputs.map((item) => memberName(item.card)),
    })
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
