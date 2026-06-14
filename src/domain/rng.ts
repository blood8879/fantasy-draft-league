export type Rng = () => number

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (const character of seed) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function createRng(seed: string): Rng {
  let state = hashSeed(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function pickIndex(rng: Rng, length: number): number {
  return Math.min(length - 1, Math.floor(rng() * length))
}

export function shuffle<T>(items: readonly T[], rng: Rng): readonly T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const left = copy[index] as T
    copy[index] = copy[swapIndex] as T
    copy[swapIndex] = left
  }
  return copy
}

export function weightedPick<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  rng: Rng,
): T | undefined {
  const weights = items.map((item) => Math.max(0, weightOf(item)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (items.length === 0) {
    return undefined
  }
  if (total <= 0) {
    return items[pickIndex(rng, items.length)]
  }
  let threshold = rng() * total
  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index] as number
    if (threshold <= 0) {
      return items[index]
    }
  }
  return items[items.length - 1]
}
