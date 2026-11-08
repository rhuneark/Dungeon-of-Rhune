/**
 * Texture access for the generated art (see tools/art). Slices character
 * sheets and tile atlases into cached sub-textures.
 */
import { Assets, Rectangle, Texture } from 'pixi.js';
import { ART } from '../../assets/art.generated.ts';

export type Dir8 = 'south' | 'south-east' | 'east' | 'north-east' | 'north' | 'north-west' | 'west' | 'south-west';
export const DIRS8: Dir8[] = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

/** Direction from a movement vector (screen space, +y is south). */
export function dirFromVector(dx: number, dy: number): Dir8 {
    const a = Math.atan2(dy, dx);
    const i = (Math.round(a / (Math.PI / 4)) + 8) % 8;
    return DIRS8[i];
}

const cache = new Map<string, Texture>();
const sliceCache = new Map<string, Texture[]>();

function base(alias: string): Texture {
    const t = Assets.get<Texture>(alias);
    return t ?? Texture.EMPTY;
}

type CharMeta = {
    cell: readonly number[];
    rotations: Record<string, readonly number[]>;
    anims: Record<string, Record<string, { row: number; frames: number }>>;
    footY: number;
    bodyTop: number;
};

export function charMeta(name: string): CharMeta | undefined {
    return (ART.chars as unknown as Record<string, CharMeta>)[name];
}

function sub(alias: string, x: number, y: number, w: number, h: number): Texture {
    const key = `${alias}:${x},${y},${w},${h}`;
    let t = cache.get(key);
    if (!t) {
        const b = base(alias);
        if (b === Texture.EMPTY) return Texture.EMPTY;
        t = new Texture({ source: b.source, frame: new Rectangle(x, y, w, h) });
        cache.set(key, t);
    }
    return t;
}

export function charRotation(name: string, dir: Dir8): Texture {
    const m = charMeta(name);
    if (!m) return Texture.EMPTY;
    const [cw, ch] = m.cell;
    const rc = m.rotations[dir] ?? m.rotations.south;
    return sub(`chars/${name}`, rc[0] * cw, rc[1] * ch, cw, ch);
}

/** Animation frames for a direction; falls back to the nearest available direction, then the static rotation. */
export function charFrames(name: string, anim: string, dir: Dir8): Texture[] {
    const key = `${name}|${anim}|${dir}`;
    const hit = sliceCache.get(key);
    if (hit) return hit;
    const m = charMeta(name);
    let frames: Texture[] = [];
    if (m) {
        const a = m.anims[anim];
        const d = a?.[dir] ?? a?.south;
        const [cw, ch] = m.cell;
        if (d) for (let i = 0; i < d.frames; i++) frames.push(sub(`chars/${name}`, i * cw, d.row * ch, cw, ch));
    }
    if (!frames.length) frames = [charRotation(name, dir)];
    sliceCache.set(key, frames);
    return frames;
}

export function hasAnim(name: string, anim: string): boolean {
    return !!charMeta(name)?.anims[anim];
}

type TileMeta = { size: number; tiles: readonly { i: number; key: string }[] };

/** Wang tile texture for a corner key "NW NE SW SE" (1 = upper terrain). */
export function tileTexture(set: string, key: string): Texture | null {
    const m = (ART.tiles as unknown as Record<string, TileMeta>)[set];
    if (!m) return null;
    const entry = m.tiles.find((t) => t.key === key);
    if (!entry) return null;
    const s = m.size;
    return sub(`tiles/${set}`, (entry.i % 4) * s, Math.floor(entry.i / 4) * s, s, s);
}

export function propTexture(name: string): Texture {
    return base(`props/${name}`);
}

export function propMeta(name: string): { w: number; h: number; bbox: readonly number[] } | undefined {
    return (ART.props as unknown as Record<string, { w: number; h: number; bbox: number[] }>)[name];
}

export function iconTexture(name: string): Texture {
    return base(`icons/${name}`);
}
