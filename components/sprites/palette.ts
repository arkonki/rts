/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour. amount is in -1..1. */
export function shade(hex: string, amount: number): string {
    const n = parseInt(hex.replace('#', ''), 16);
    const target = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    const mix = (channel: number) => Math.round((target - channel) * p + channel);
    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export interface Palette {
    base: string;
    dark: string;
    light: string;
}

export const makePalette = (team: string): Palette => ({
    base: team,
    dark: shade(team, -0.45),
    light: shade(team, 0.4),
});

/** Stable pseudo-random number in [0, 1) from integer coordinates; used for deterministic art. */
export function hash2(x: number, y: number, seed = 0): number {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return ((h >>> 0) % 100000) / 100000;
}

/** Stable pseudo-random number in [0, 1) from a string. */
export function hashString(value: string): number {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
}
