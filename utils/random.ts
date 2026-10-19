export type Rng = () => number;

/** Small seedable PRNG (mulberry32). Returns floats in [0, 1) like Math.random. */
export function createRng(seed: number): Rng {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Picks a fresh seed. Call from UI code, never from the reducer. */
export function newSeed(): number {
    return Math.floor(Math.random() * 0xFFFFFFFF) >>> 0;
}
