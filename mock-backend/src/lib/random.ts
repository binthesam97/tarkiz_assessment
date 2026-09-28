/**
 * Mulberry32 — a small seeded PRNG. Generated datasets must be deterministic so
 * that paginated reads (e.g. the 50k catalog) return the same record for the
 * same index across requests and server restarts.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], random: () => number = Math.random): T {
  return items[Math.floor(random() * items.length)]!;
}

export function randomId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
