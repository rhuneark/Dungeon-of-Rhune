/**
 * Terrain painting + Wang-corner autotiling.
 *
 * Zones paint terrain per CELL; each vertex then takes the highest-priority
 * terrain of the four cells around it, and each cell draws the tile whose
 * four corners match. Pairs come from the generated tilesets; a cell whose
 * corners mix three terrains folds the weakest into the next one up.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import { tileTexture } from './art.ts';
import { TILE } from './nav.ts';

export type Terrain = 'water' | 'grass' | 'dirt' | 'cobble';
/** Higher wins at shared vertices (features spread over grass). */
const PRIORITY: Record<Terrain, number> = { grass: 0, water: 1, dirt: 2, cobble: 3 };

/** Which tileset draws a pair, and which side is "upper". */
const PAIRS: { a: Terrain; b: Terrain; set: string; upper: Terrain }[] = [
    { a: 'grass', b: 'dirt', set: 'grass_dirt', upper: 'dirt' },
    { a: 'grass', b: 'cobble', set: 'grass_cobble', upper: 'cobble' },
    { a: 'water', b: 'grass', set: 'water_grass', upper: 'grass' },
];

export class TerrainMap {
    readonly cells: Terrain[];
    constructor(
        readonly w: number,
        readonly h: number,
        fill: Terrain = 'grass'
    ) {
        this.cells = new Array(w * h).fill(fill);
    }
    get(x: number, y: number): Terrain {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 'grass';
        return this.cells[y * this.w + x];
    }
    set(x: number, y: number, t: Terrain): void {
        if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = t;
    }
    rect(x0: number, y0: number, x1: number, y1: number, t: Terrain): void {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t);
    }
    ellipse(cx: number, cy: number, rx: number, ry: number, t: Terrain): void {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
                if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, t);
    }
    /** A path of the given width through waypoints (axis-aligned-ish strokes). */
    path(points: [number, number][], width: number, t: Terrain): void {
        for (let i = 0; i < points.length - 1; i++) {
            const [x0, y0] = points[i];
            const [x1, y1] = points[i + 1];
            const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
            for (let s = 0; s <= steps; s++) {
                const x = x0 + ((x1 - x0) * s) / steps;
                const y = y0 + ((y1 - y0) * s) / steps;
                const half = (width - 1) / 2;
                this.rect(Math.round(x - half), Math.round(y - half), Math.round(x + half), Math.round(y + half), t);
            }
        }
    }

    /** Vertex terrain = strongest terrain among the 4 surrounding cells. */
    vertex(vx: number, vy: number): Terrain {
        let best: Terrain = 'grass';
        let bp = -1;
        for (const [dx, dy] of [
            [-1, -1],
            [0, -1],
            [-1, 0],
            [0, 0],
        ]) {
            const x = vx + dx;
            const y = vy + dy;
            if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
            const t = this.cells[y * this.w + x];
            if (PRIORITY[t] > bp) {
                bp = PRIORITY[t];
                best = t;
            }
        }
        // Water only claims a vertex when ALL its cells are water (keeps banks tidy).
        if (best === 'water') {
            for (const [dx, dy] of [
                [-1, -1],
                [0, -1],
                [-1, 0],
                [0, 0],
            ]) {
                if (this.get(vx + dx, vy + dy) !== 'water') return 'grass';
            }
        }
        return best;
    }
}

function tileFor(corners: Terrain[]): Texture | null {
    let uniq = [...new Set(corners)];
    // Fold 3+ terrains: weakest non-water terrain becomes the next stronger one.
    while (uniq.length > 2) {
        uniq.sort((a, b) => PRIORITY[a] - PRIORITY[b]);
        const weakest = uniq[0] === 'water' ? uniq[1] : uniq[0];
        const stronger = uniq.find((t) => PRIORITY[t] > PRIORITY[weakest] && t !== 'water') ?? 'grass';
        corners = corners.map((c) => (c === weakest ? stronger : c));
        uniq = [...new Set(corners)];
    }
    // dirt + cobble have no matching set: let cobble swallow the dirt corners.
    if (uniq.length === 2 && uniq.includes('dirt') && uniq.includes('cobble')) {
        corners = corners.map((c) => (c === 'dirt' ? 'cobble' : c));
        uniq = ['cobble'];
    }
    if (uniq.length === 2 && uniq.includes('water') && !uniq.includes('grass')) {
        corners = corners.map((c) => (c === 'water' ? c : 'grass'));
        uniq = [...new Set(corners)];
    }
    if (uniq.length === 1) {
        const t = uniq[0];
        if (t === 'grass') return tileTexture('grass_dirt', '0000');
        if (t === 'dirt') return tileTexture('grass_dirt', '1111');
        if (t === 'cobble') return tileTexture('grass_cobble', '1111');
        return tileTexture('water_grass', '0000');
    }
    const pair = PAIRS.find((p) => uniq.includes(p.a) && uniq.includes(p.b));
    if (!pair) return tileTexture('grass_dirt', '0000');
    const key = corners.map((c) => (c === pair.upper ? '1' : '0')).join('');
    return tileTexture(pair.set, key);
}

/** Build the ground layer as sprites (Pixi batches them into a handful of draws). */
export function buildGround(map: TerrainMap): Container {
    const layer = new Container();
    for (let y = 0; y < map.h; y++) {
        for (let x = 0; x < map.w; x++) {
            const corners = [map.vertex(x, y), map.vertex(x + 1, y), map.vertex(x, y + 1), map.vertex(x + 1, y + 1)];
            const tex = tileFor(corners);
            if (!tex) continue;
            const s = new Sprite(tex);
            s.position.set(x * TILE, y * TILE);
            layer.addChild(s);
        }
    }
    return layer;
}
