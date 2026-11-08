/**
 * Rhunes — the namesake. Small carved stones, each one "word" of the
 * Rhunewrights' dead language. Socket one for its listed effect; socket the
 * right ones IN ORDER into a plain (normal/superior) item with exactly that
 * many sockets and it speaks a Rhuneword.
 *
 * The ladder is ordered by rarity: each step is roughly half as common.
 * Three of a kind can be fused into the next at Brannoc's Crucible.
 */
import type { StatMod } from '../stats.ts';

export type RhuneHost = 'weapon' | 'armor' | 'shield';

export interface RhuneDef {
    id: string;
    name: string;
    /** Minimum item level to drop. */
    qlvl: number;
    /** Relative weight in rhune drops (before ilvl gating). */
    weight: number;
    effects: Record<RhuneHost, StatMod[]>;
    lore: string;
}

export const RHUNES: RhuneDef[] = [
    {
        id: 'ash', name: 'Ash', qlvl: 1, weight: 1000,
        effects: { weapon: [{ stat: 'localMaxDmg', value: 3 }, { stat: 'lightRadius', value: 1 }], armor: [{ stat: 'localArmor', value: 10 }, { stat: 'lightRadius', value: 1 }], shield: [{ stat: 'localArmor', value: 10 }, { stat: 'lightRadius', value: 1 }] },
        lore: '"What remains." The first word every Rhunewright apprentice carved.',
    },
    {
        id: 'ember', name: 'Ember', qlvl: 2, weight: 600,
        effects: { weapon: [{ stat: 'addDmg:fire', value: 3, value2: 8 }], armor: [{ stat: 'res:fire', value: 25 }], shield: [{ stat: 'res:fire', value: 30 }] },
        lore: '"Kindle." Warm to the touch, even in snow.',
    },
    {
        id: 'frost', name: 'Frost', qlvl: 3, weight: 450,
        effects: { weapon: [{ stat: 'addDmg:cold', value: 3, value2: 6 }], armor: [{ stat: 'res:cold', value: 25 }], shield: [{ stat: 'res:cold', value: 30 }] },
        lore: '"Stillness." Breath fogs near it.',
    },
    {
        id: 'volt', name: 'Volt', qlvl: 4, weight: 350,
        effects: { weapon: [{ stat: 'addDmg:lightning', value: 1, value2: 14 }], armor: [{ stat: 'res:lightning', value: 25 }], shield: [{ stat: 'res:lightning', value: 30 }] },
        lore: '"Strike." Hair stands on end when you hold it.',
    },
    {
        id: 'blight', name: 'Blight', qlvl: 5, weight: 260,
        effects: { weapon: [{ stat: 'addDmg:poison', value: 4, value2: 8 }], armor: [{ stat: 'res:poison', value: 25 }], shield: [{ stat: 'res:poison', value: 30 }] },
        lore: '"Rot." Moss grows on whatever it touches.',
    },
    {
        id: 'thorn', name: 'Thorn', qlvl: 7, weight: 180,
        effects: { weapon: [{ stat: 'lifeLeech', value: 3 }], armor: [{ stat: 'thorns', value: 8 }], shield: [{ stat: 'thorns', value: 12 }] },
        lore: '"Take." Carved by Rhunewrights who did not share.',
    },
    {
        id: 'iron', name: 'Iron', qlvl: 9, weight: 130,
        effects: { weapon: [{ stat: 'localDmgPct', value: 20 }], armor: [{ stat: 'localArmorPct', value: 20 }], shield: [{ stat: 'block', value: 8 }] },
        lore: '"Endure." The word on every door of the old Pit.',
    },
    {
        id: 'tide', name: 'Tide', qlvl: 11, weight: 90,
        effects: { weapon: [{ stat: 'manaLeech', value: 4 }], armor: [{ stat: 'manaRegen', value: 15 }], shield: [{ stat: 'mana', value: 20 }] },
        lore: '"Return." Always found facing the sea, wherever it lies.',
    },
    {
        id: 'hollow', name: 'Hollow', qlvl: 13, weight: 60,
        effects: { weapon: [{ stat: 'addDmg:void', value: 5, value2: 12 }], armor: [{ stat: 'res:void', value: 25 }], shield: [{ stat: 'res:void', value: 30 }] },
        lore: '"The answer." The Rhunewrights carved it last, and regretted it.',
    },
    {
        id: 'crown', name: 'Crown', qlvl: 16, weight: 40,
        effects: { weapon: [{ stat: 'findGold', value: 50 }], armor: [{ stat: 'findGold', value: 40 }], shield: [{ stat: 'findGold', value: 40 }] },
        lore: '"Mine." Every king who held one died rich.',
    },
    {
        id: 'omen', name: 'Omen', qlvl: 19, weight: 25,
        effects: { weapon: [{ stat: 'critChance', value: 8 }], armor: [{ stat: 'findRarity', value: 15 }], shield: [{ stat: 'findRarity', value: 12 }] },
        lore: '"Soon." Gamblers swear by it. Gamblers swear by everything.',
    },
    {
        id: 'zenith', name: 'Zenith', qlvl: 23, weight: 10,
        effects: { weapon: [{ stat: 'skillAll', value: 1 }], armor: [{ stat: 'resAll', value: 10 }], shield: [{ stat: 'resAll', value: 12 }] },
        lore: '"Above all." A shard of the stone the others were cut from.',
    },
];

