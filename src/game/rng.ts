/** Seeded pseudo-random generator (mulberry32). Same seed → same run. */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for a normal (non-test) run. */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** Fixed simulation step: gameplay always advances in 1/60 s slices. */
export const SIM_STEP = 1 / 60;
/** Never simulate more than this much real time in one frame (tab switches, hitches). */
export const MAX_FRAME = 0.25;
