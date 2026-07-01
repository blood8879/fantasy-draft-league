import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  REWARDED_COOLDOWN_MS,
  REWARDED_DAILY_CAP,
  REWARDED_SESSION_CAP,
  __resetAdGuardSessionForTest,
  canShowRewarded,
  recordRewardedShown,
} from "./adGuard"

function memStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
    clear: () => {
      map.clear()
    },
  }
}

const globalRef = globalThis as unknown as { localStorage?: unknown }

// 2026-06-30T12:00:00Z 고정 기준 시각(같은 UTC 일자 내).
const BASE = Date.UTC(2026, 5, 30, 12, 0, 0)

describe("ad guard rate limit", () => {
  let store: ReturnType<typeof memStorage>
  let original: unknown

  beforeEach(() => {
    store = memStorage()
    original = globalRef.localStorage
    globalRef.localStorage = store
    __resetAdGuardSessionForTest()
  })

  afterEach(() => {
    globalRef.localStorage = original
  })

  it("첫 호출은 허용된다", () => {
    expect(canShowRewarded(BASE)).toEqual({ allowed: true })
  })

  it("쿨다운 내에는 cooldown 사유로 차단하고 retryAfterMs를 돌려준다", () => {
    recordRewardedShown(BASE)
    const decision = canShowRewarded(BASE + 30_000)
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.reason).toBe("cooldown")
      expect(decision.retryAfterMs).toBe(REWARDED_COOLDOWN_MS - 30_000)
    }
  })

  it("쿨다운이 지나면 다시 허용된다", () => {
    recordRewardedShown(BASE)
    expect(canShowRewarded(BASE + REWARDED_COOLDOWN_MS)).toEqual({ allowed: true })
  })

  it("세션 상한을 넘으면 session_cap으로 차단한다", () => {
    for (let i = 0; i < REWARDED_SESSION_CAP; i += 1) {
      const now = BASE + i * REWARDED_COOLDOWN_MS
      expect(canShowRewarded(now).allowed).toBe(true)
      recordRewardedShown(now)
    }
    const decision = canShowRewarded(BASE + REWARDED_SESSION_CAP * REWARDED_COOLDOWN_MS)
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.reason).toBe("session_cap")
    }
  })

  it("일일 상한을 넘으면 daily_cap으로 차단한다(세션 리셋해도 유지)", () => {
    for (let i = 0; i < REWARDED_DAILY_CAP; i += 1) {
      __resetAdGuardSessionForTest() // 세션 상한이 먼저 걸리지 않게 격리
      recordRewardedShown(BASE + i * REWARDED_COOLDOWN_MS)
    }
    __resetAdGuardSessionForTest()
    const decision = canShowRewarded(BASE + REWARDED_DAILY_CAP * REWARDED_COOLDOWN_MS)
    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.reason).toBe("daily_cap")
    }
  })

  it("recordRewardedShown은 일일 카운트를 localStorage에 누적한다", () => {
    recordRewardedShown(BASE)
    __resetAdGuardSessionForTest()
    // 같은 날, 쿨다운 경과 후: 세션은 비었지만 일일 카운트(1)가 보존되어야 한다.
    expect(canShowRewarded(BASE + REWARDED_COOLDOWN_MS).allowed).toBe(true)
    const raw = store.getItem("legend-draft-league-ad-guard-v1")
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw as string) as { count: number }
    expect(parsed.count).toBe(1)
  })
})
