import { describe, expect, it } from "vitest"
import type { Competition } from "../domain/competition"
import { type GameState, gameReducer, initialGameState } from "./gameStore"

function startDaily(isDaily: boolean): GameState {
  return gameReducer(initialGameState, {
    type: "START_GAME",
    mode: "컵",
    clubName: "Test",
    formation: "4-3-3",
    tactic: "점유율",
    seed: "daily-2026-06-30",
    isDaily,
  })
}

describe("gameStore daily mode", () => {
  it("START_GAME isDaily 플래그를 상태에 반영한다", () => {
    expect(startDaily(true).isDaily).toBe(true)
    expect(startDaily(false).isDaily).toBe(false)
    // 액션에 isDaily 미지정 시 기본 false
    const noFlag = gameReducer(initialGameState, {
      type: "START_GAME",
      mode: "리그",
      clubName: "T",
      formation: "4-3-3",
      tactic: "점유율",
      seed: "s",
    })
    expect(noFlag.isDaily).toBe(false)
  })

  it("데일리 모드에서 REPLAY_ROUND는 no-op(보상광고 재경기 비활성)", () => {
    const base = startDaily(true)
    const withCheckpoint: GameState = {
      ...base,
      phase: "report",
      replayCheckpoint: { competition: {} as Competition, nonce: 0 },
    }
    const after = gameReducer(withCheckpoint, { type: "REPLAY_ROUND" })
    expect(after).toBe(withCheckpoint) // 동일 참조 = 무변경 no-op
  })

  it("데일리 모드에서도 REROLL_CANDIDATES는 허용(실력 레버)", () => {
    const base = startDaily(true)
    const rerolled = gameReducer(base, { type: "REROLL_CANDIDATES" })
    expect(rerolled.rerollNonce).toBe(base.rerollNonce + 1)
    expect(rerolled.isDaily).toBe(true)
  })

  it("자유 플레이(비데일리)는 isDaily=false로 영향 없음", () => {
    const free = startDaily(false)
    expect(free.isDaily).toBe(false)
    expect(free.phase).toBe("draft")
  })
})
