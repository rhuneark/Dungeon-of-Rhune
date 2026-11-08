/**
 * Thornwick — the main town. A cobbled square around the Wishing Well, the
 * Sealed Stair to the north, the south gate to the Wilds (closed for now),
 * a pond, a graveyard, and a goose.
 */
import type { ZoneDef, PropPlacement } from './zone.ts';

const W = 60;
const H = 46;

const lamps: PropPlacement[] = [
    [27.5, 14],
    [32.5, 14],
    [21.5, 21.5],
    [38.5, 21.5],
    [27, 29.5],
    [33, 32],
    [33, 38],
].map(([x, y]) => ({ art: 'lamp_post', x, y, block: [1, 1] as [number, number], name: 'Street Lantern' }));

const graves: PropPlacement[] = [
    [7, 7, 'grave_a'],
    [9.5, 7, 'grave_b'],
    [12, 7, 'grave_a'],
    [7, 9.5, 'grave_b'],
    [9.5, 9.5, 'grave_a'],
    [12, 9.5, 'grave_b'],
].map(([x, y, art]) => ({ art: art as string, x: x as number, y: y as number, block: [1, 1] as [number, number], name: 'Old Grave' }));

export const THORNWICK: ZoneDef = {
    id: 'thornwick',
    name: 'Thornwick',
    w: W,
    h: H,
    level: 1,
    decorSeed: 1337,
    spawn: { x: 30, y: 36 },
    critterArea: { x0: 42, y0: 29, x1: 56, y1: 41 },
    paint(m) {
        // The square, the street to the Stair, and the Stair's forecourt.
        m.rect(22, 18, 37, 27, 'cobble');
        m.rect(28, 9, 31, 17, 'cobble');
        m.rect(25, 4, 34, 9, 'cobble');
        // Dirt roads: south to the gate, and out to each shop.
        m.rect(28, 28, 31, H - 1, 'dirt');
        m.path([[21, 23], [17, 23], [17, 25]], 2, 'dirt');
        m.path([[38, 22], [44, 22], [45, 25]], 2, 'dirt');
        m.path([[28, 31], [20, 33], [19, 36]], 2, 'dirt');
        m.path([[31, 31], [38, 33], [39, 34]], 2, 'dirt');
        m.path([[22, 18], [20, 17]], 2, 'dirt');
        m.path([[37, 18], [41, 17]], 2, 'dirt');
        m.path([[24, 6], [14, 6], [10, 8]], 2, 'dirt');
        // The pond.
        m.ellipse(49, 35, 5.5, 4, 'water');
    },
    props: [
        // ---- landmarks & buildings
        { art: 'pit_entrance', x: 29.5, y: 9, block: [4, 3], action: 'inspect', name: 'The Sealed Stair' },
        { art: 'tavern', x: 18.5, y: 16, block: [6, 3], name: 'The Crooked Lantern (closed)' },
        { art: 'lore_tower', x: 41, y: 16, block: [3, 2], name: "Varn's Tower" },
        { art: 'smithy', x: 13.5, y: 25.5, block: [4, 3], name: "Brannoc's Smithy" },
        { art: 'trader', x: 47, y: 24, block: [4, 2], name: "Pell's Trading Post" },
        { art: 'herbalist', x: 16, y: 35, block: [4, 2], name: "Ysolde's Cottage" },
        { art: 'gambler_wagon', x: 41.5, y: 33, block: [3, 2], name: "Odo's Wagon" },
        { art: 'house_a', x: 8, y: 31, block: [3, 2], name: 'Cottage' },
        { art: 'house_b', x: 52.5, y: 14, block: [3, 2], name: 'Cottage' },
        { art: 'house_a', x: 7, y: 41, block: [3, 2], name: 'Cottage', flip: true },
        { art: 'market_stall', x: 24.5, y: 30.5, block: [3, 1], name: 'Market Stall' },
        { art: 'gate', x: 29.5, y: H, block: [4, 1], action: 'gate', name: 'South Gate' },

        // ---- the square
        { art: 'wishing_well', x: 30, y: 23.5, block: [2, 1], action: 'well', name: 'Wishing Well' },
        { art: 'notice_board', x: 34.5, y: 19.5, block: [2, 1], action: 'quests', name: 'Notice Board' },
        { art: 'statue', x: 24.5, y: 20.5, block: [1, 1], action: 'statue', name: 'Statue of Aldra Thornwick' },
        { art: 'strongbox', x: 26.5, y: 26.5, block: [1, 1], action: 'stash', name: 'Your Strongbox' },
        { art: 'waypoint', x: 35, y: 27.5, action: 'waypoint', name: 'Rhunestone Circle', decal: true },

        // ---- clutter
        ...lamps,
        ...graves,
        { art: 'tree_dead', x: 4.5, y: 11, block: [1, 1], name: 'Dead Tree' },
        { art: 'barrel', x: 16.5, y: 21.5, block: [1, 1] },
        { art: 'barrel', x: 17.5, y: 21.8, block: [1, 1] },
        { art: 'crates', x: 10, y: 26, block: [1, 1] },
        { art: 'crates', x: 43.5, y: 25, block: [1, 1] },
        { art: 'barrel', x: 50.5, y: 24.5, block: [1, 1] },
        { art: 'cart', x: 51, y: 27, block: [2, 1] },
        { art: 'hay', x: 11, y: 32, block: [1, 1] },
        { art: 'hay', x: 5.5, y: 33, block: [1, 1] },
        { art: 'fence', x: 13, y: 37.5, block: [2, 1] },
        { art: 'fence', x: 19, y: 37.5, block: [2, 1] },
        { art: 'banner', x: 26.5, y: 42, block: [1, 1] },
        { art: 'banner', x: 33.5, y: 42, block: [1, 1] },
        { art: 'campfire', x: 35.5, y: 40.5, block: [1, 1], name: 'Campfire' },
        { art: 'signpost', x: 33, y: 29.5, block: [1, 1], name: 'Signpost: "Wilds →  south.  Pit ↑ north. Goose: everywhere."' },
        { art: 'barrel', x: 36.5, y: 30.5, block: [1, 1] },
        { art: 'bush', x: 21, y: 26.5, block: [1, 1] },
        { art: 'bush', x: 38.5, y: 26.5, block: [1, 1] },
        { art: 'rock_big', x: 55, y: 30, block: [1, 1] },
        { art: 'rock_big', x: 44, y: 40, block: [1, 1] },
        { art: 'tree_oak', x: 36, y: 12, block: [1, 1] },
        { art: 'tree_oak', x: 23, y: 12, block: [1, 1] },
        { art: 'tree_pine', x: 46, y: 9, block: [1, 1] },
        { art: 'tree_oak', x: 54, y: 20, block: [1, 1] },
        { art: 'tree_pine', x: 6, y: 22, block: [1, 1] },
        { art: 'tree_oak', x: 23, y: 38, block: [1, 1] },
        { art: 'tree_oak', x: 38, y: 39, block: [1, 1] },
        { art: 'tree_pine', x: 52, y: 41, block: [1, 1] },
    ],
    npcs: [
        { id: 'varn', x: 41, y: 18 },
        { id: 'brannoc', x: 17, y: 25 },
        { id: 'pell', x: 45, y: 26 },
        { id: 'ysolde', x: 19.5, y: 36.5 },
        { id: 'odo', x: 38.5, y: 34.5 },
        { id: 'maren', x: 32.5, y: 40.5 },
    ],
    placedItems: [
        { key: 'page_graveyard', baseId: 'lore_page', x: 10.7, y: 11.5 },
        { key: 'page_tavern', baseId: 'lore_page', x: 23.5, y: 15.5 },
        { key: 'page_pond', baseId: 'lore_page', x: 55.5, y: 34.5 },
    ],
};
