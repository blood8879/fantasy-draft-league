import type { PlayerCard, RatingAxis } from "../data/schema"
import type { TacticType } from "../domain/types"

export type ChemistryKind = "nation" | "club" | "league" | "line" | "tactic" | "underdog"

/**
 * 활성화된 케미 한 건. label은 표시용 원본 값:
 * nation→국가명, club→클럽명, league→리그명(고유명사라 번역 안 함),
 * line→"def"|"mid"|"att", tactic→전술 식별자(한글 enum), underdog는 빈 값.
 */
export type ChemistryLink = {
  readonly kind: ChemistryKind
  readonly label: string
  readonly count: number
  readonly bonus: number
}

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

/** 전술별로 빛을 보는 핵심 능력 축. 이 축들이 강한 선수가 그 전술에서 케미를 받는다. */
const TACTIC_AXES: Readonly<Record<TacticType, readonly RatingAxis[]>> = {
  점유율: ["control", "creation"],
  "강한 압박": ["physical", "mobility"],
  역습: ["mobility", "progression"],
  로우블록: ["defense", "mental"],
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
export function computeChemistry(
  inputs: readonly ChemistryInput[],
  tactic: TacticType,
): ChemistryResult {
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
    const bonus = cards.length >= 4 ? 4 : cards.length >= 3 ? 3 : 2
    for (const card of cards) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "club")
    }
    links.push({ kind: "club", label: club, count: cards.length, bonus })
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

  // 5) 전술 케미: 전술 핵심 축이 강한 선수에게 보너스.
  const axes = TACTIC_AXES[tactic]
  let tacticFitCount = 0
  for (const { card } of inputs) {
    const avg = axes.reduce((sum, axis) => sum + card.internalScores[axis], 0) / axes.length
    // 임계를 높여 전술 케미를 더 특별하게 — 정말 그 전술에 특화된 선수만 받는다.
    const bonus = avg >= 88 ? 3 : avg >= 82 ? 2 : 0
    if (bonus > 0) {
      addBonus(bonusByCardId, kindBonus, card.id, bonus, "tactic")
      tacticFitCount += 1
    }
  }
  if (tacticFitCount >= 4) {
    links.push({ kind: "tactic", label: tactic, count: tacticFitCount, bonus: 1 })
  }

  // 6) 언더독 케미: 평균 전력(cost)이 낮은 구성에 소폭 보정.
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
