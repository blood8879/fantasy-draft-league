import { describe, expect, it } from "vitest"
import { SIM_VERSION } from "../app/version"
import { BLEND, LEGEND_TAG_MOD, POSITION_BIAS } from "../data/attributes"
import {
  ASSIST_ATTR_WEIGHTS,
  HOME_XG_BONUS,
  SCORER_ATTR_WEIGHTS,
  SOLO_GOAL_CHANCE,
  positionAssistFactor,
  positionGoalFactor,
} from "./fixture"
import { FIT_THRESHOLDS, GRADE_MULTIPLIER } from "./positionFit"
import { PROFILE_DIM_ATTRIBUTES, TACTIC_BOOST } from "./teamProfile"

/**
 * 콘텐츠 해시 스냅샷 게이트(A-T9).
 *
 * 능력치/적합도/시뮬 소비 모델(BLEND·POSITION_BIAS·TAG_MOD·적합도 임계/승수·프로필 dim
 * 매핑·scorer/assist 가중·HOME_XG_BONUS·SOLO_GOAL_CHANCE·positionGoal/AssistFactor·전술 보정)
 * 중 무엇이든 바뀌면 모델 해시가 달라진다. (xG/포아송 코어 공식 내부와 chemistry 모델은
 * 동결-정책 대상이라 변경 시 version.ts 규약에 따라 수동으로 SIM_VERSION을 올린다.)
 * 그러면 이 테스트가 실패하므로, 모델을 바꾼 사람은 반드시 SIM_VERSION을 올리고
 * MODEL_HASH_BY_VERSION에 새 버전 해시를 추가해야 한다(데일리 PB 호환성 보호).
 */

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

const model = {
  BLEND,
  POSITION_BIAS,
  LEGEND_TAG_MOD,
  FIT_THRESHOLDS,
  GRADE_MULTIPLIER,
  PROFILE_DIM_ATTRIBUTES,
  SCORER_ATTR_WEIGHTS,
  ASSIST_ATTR_WEIGHTS,
  HOME_XG_BONUS,
  SOLO_GOAL_CHANCE,
  positionGoalFactor,
  positionAssistFactor,
  TACTIC_BOOST,
}

// 모델 변경 시: SIM_VERSION을 올리고 새 항목을 추가한다(이전 버전 항목은 보존).
const MODEL_HASH_BY_VERSION: Readonly<Record<number, string>> = {
  1: "decbe8b0",
}

describe("SIM_VERSION content-hash gate", () => {
  it("현재 모델 해시는 현재 SIM_VERSION에 기록된 해시와 일치한다", () => {
    const hash = fnv1a(stableStringify(model))
    expect(MODEL_HASH_BY_VERSION[SIM_VERSION]).toBe(hash)
  })
})
