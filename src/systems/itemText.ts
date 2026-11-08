/**
 * Everything DERIVED from an ItemInstance: display name, colour, final
 * damage/defense after local mods, requirements, the hero-facing stat list,
 * prices. The tooltip renders exactly what this returns.
 */
import { getAffix } from '../content/items/affixes.ts';
import { getBase } from '../content/items/bases.ts';
import { RARE_FIRST } from '../content/items/rareNames.ts';
import { getRhune, RHUNEWORDS, rhuneIdFromBase, type RhuneHost } from '../content/items/rhunes.ts';
import type { ItemBase, ItemInstance, Quality } from '../content/items/types.ts';
import { getUnique, QUIRKS } from '../content/items/uniques.ts';
import { getStatDef, mergeMods, sortMods, type StatMod } from '../content/stats.ts';
import { rareSecondPool } from './itemGen.ts';

export const QUALITY_COLORS: Record<Quality | 'rhune' | 'socketed' | 'gold', string> = {
    crude: '#8d8d8d',
    normal: '#ece6d6',
    superior: '#ece6d6',
    magic: '#7896ff',
    rare: '#f3d34a',
    unique: '#c9a46b',
    rhuneword: '#c9a46b',
    rhune: '#ff9b3d',
    socketed: '#a3a3a3',
    gold: '#f3d34a',
};

export const QUALITY_LABELS: Record<Quality, string> = {
    crude: 'Crude',
    normal: 'Normal',
    superior: 'Superior',
    magic: 'Magic',
    rare: 'Rare',
    unique: 'Unique',
    rhuneword: 'Rhuneword',
};

export function rhuneHostFor(base: ItemBase): RhuneHost {
    if (base.category === 'weapon') return 'weapon';
    if (base.tags.includes('shield')) return 'shield';
    return 'armor';
}

export function itemColor(item: ItemInstance): string {
    const base = getBase(item.baseId);
    if (base.category === 'rhune') return QUALITY_COLORS.rhune;
    if ((item.quality === 'normal' || item.quality === 'superior') && item.sockets > 0) return QUALITY_COLORS.socketed;
    return QUALITY_COLORS[item.quality];
}

export function itemArt(item: ItemInstance): string {
    const base = getBase(item.baseId);
    return base.art[item.seed % base.art.length];
}

/** Display name. Unidentified items show only their base. */
export function itemName(item: ItemInstance): string {
    const base = getBase(item.baseId);
    if (item.qty && item.qty > 1) return `${base.name} (${item.qty})`;
    if (!item.identified) return base.name;
    switch (item.quality) {
        case 'unique':
            return getUnique(item.uniqueId!)?.name ?? base.name;
        case 'rhuneword':
            return RHUNEWORDS.find((r) => r.id === item.rhunewordId)?.name ?? base.name;
        case 'rare': {
            const [a, b] = item.rareName ?? [0, 0];
            const second = rareSecondPool(base);
            return `${RARE_FIRST[a % RARE_FIRST.length]} ${second[b % second.length]}`;
        }
        case 'magic': {
            let pre = '';
            let suf = '';
            for (const ra of item.affixes) {
                const def = getAffix(ra.affixId);
                if (!def) continue;
                if (def.kind === 'prefix') pre = def.tiers[ra.tier].name;
                else suf = def.tiers[ra.tier].name;
            }
            return [pre, base.name, suf].filter(Boolean).join(' ');
        }
        case 'superior':
            return `Superior ${base.name}`;
        case 'crude':
            return `Crude ${base.name}`;
        default:
            return base.name;
    }
}

/** Rares, uniques and rhunewords show their base on a second line. */
export function itemSubName(item: ItemInstance): string | null {
    if (!item.identified) return null;
    if (item.quality === 'rare' || item.quality === 'unique' || item.quality === 'rhuneword') return getBase(item.baseId).name;
    return null;
}

/** All stat mods on the item, local and global, with rhunes and rhuneword. */
function allMods(item: ItemInstance): { mods: StatMod[]; quirks: string[] } {
    const base = getBase(item.baseId);
    const mods: StatMod[] = [...(base.implicit ?? [])];
    const quirks: string[] = [];
    const push = (stat: string, vals: number[]) => {
        if (stat.startsWith('quirk:')) {
            quirks.push(stat.slice(6));
            return;
        }
        mods.push({ stat, value: vals[0], value2: vals[1] });
    };
    for (const ra of item.affixes) {
        const def = getAffix(ra.affixId);
        if (!def) continue;
        def.tiers[ra.tier].rolls.forEach((roll, i) => push(roll.stat, ra.values[i] ?? [roll.min]));
    }
    if (item.quality === 'unique' && item.uniqueId) {
        const u = getUnique(item.uniqueId);
        u?.rolls.forEach((roll, i) => push(roll.stat, item.uniqueValues?.[i] ?? [roll.min]));
    }
    const host = rhuneHostFor(base);
    for (const s of item.socketed) {
        const rid = rhuneIdFromBase(s.baseId);
        const r = rid ? getRhune(rid) : undefined;
        if (r) mods.push(...r.effects[host].map((m) => ({ ...m })));
    }
    if (item.quality === 'rhuneword' && item.rhunewordId) {
        const rw = RHUNEWORDS.find((x) => x.id === item.rhunewordId);
        if (rw) mods.push(...rw.stats.map((m) => ({ ...m })));
    }
    return { mods: mergeMods(mods), quirks };
}