const RHUNE_BY_ID = new Map(RHUNES.map((r) => [r.id, r]));
export function getRhune(id: string): RhuneDef | undefined {
    return RHUNE_BY_ID.get(id);
}
export function rhuneIdFromBase(baseId: string): string | null {
    return baseId.startsWith('rhune_') ? baseId.slice(6) : null;
}
export function nextRhune(id: string): RhuneDef | undefined {
    const i = RHUNES.findIndex((r) => r.id === id);
    return i >= 0 ? RHUNES[i + 1] : undefined;
}

// --------------------------------------------------------------- rhunewords

export interface RhunewordDef {
    id: string;
    name: string;
    /** Rhune ids in socket order. Socket count must match exactly. */
    rhunes: string[];
    /** Base must carry one of these tags. */
    tags: string[];
    /** Extra stats on top of the rhunes' own effects. */
    stats: StatMod[];
    flavor: string;
}

export const RHUNEWORDS: RhunewordDef[] = [
    {
        id: 'kindling', name: 'Kindling', rhunes: ['ember', 'ash'], tags: ['weapon'],
        stats: [{ stat: 'dmgPct:fire', value: 30 }, { stat: 'attackSpeed', value: 10 }, { stat: 'lifeOnKill', value: 3 }],
        flavor: 'Every fire starts small.',
    },
    {
        id: 'hearth', name: 'Hearth', rhunes: ['ember', 'iron'], tags: ['chest'],
        stats: [{ stat: 'life', value: 30 }, { stat: 'lifeRegen', value: 4 }, { stat: 'res:cold', value: 15 }],
        flavor: 'Come in out of the cold.',
    },
    {
        id: 'whisper', name: 'Whisper', rhunes: ['ash', 'thorn'], tags: ['helm', 'chest'],
        stats: [{ stat: 'moveSpeed', value: 20 }, { stat: 'castSpeed', value: 20 }, { stat: 'mana', value: 15 }],
        flavor: 'They never heard you coming.',
    },
    {
        id: 'lodestone', name: 'Lodestone', rhunes: ['iron', 'iron'], tags: ['shield'],
        stats: [{ stat: 'localArmorPct', value: 60 }, { stat: 'dmgReduce', value: 5 }, { stat: 'resAll', value: 8 }],
        flavor: 'Immovable. Unimpressed.',
    },
    {
        id: 'gale', name: 'Gale', rhunes: ['volt', 'ash', 'tide'], tags: ['bow', 'spear'],
        stats: [{ stat: 'tagPct:projectile', value: 40 }, { stat: 'attackSpeed', value: 20 }, { stat: 'moveSpeed', value: 10 }],
        flavor: 'The wind does not miss.',
    },
    {
        id: 'bramblecoat', name: 'Bramblecoat', rhunes: ['thorn', 'blight', 'thorn'], tags: ['chest'],
        stats: [{ stat: 'thorns', value: 25 }, { stat: 'res:poison', value: 30 }, { stat: 'life', value: 40 }],
        flavor: 'Hug at your own risk.',
    },
    {
        id: 'gilded_tongue', name: 'Gilded Tongue', rhunes: ['crown', 'omen'], tags: ['helm'],
        stats: [{ stat: 'findGold', value: 60 }, { stat: 'findRarity', value: 35 }, { stat: 'seek:unique', value: 20 }],
        flavor: 'Fortune favours the shameless.',
    },
    {
        id: 'murmur', name: 'Murmur', rhunes: ['tide', 'omen', 'ash'], tags: ['staff', 'wand', 'tome'],
        stats: [{ stat: 'skillAll', value: 1 }, { stat: 'manaRegen', value: 40 }, { stat: 'castSpeed', value: 20 }],
        flavor: 'The stones talk, if you let them.',
    },
    {
        id: 'hollow_crown', name: 'Hollow Crown', rhunes: ['hollow', 'crown', 'zenith'], tags: ['weapon'],
        stats: [{ stat: 'skillAll', value: 1 }, { stat: 'dmgPct:void', value: 60 }, { stat: 'localDmgPct', value: 120 }, { stat: 'findRarity', value: 25 }],
        flavor: 'It was always going to be you.',
    },
];

export function findRhuneword(rhuneIds: string[], baseTags: string[]): RhunewordDef | undefined {
    return RHUNEWORDS.find(
        (rw) =>
            rw.rhunes.length === rhuneIds.length &&
            rw.rhunes.every((r, i) => r === rhuneIds[i]) &&
            rw.tags.some((t) => baseTags.includes(t))
    );
}
