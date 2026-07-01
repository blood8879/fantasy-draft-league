import type { GameMode } from "../domain/game"
import type { PickLog, RunScore, RunScoreBreakdown } from "./runScore"
import { DATASET_VERSION, SIM_VERSION } from "./version"

/**
 * 데일리 개인최고기록(PB) 저장소.
 *
 * 자유 플레이 저장(SAVE_KEY)과 분리된 별도 키를 쓴다 → NEW_GAME/saveGame이 PB를 건드리지
 * 않는다. 비교는 동일 {simVersion, datasetVersion}일 때만 유효(버전 불일치 시 새 네임스페이스로
 * 취급, 교차 비교 금지). newTotal > bestTotal일 때만 교체한다.
 */

const DAILY_KEY = "legend-draft-league-daily-v1"

export type DailyPbRecord = {
  readonly seed: string
  readonly simVersion: number
  readonly datasetVersion: number
  readonly format: GameMode
  readonly bestTotal: number
  readonly bestBreakdown: RunScoreBreakdown
  readonly bestAchievedAt: string
  readonly attempts: number
  readonly pickLog: PickLog
}

type DailyPbStore = {
  readonly storeVersion: 1
  readonly records: Record<string, DailyPbRecord>
}

const EMPTY_STORE: DailyPbStore = { storeVersion: 1, records: {} }

function loadStore(): DailyPbStore {
  try {
    const raw = globalThis.localStorage?.getItem(DAILY_KEY)
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw) as DailyPbStore
      if (parsed.storeVersion === 1 && typeof parsed.records === "object") {
        return parsed
      }
    }
  } catch {
    // 손상 시 빈 저장소로 폴백(게임 지속)
  }
  return EMPTY_STORE
}

function saveStore(store: DailyPbStore): void {
  try {
    globalThis.localStorage?.setItem(DAILY_KEY, JSON.stringify(store))
  } catch {
    // 저장 실패해도 게임은 계속된다
  }
}

/** 현재 버전과 일치하는 시드별 PB를 읽는다(불일치 시 undefined = 새 네임스페이스). */
export function loadDailyPb(seed: string): DailyPbRecord | undefined {
  const record = loadStore().records[seed]
  if (
    record === undefined ||
    record.simVersion !== SIM_VERSION ||
    record.datasetVersion !== DATASET_VERSION
  ) {
    return undefined
  }
  return record
}

export type CommitResult = {
  readonly isNewRecord: boolean
  readonly bestTotal: number
  readonly attempts: number
}

/** 데일리 결과를 PB에 반영한다. newTotal>best일 때만 교체하며 시도 횟수는 항상 증가. */
export function commitDailyResult(
  seed: string,
  format: GameMode,
  score: RunScore,
  pickLog: PickLog,
  now: number = Date.now(),
): CommitResult {
  const store = loadStore()
  const existing = loadDailyPb(seed)
  const attempts = (existing?.attempts ?? 0) + 1
  const isNewRecord = existing === undefined || score.total > existing.bestTotal
  const bestTotal = isNewRecord ? score.total : existing.bestTotal
  const record: DailyPbRecord = {
    seed,
    simVersion: SIM_VERSION,
    datasetVersion: DATASET_VERSION,
    format,
    bestTotal,
    bestBreakdown: isNewRecord ? score.breakdown : existing.bestBreakdown,
    bestAchievedAt: isNewRecord ? new Date(now).toISOString() : existing.bestAchievedAt,
    attempts,
    pickLog: isNewRecord ? pickLog : existing.pickLog,
  }
  saveStore({ storeVersion: 1, records: { ...store.records, [seed]: record } })
  return { isNewRecord, bestTotal, attempts }
}