export interface ItemView {
    base: ItemBase;
    name: string;
    subName: string | null;
    color: string;
    damage?: [number, number];
    damageModified: boolean;
    armor?: number;
    armorModified: boolean;
    block?: number;
    speed?: number;
    reqLevel: number;
    reqMight: number;
    reqFinesse: number;
    reqSpirit: number;
    /** Hero-facing (non-local) stats, sorted for display. */
    heroMods: StatMod[];
    /** Local mods, for tooltip lines (Enhanced Damage etc.). */
    localMods: StatMod[];
    quirks: string[];
    flavor?: string;
}

export function viewItem(item: ItemInstance): ItemView {
    const base = getBase(item.baseId);
    const { mods, quirks } = allMods(item);
    const local = mods.filter((m) => getStatDef(m.stat).local && m.stat !== 'sockets');
    const hero = mods.filter((m) => !getStatDef(m.stat).local);
    const sum = (stat: string) => local.filter((m) => m.stat === stat).reduce((a, m) => a + m.value, 0);

    let damage: [number, number] | undefined;
    let damageModified = false;
    if (base.damage) {
        const ed = sum('localDmgPct');
        const fmin = sum('localMinDmg');
        const fmax = sum('localMaxDmg');
        const min = Math.max(1, Math.floor(base.damage[0] * (1 + ed / 100)) + fmin);
        const max = Math.max(min + 1, Math.floor(base.damage[1] * (1 + ed / 100)) + fmax);
        damage = [min, max];
        damageModified = ed !== 0 || fmin !== 0 || fmax !== 0;
    }
    let armor: number | undefined;
    let armorModified = false;
    if (base.armor) {
        const ed = sum('localArmorPct');
        const flat = sum('localArmor');
        const roll = item.baseRoll[0] ?? base.armor[0];
        armor = Math.max(1, Math.floor(roll * (1 + ed / 100)) + flat);
        armorModified = ed !== 0 || flat !== 0;
    }

    let reqLevel = base.reqLevel ?? 1;
    if (item.quality === 'magic' || item.quality === 'rare') {
        for (const ra of item.affixes) {
            const def = getAffix(ra.affixId);
            if (def) reqLevel = Math.max(reqLevel, Math.floor(def.tiers[ra.tier].alvl * 0.8));
        }
    }
    if (item.quality === 'unique' && item.uniqueId) reqLevel = Math.max(reqLevel, getUnique(item.uniqueId)?.reqLevel ?? 1);
    for (const s of item.socketed) reqLevel = Math.max(reqLevel, getBase(s.baseId).reqLevel ?? 1);

    let flavor = base.flavor;
    if (item.quality === 'unique' && item.uniqueId) flavor = getUnique(item.uniqueId)?.flavor;
    if (item.quality === 'rhuneword' && item.rhunewordId) flavor = RHUNEWORDS.find((r) => r.id === item.rhunewordId)?.flavor;

    return {
        base,
        name: itemName(item),
        subName: itemSubName(item),
        color: itemColor(item),
        damage,
        damageModified,
        armor,
        armorModified,
        block: base.block,
        speed: base.speed,
        reqLevel,
        reqMight: base.reqMight ?? 0,
        reqFinesse: base.reqFinesse ?? 0,
        reqSpirit: base.reqSpirit ?? 0,
        heroMods: sortMods(hero),
        localMods: sortMods(local),
        quirks,
        flavor,
    };
}

export function quirkText(id: string): string {
    return QUIRKS[id] ?? id;
}

const QUALITY_VALUE: Record<Quality, number> = { crude: 0.5, normal: 1, superior: 1.4, magic: 2.5, rare: 5, unique: 8, rhuneword: 8 };

/** What a vendor charges for it. */
export function buyPrice(item: ItemInstance): number {
    const base = getBase(item.baseId);
    if (base.category === 'consumable') return base.price * (item.qty ?? 1);
    if (base.category === 'rhune') return base.price * 4;
    const v = base.price * QUALITY_VALUE[item.quality] * (1 + item.ilvl / 25) * (1 + item.affixes.length * 0.25) * (1 + item.sockets * 0.15);
    return Math.max(1, Math.round(v));
}

/** What a vendor pays you. Unidentified loot sells cheap — let Varn look first. */
export function sellPrice(item: ItemInstance): number {
    const base = getBase(item.baseId);
    if (base.category === 'quest') return 0;
    const p = Math.floor(buyPrice(item) / 5) * (item.identified ? 1 : 0.4);
    return Math.max(1, Math.floor(p));
}
