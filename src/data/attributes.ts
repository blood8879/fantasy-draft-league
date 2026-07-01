import type { AttributeKey, PlayerAttributes, PlayerCard, RatingAxis } from "./schema"
import { attributeKeys } from "./schema"

/**
 * FM식 세분 속성 파생.
 *
 * 8축(internalScores)을 14개 속성으로 결정론 변환한다. 핵심은 동일한 8축이라도
 * `mainPos`(직교 입력)에 따라 다른 속성 벡터가 나오게 하는 것 — 8축 단독 선형 remap은
 * 정보 이득이 0이라 "겉치레 깊이"가 되므로, POSITION_BIAS를 통해 포지션 정체성을 주입한다.
 * (age는 데이터에 없어 사용하지 않는다.)
 */

/** 속성별 8축 가중치(합 ~1.0). */
export const BLEND: Readonly<Record<AttributeKey, Partial<Record<RatingAxis, number>>>> = {
  finishing: { scoring: 0.85, mental: 0.15 },
  longShots: { scoring: 0.6, progression: 0.4 },
  passing: { creation: 0.55, control: 0.45 },
  dribbling: { progression: 0.5, mobility: 0.3, control: 0.2 },
  firstTouch: { control: 0.6, creation: 0.4 },
  tackling: { defense: 0.7, physical: 0.3 },
  marking: { defense: 0.6, mental: 0.4 },
  positioning: { mental: 0.5, scoring: 0.3, defense: 0.2 },
  vision: { creation: 0.7, progression: 0.3 },
  composure: { mental: 0.6, control: 0.4 },
  workRate: { mental: 0.5, mobility: 0.5 },
  pace: { mobility: 0.8, physical: 0.2 },
  stamina: { mobility: 0.6, mental: 0.4 },
  strength: { physical: 0.8, defense: 0.2 },
}

/** 포지션 정체성 보정(±6). 동일 8축 두 선수가 mainPos로 갈리는 직교 레버. */
export const POSITION_BIAS: Readonly<Record<string, Partial<Record<AttributeKey, number>>>> = {
  GK: { composure: 4, positioning: 4, finishing: -6, marking: -6, tackling: -4 },
  CB: { marking: 6, strength: 5, tackling: 4, finishing: -6, vision: -4, pace: -3 },
  RB: { pace: 5, stamina: 4, workRate: 4, marking: 2, finishing: -4 },
  LB: { pace: 5, stamina: 4, workRate: 4, marking: 2, finishing: -4 },
  DM: { tackling: 5, marking: 4, passing: 3, stamina: 3, finishing: -5, dribbling: -3 },
  CM: { passing: 5, stamina: 5, vision: 3, workRate: 3, finishing: -2 },
  AM: { vision: 5, passing: 4, dribbling: 4, finishing: 2, tackling: -4, marking: -4 },
  RW: {
    pace: 6,
    dribbling: 6,
    firstTouch: 3,
    finishing: 2,
    tackling: -5,
    marking: -5,
    strength: -3,
  },
  LW: {
    pace: 6,
    dribbling: 6,
    firstTouch: 3,
    finishing: 2,
    tackling: -5,
    marking: -5,
    strength: -3,
  },
  ST: {
    finishing: 6,
    positioning: 6,
    strength: 3,
    pace: 2,
    tackling: -6,
    marking: -6,
    passing: -3,
  },
}

/** 레전드 카드는 침착성/활동량에 소폭 가산(다른 신호가 없는 보조 modifier). */
export const LEGEND_TAG_MOD: Partial<Record<AttributeKey, number>> = { composure: 2, workRate: 2 }

function clamp40_99(value: number): number {
  return Math.max(40, Math.min(99, Math.round(value)))
}

function deriveOne(
  attr: AttributeKey,
  scores: Readonly<Record<RatingAxis, number>>,
  mainPos: string,
  isLegend: boolean,
): number {
  const blend = BLEND[attr]
  let base = 0
  for (const axis of Object.keys(blend) as RatingAxis[]) {
    base += (blend[axis] ?? 0) * scores[axis]
  }
  const bias = POSITION_BIAS[mainPos]?.[attr] ?? 0
  const tag = isLegend ? (LEGEND_TAG_MOD[attr] ?? 0) : 0
  return clamp40_99(base + bias + tag)
}

const memo = new Map<string, PlayerAttributes>()

/** 카드의 14속성을 결정론적으로 파생한다(cardId로 메모이즈). */
export function deriveAttributes(card: PlayerCard): PlayerAttributes {
  const cached = memo.get(card.id)
  if (cached !== undefined) {
    return cached
  }
  const isLegend = card.tags.includes("legend_card")
  const result = {} as Record<AttributeKey, number>
  for (const attr of attributeKeys) {
    result[attr] = deriveOne(attr, card.internalScores, card.mainPos, isLegend)
  }
  const frozen: PlayerAttributes = Object.freeze(result)
  memo.set(card.id, frozen)
  return frozen
}

/** 테스트 전용: 메모 캐시 초기화. */
export function __resetAttributeMemoForTest(): void {
  memo.clear()
}
