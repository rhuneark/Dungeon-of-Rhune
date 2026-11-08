/**
 * Seeded RNG (mulberry32). Loot rolls take an Rng so drops are reproducible
 * in tests / the Loot Lab, and so an item's seed can re-derive cosmetic
 * choices (rare names, icon variant) without storing them.
 */
export interface Rng {
    /** float in [0, 1) */
    next(): number;
    /** integer in [min, max] inclusive */
    int(min: number, max: number): number;
    /** true with probability p (0..1) */
    chance(p: number): boolean;
    pick<T>(arr: readonly T[]): T;
    /** weighted pick; returns index, or -1 if total weight is 0 */
    weighted(weights: readonly number[]): number;
}

export function createRng(seed: number = (Math.random() * 2 ** 32) >>> 0): Rng {
    let s = seed >>> 0;
    const next = () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rng: Rng = {
        next,
        int: (min, max) => min + Math.floor(next() * (max - min + 1)),
        chance: (p) => next() < p,
        pick: (arr) => arr[Math.floor(next() * arr.length)],
        weighted(weights) {
            let total = 0;
            for (const w of weights) total += Math.max(0, w);
            if (total <= 0) return -1;
            let r = next() * total;
            for (let i = 0; i < weights.length; i++) {
                r -= Math.max(0, weights[i]);
                if (r < 0) return i;
            }
            return weights.length - 1;
        },
    };
    return rng;
}

/** Shared default RNG for gameplay rolls that don't need reproducibility. */
export const worldRng = createRng();

let uidCounter = 0;
/** Short unique id for item instances. */
export function uid(prefix = 'i'): string {
    uidCounter = (uidCounter + 1) % 1e6;
    return `${prefix}${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
