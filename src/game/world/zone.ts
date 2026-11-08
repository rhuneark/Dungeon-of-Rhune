/**
 * Zone definition — a hand-placed map: terrain painting, props (with
 * collision footprints and optional interactions), NPCs, and placed quest
 * items. Coordinates are in TILES; props anchor at their bottom-centre.
 */
import type { TerrainMap } from '../engine/tilemap.ts';

/** What clicking a prop does. */
export type PropAction = 'stash' | 'well' | 'quests' | 'inspect' | 'waypoint' | 'statue' | 'gate';

export interface PropPlacement {
    art: string;
    x: number;
    y: number;
    /** Collision footprint [w, h] in tiles, anchored bottom-centre. Omit for walk-through decor. */
    block?: [number, number];
    action?: PropAction;
    /** Hover name. */
    name?: string;
    flip?: boolean;
    /** Flat on the ground: drawn under everything, no y-sorting. */
    decal?: boolean;
    /** Raise/lower the y-sort line (tiles) — e.g. a wide roof that should sort lower. */
    sortOffset?: number;
}

export interface NpcPlacement {
    id: string;
    x: number;
    y: number;
}

export interface PlacedItem {
    /** Unique key; once picked up it never respawns for this hero. */
    key: string;
    baseId: string;
    x: number;
    y: number;
}

export interface ZoneDef {
    id: string;
    name: string;
    w: number;
    h: number;
    level: number;
    paint(map: TerrainMap): void;
    props: PropPlacement[];
    npcs: NpcPlacement[];
    placedItems: PlacedItem[];
    spawn: { x: number; y: number };
    /** Wandering critter area for the goose (tiles). */
    critterArea?: { x0: number; y0: number; x1: number; y1: number };
    /** Seed for scattered decor. */
    decorSeed: number;
}
