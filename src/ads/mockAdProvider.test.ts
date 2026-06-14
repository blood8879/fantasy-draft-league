import { describe, expect, it } from "vitest"
import { createMockAdProvider } from "./mockAdProvider"

describe("mock ad provider", () => {
  it("grants the reward for every rewarded action", async () => {
    const provider = createMockAdProvider({ delayMs: 0 })

    expect(provider.isNative).toBe(false)
    expect(await provider.showRewarded("replay_match")).toEqual({ rewarded: true })
    expect(await provider.showRewarded("undo_pick")).toEqual({ rewarded: true })
    expect(await provider.showRewarded("scout_report")).toEqual({ rewarded: true })
  })

  it("resolves initialize and interstitial without throwing", async () => {
    const provider = createMockAdProvider({ delayMs: 0 })
    await expect(provider.initialize()).resolves.toBeUndefined()
    await expect(provider.showInterstitial()).resolves.toBeUndefined()
  })
})
