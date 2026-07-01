import { positionOvr } from "../data/cardFactory"
import type { PlayerCard } from "../data/schema"

/**
 * 포지션 적합도 5등급.
 *
 * 기존 이진(1.0/0.62) getPositionFit을 대체하기 위한 해석기(G002에서 teamProfile에 배선). 주포지션이면 Natural(1.0),
 * 아니면 후보 포지션 OVR / 자기 최적 포지션 OVR 비율을 버킷팅해 등급/승수를 결정한다.
 * 순수 함수(점수+포지션만 의존) → 결정론.
 */

export type PositionFitGrade = "Natural" | "Accomplished" | "Competent" | "Awkward" | "Ineffectual"

export const GRADE_MULTIPLIER: Readonly<Record<PositionFitGrade, number>> = {
  Natural: 1.0,
  Accomplished: 0.9,
  Competent: 0.78,
  Awkward: 0.64,
  Ineffectual: 0.5,
}

export type FitResult = {
  readonly grade: PositionFitGrade
  readonly multiplier: number
}

/** 적합도 등급 임계(자기 최적 OVR 대비 비율). 변경 시 SIM_VERSION 범프 대상. */
export const FIT_THRESHOLDS = {
  accomplished: 0.95,
  competent: 0.88,
  awkward: 0.8,
} as const

function bucket(ratio: number): PositionFitGrade {
  if (ratio >= FIT_THRESHOLDS.accomplished) {
    return "Accomplished"
  }
  if (ratio >= FIT_THRESHOLDS.competent) {
    return "Competent"
  }
  if (ratio >= FIT_THRESHOLDS.awkward) {
    return "Awkward"
  }
  return "Ineffectual"
}

export function resolveFit(card: PlayerCard, acceptedPositions: readonly string[]): FitResult {
  if (card.positions.some((position) => acceptedPositions.includes(position))) {
    return { grade: "Natural", multiplier: GRADE_MULTIPLIER.Natural }
  }
  if (acceptedPositions.length === 0) {
    return { grade: "Ineffectual", multiplier: GRADE_MULTIPLIER.Ineffectual }
  }
  const bestOvr = Math.max(
    ...card.positions.map((position) => positionOvr(card.internalScores, position)),
  )
  const tryOvr = Math.max(
    ...acceptedPositions.map((position) => positionOvr(card.internalScores, position)),
  )
  const ratio = bestOvr <= 0 ? 0 : tryOvr / bestOvr
  const grade = bucket(ratio)
  return { grade, multiplier: GRADE_MULTIPLIER[grade] }
}
