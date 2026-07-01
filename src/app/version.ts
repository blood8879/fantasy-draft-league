/**
 * 시뮬레이션/데이터 버전.
 *
 * SIM_VERSION: 능력치 파생(attributes.ts의 BLEND/POSITION_BIAS/TAG_MOD), 포지션 적합도
 * (positionFit.ts 등급/임계), 또는 시뮬 소비 3경계(teamProfile dims, fixture scorer/assist)
 * 중 무엇이든 바뀌면 반드시 +1 한다. 데일리 PB는 동일 SIM_VERSION 내에서만 비교된다.
 * simVersionGate.test.ts의 콘텐츠 해시 스냅샷이 이 규율을 강제한다.
 *
 * DATASET_VERSION: curatedPlayerSeasons.json(선수 데이터)이 바뀌면 +1 한다.
 */

export const SIM_VERSION = 1
export const DATASET_VERSION = 1
