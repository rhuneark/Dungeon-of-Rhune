/**
 * Character sheet: sums every source of stats into one view.
 *
 * Sources: base attributes, equipped items (only if requirements are met —
 * unmet gear shows red and does nothing, like D2), curios carried in the
 * backpack, Discipline ranks, passive skills, and 'stat:' nodes in skill trees.
 */
import { getBase } from '../content/items/bases.ts';
import type { EquipSlot, ItemInstance } from '../content/items/types.ts';
import { DISCIPLINES, getSkill, SKILLS } from '../content/skills/disciplines.ts';
import { DAMAGE_TYPES, SEEK_KINDS, type DamageType, type SeekKind, type StatMod } from '../content/stats.ts';
import type { Fortune } from './loot.ts';
import { ATTRS, type Attr, type HeroSave } from './hero.ts';
import { viewItem } from './itemText.ts';
import { effectiveLevel, nodeRank, rankOf, type RawStats } from './skills.ts';

export const RES_CAP = 75;

export interface Sheet {
    raw: RawStats;
    attrs: Record<Attr, number>;
    life: number;
    mana: number;
    armor: number;
    block: number;
    res: Record<Exclude<DamageType, 'phys'>, number>;
    /** Weapon hit after Might and %damage. */
    damage: [number, number];
    /** Flat elemental adds on attacks. */
    adds: Partial<Record<DamageType, [number, number]>>;
    attacksPerSec: number;
    critChance: number;
    critDamage: number;
    castSpeed: number;
    moveSpeed: number;
    lifeRegen: number;
    lightRadius: number;
    xpGain: number;
    fortune: Fortune;
    /** Equipped slots whose requirements are not met. */
    unmet: Set<EquipSlot>;
}

function add(raw: RawStats, m: StatMod, scale = 1) {
    raw[m.stat] = (raw[m.stat] ?? 0) + m.value * scale;
    if (m.value2 !== undefined) raw[`${m.stat}.max`] = (raw[`${m.stat}.max`] ?? 0) + m.value2 * scale;
}

export function meetsReqs(item: ItemInstance, hero: HeroSave, attrs: Record<Attr, number>): boolean {
    const v = viewItem(item);
    return hero.level >= v.reqLevel && attrs.might >= v.reqMight && attrs.finesse >= v.reqFinesse && attrs.spirit >= v.reqSpirit;
}

/** Non-item stat sources: disciplines, passives, skill-tree stat nodes. */
function addBuildSources(hero: HeroSave, raw: RawStats, itemRaw: RawStats) {
    for (const d of DISCIPLINES) {
        const r = rankOf(hero, d.id);
        if (r > 0 && hero.disciplines.includes(d.id)) for (const m of d.perRank) add(raw, m, r);
    }
    for (const skill of SKILLS) {
        if (!hero.disciplines.includes(skill.discipline)) continue;
        if (skill.kind === 'passive' && skill.passivePerLevel && rankOf(hero, skill.discipline) >= skill.unlockRank) {
            const lvl = effectiveLevel(hero, skill, itemRaw);
            for (const m of skill.passivePerLevel) add(raw, m, lvl);
        }
        const st = hero.skills[skill.id];
        if (!st?.specialized) continue;
        for (const node of skill.tree) {
            const r = nodeRank(hero, skill.id, node.id);
            if (!r) continue;
            for (const e of node.effects) if (e.key.startsWith('stat:')) add(raw, { stat: e.key.slice(5), value: e.perRank }, r);
        }
    }
}

function sumItems(items: ItemInstance[]): RawStats {
    const raw: RawStats = {};
    for (const it of items) for (const m of viewItem(it).heroMods) add(raw, m);
    return raw;
}

export function computeSheet(hero: HeroSave): Sheet {
    const curios = hero.inventory.filter((it) => getBase(it.baseId).category === 'curio');
    const equipped = Object.entries(hero.equipped) as [EquipSlot, ItemInstance][];

    // Pass 1: assume everything is usable, to get attribute totals for requirement checks.
    const attrsOf = (raw: RawStats): Record<Attr, number> =>
        Object.fromEntries(ATTRS.map((a) => [a, Math.floor(hero.attrs[a] + (raw[a] ?? 0) + (raw.allAttr ?? 0))])) as Record<Attr, number>;
    const firstItems = sumItems([...equipped.map(([, it]) => it), ...curios]);
    const first: RawStats = { ...firstItems };
    addBuildSources(hero, first, firstItems);
    const attrs1 = attrsOf(first);

    // Pass 2: drop gear whose requirements fail.
    const unmet = new Set<EquipSlot>();
    const usable: ItemInstance[] = [];
    for (const [slot, it] of equipped) {
        if (meetsReqs(it, hero, attrs1)) usable.push(it);
        else unmet.add(slot);
    }
    const usableCurios = curios.filter((c) => meetsReqs(c, hero, attrs1));
    const itemRaw = sumItems([...usable, ...usableCurios]);
    const raw: RawStats = { ...itemRaw };
    addBuildSources(hero, raw, itemRaw);
    const attrs = attrsOf(raw);
    const g = (k: string) => raw[k] ?? 0;

    // Life / mana
    const life = Math.floor((40 + hero.level * 4 + attrs.vigor * 3 + g('life')) * (1 + g('lifePct') / 100));
    const mana = Math.floor((20 + hero.level * 2 + attrs.spirit * 2 + g('mana')) * (1 + g('manaPct') / 100));

    // Armor: worn defense + flat, scaled by %armor; Finesse adds a little.
    let worn = 0;
    let block = 0;
    for (const [slot, it] of equipped) {
        if (unmet.has(slot)) continue;
        const v = viewItem(it);
        if (v.armor) worn += v.armor;
        if (slot === 'offhand' && v.block) block += v.block;
    }
    const armor = Math.floor((worn + g('armor') + attrs.finesse / 4) * (1 + g('armorPct') / 100));
    block = Math.min(75, block + g('block'));

    const res = Object.fromEntries(
        DAMAGE_TYPES.filter((t) => t !== 'phys').map((t) => [t, Math.floor(g(`res:${t}`) + g('resAll'))])
    ) as Sheet['res'];

    // Weapon damage
    const weapon = hero.equipped.weapon && !unmet.has('weapon') ? viewItem(hero.equipped.weapon) : null;
    const baseDmg = weapon?.damage ?? [1, 3];
    const physPct = attrs.might + g('dmgPct:phys') + g('dmgPctAll');
    const damage: [number, number] = [
        Math.floor((baseDmg[0] + g('addDmg:phys')) * (1 + physPct / 100)),
        Math.floor((baseDmg[1] + g('addDmg:phys.max')) * (1 + physPct / 100)),
    ];
    const adds: Sheet['adds'] = {};
    for (const t of DAMAGE_TYPES) {
        if (t === 'phys') continue;
        const mn = g(`addDmg:${t}`);
        const mx = g(`addDmg:${t}.max`);
        if (mn || mx) {
            const pct = 1 + (g(`dmgPct:${t}`) + g('dmgPctAll')) / 100;
            adds[t] = [Math.floor(mn * pct), Math.floor(mx * pct)];
        }
    }
    const attacksPerSec = (weapon?.speed ?? 1.2) * (1 + (g('attackSpeed') + attrs.finesse / 5) / 100);

    const seek = Object.fromEntries(SEEK_KINDS.map((k) => [k, g(`seek:${k}`)])) as Record<SeekKind, number>;
    return {
        raw,
        attrs,
        life,
        mana,
        armor,
        block,
        res,
        damage,
        adds,
        attacksPerSec,
        critChance: 5 + g('critChance') + attrs.finesse * 0.2,
        critDamage: 50 + g('critDamage'),
        castSpeed: g('castSpeed'),
        moveSpeed: g('moveSpeed'),
        lifeRegen: g('lifeRegen'),
        lightRadius: 6 + g('lightRadius'),
        xpGain: g('xpGain'),
        fortune: { rarity: g('findRarity'), quantity: g('findQuantity'), gold: g('findGold'), seek },
        unmet,
    };
}

/** Effective skill level for UI (with gear bonuses). */
export function skillLevelFor(hero: HeroSave, skillId: string, sheet: Sheet): number {
    const s = getSkill(skillId);
    return s ? effectiveLevel(hero, s, sheet.raw) : 0;
}
