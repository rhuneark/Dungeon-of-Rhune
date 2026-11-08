/**
 * Stat registry — every number an item, rhune, skill or passive can grant.
 *
 * Stats are plain string ids so content stays data-driven:
 *   'might', 'res:fire', 'addDmg:cold', 'tagPct:projectile', 'seek:rhune',
 *   'skill:cinder_bolt', 'skillDisc:emberwright', 'quirk:honk' ...
 *
 * Design rule ("most things viable if they make sense"): damage scaling is by
 * TAG and DAMAGE TYPE, never by a specific skill. "+% Fire Damage" helps any
 * fire skill; "+% Projectile Damage" helps bows AND bolts. Skill trees convert
 * tags/types, so gear stays relevant across builds.
 */

export const DAMAGE_TYPES = ['phys', 'fire', 'cold', 'lightning', 'poison', 'void'] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const DAMAGE_TYPE_NAMES: Record<DamageType, string> = {
    phys: 'Physical',
    fire: 'Fire',
    cold: 'Cold',
    lightning: 'Lightning',
    poison: 'Poison',
    void: 'Void',
};

/** Skill/attack tags that '+% <Tag> Damage' stats scale. */
export const DAMAGE_TAGS = ['melee', 'ranged', 'spell', 'projectile', 'area', 'minion', 'dot'] as const;
export type DamageTag = (typeof DAMAGE_TAGS)[number];
export const DAMAGE_TAG_NAMES: Record<DamageTag, string> = {
    melee: 'Melee',
    ranged: 'Ranged',
    spell: 'Spell',
    projectile: 'Projectile',
    area: 'Area',
    minion: 'Minion',
    dot: 'Damage over Time',
};

/**
 * Targeted Find ("seek") categories. Rarity Find makes drops BETTER; seek
 * makes drops of one KIND more likely (and seek:unique only boosts the
 * unique roll). Lets players hunt the loot they actually want.
 */
export const SEEK_KINDS = ['weapon', 'armor', 'jewelry', 'curio', 'rhune', 'unique'] as const;
export type SeekKind = (typeof SEEK_KINDS)[number];
export const SEEK_NAMES: Record<SeekKind, string> = {
    weapon: 'Weapon',
    armor: 'Armor',
    jewelry: 'Jewelry',
    curio: 'Curio',
    rhune: 'Rhune',
    unique: 'Unique',
};

export type StatId = string;

/** A rolled stat on an item / granted by a node. value2 is the max of a "X-Y" range. */
export interface StatMod {
    stat: StatId;
    value: number;
    value2?: number;
}

/** Which page of the character sheet a stat lives on, and tooltip sort order. */
export type StatGroup = 'skill' | 'attribute' | 'offense' | 'defense' | 'fortune' | 'utility' | 'quirk';

export interface StatDef {
    /** Tooltip template. {0} = value, {1} = value2. Functions handle dynamic names. */
    text: string;
    group: StatGroup;
    /** Lower sorts first in tooltips (D2-style: skills, then attributes, ...). */
    order: number;
    /** Modifies the item's own base numbers (Enhanced Damage, +Defense) instead of the hero. */
    local?: boolean;
}

const defs: Record<StatId, StatDef> = {
    // ---- skills (always first in tooltips, like D2)
    skillAll: { text: '+{0} to All Skills', group: 'skill', order: 0 },

    // ---- attributes
    might: { text: '+{0} to Might', group: 'attribute', order: 10 },
    finesse: { text: '+{0} to Finesse', group: 'attribute', order: 11 },
    vigor: { text: '+{0} to Vigor', group: 'attribute', order: 12 },
    spirit: { text: '+{0} to Spirit', group: 'attribute', order: 13 },
    allAttr: { text: '+{0} to All Attributes', group: 'attribute', order: 9 },

    // ---- local item modifiers
    localDmgPct: { text: '+{0}% Enhanced Damage', group: 'offense', order: 20, local: true },
    localMinDmg: { text: '+{0} to Minimum Damage', group: 'offense', order: 21, local: true },
    localMaxDmg: { text: '+{0} to Maximum Damage', group: 'offense', order: 22, local: true },
    localArmorPct: { text: '+{0}% Enhanced Defense', group: 'defense', order: 20, local: true },
    localArmor: { text: '+{0} Defense', group: 'defense', order: 21, local: true },
    sockets: { text: 'Socketed ({0})', group: 'utility', order: 99, local: true },

    // ---- offense
    attackSpeed: { text: '+{0}% Increased Attack Speed', group: 'offense', order: 30 },
    castSpeed: { text: '+{0}% Faster Cast Rate', group: 'offense', order: 31 },
    critChance: { text: '+{0}% Critical Strike Chance', group: 'offense', order: 32 },
    critDamage: { text: '+{0}% Critical Strike Damage', group: 'offense', order: 33 },
    dmgPctAll: { text: '+{0}% Damage', group: 'offense', order: 34 },
    lifeLeech: { text: '{0}% Life Stolen per Hit', group: 'offense', order: 40 },
    manaLeech: { text: '{0}% Mana Stolen per Hit', group: 'offense', order: 41 },
    lifeOnKill: { text: '+{0} Life after each Kill', group: 'offense', order: 42 },
    manaOnKill: { text: '+{0} Mana after each Kill', group: 'offense', order: 43 },
    projectiles: { text: '+{0} Projectiles', group: 'offense', order: 44 },
    areaPct: { text: '+{0}% Area of Effect', group: 'offense', order: 45 },

    // ---- defense
    life: { text: '+{0} to Life', group: 'defense', order: 50 },
    lifePct: { text: '+{0}% Maximum Life', group: 'defense', order: 51 },
    mana: { text: '+{0} to Mana', group: 'defense', order: 52 },
    manaPct: { text: '+{0}% Maximum Mana', group: 'defense', order: 53 },
    lifeRegen: { text: 'Replenish Life +{0}', group: 'defense', order: 54 },
    manaRegen: { text: 'Regenerate Mana {0}%', group: 'defense', order: 55 },
    armor: { text: '+{0} Armor', group: 'defense', order: 56 },
    armorPct: { text: '+{0}% Armor', group: 'defense', order: 57 },
    block: { text: '{0}% Increased Chance of Blocking', group: 'defense', order: 58 },
    resAll: { text: 'All Resistances +{0}', group: 'defense', order: 60 },
    dmgReduce: { text: 'Damage Reduced by {0}', group: 'defense', order: 66 },
    thorns: { text: 'Attacker Takes Damage of {0}', group: 'defense', order: 67 },

    // ---- fortune (the loot stats)
    findRarity: { text: '+{0}% Rarity Find', group: 'fortune', order: 80 },
    findQuantity: { text: '+{0}% Item Quantity', group: 'fortune', order: 81 },
    findGold: { text: '+{0}% Extra Gold', group: 'fortune', order: 82 },

    // ---- utility
    moveSpeed: { text: '+{0}% Faster Run/Walk', group: 'utility', order: 90 },
    lightRadius: { text: '+{0} to Light Radius', group: 'utility', order: 91 },
    xpGain: { text: '+{0}% Experience Gained', group: 'utility', order: 92 },
    reqPct: { text: 'Requirements -{0}%', group: 'utility', order: 98 },
};

for (const t of DAMAGE_TYPES) {
    const n = DAMAGE_TYPE_NAMES[t];
    defs[`dmgPct:${t}`] = { text: `+{0}% ${n} Damage`, group: 'offense', order: 35 };
    defs[`addDmg:${t}`] = { text: `Adds {0}-{1} ${n} Damage`, group: 'offense', order: 25 };
    if (t !== 'phys') defs[`res:${t}`] = { text: `${n} Resistance +{0}%`, group: 'defense', order: 61 };
    defs[`pen:${t}`] = { text: `-{0}% to Enemy ${n} Resistance`, group: 'offense', order: 37 };
}
for (const tag of DAMAGE_TAGS) {
    defs[`tagPct:${tag}`] = { text: `+{0}% ${DAMAGE_TAG_NAMES[tag]} Damage`, group: 'offense', order: 36 };
}
for (const k of SEEK_KINDS) {
    defs[`seek:${k}`] = { text: `+{0}% ${SEEK_NAMES[k]} Find`, group: 'fortune', order: 83 };
}

export const STAT_DEFS = defs;

/** Stats whose second value is a range max ("Adds X-Y"). */
export function isRangeStat(stat: StatId): boolean {
    return stat.startsWith('addDmg:');
}

/**
 * Dynamic stat families resolve their names lazily (skills and disciplines
 * live in other modules), via resolvers registered at startup.
 */
type NameResolver = (id: string) => string | undefined;
let skillName: NameResolver = () => undefined;
let disciplineName: NameResolver = () => undefined;
let quirkText: NameResolver = () => undefined;
export function registerStatNameResolvers(r: { skill: NameResolver; discipline: NameResolver; quirk: NameResolver }) {
    skillName = r.skill;
    disciplineName = r.discipline;
    quirkText = r.quirk;
}

export function getStatDef(stat: StatId): StatDef {
    const d = defs[stat];
    if (d) return d;
    if (stat.startsWith('skill:')) {
        const n = skillName(stat.slice(6)) ?? stat.slice(6);
        return { text: `+{0} to ${n}`, group: 'skill', order: 2 };
    }
    if (stat.startsWith('skillDisc:')) {
        const n = disciplineName(stat.slice(10)) ?? stat.slice(10);
        return { text: `+{0} to ${n} Skills`, group: 'skill', order: 1 };
    }
    if (stat.startsWith('quirk:')) {
        return { text: quirkText(stat.slice(6)) ?? stat.slice(6), group: 'quirk', order: 200 };
    }
    return { text: `${stat} {0}`, group: 'utility', order: 150 };
}

/** "Adds 3-7 Fire Damage" */
export function describeMod(m: StatMod): string {
    const def = getStatDef(m.stat);
    return def.text.replace('{0}', fmt(m.value)).replace('{1}', fmt(m.value2 ?? m.value));
}

function fmt(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Merge mods of the same stat (for tooltips that combine rhune + affix lines). */
export function mergeMods(mods: StatMod[]): StatMod[] {
    const map = new Map<StatId, StatMod>();
    for (const m of mods) {
        const cur = map.get(m.stat);
        if (cur) {
            cur.value += m.value;
            if (m.value2 !== undefined) cur.value2 = (cur.value2 ?? 0) + m.value2;
        } else {
            map.set(m.stat, { ...m });
        }
    }
    return [...map.values()];
}

export function sortMods(mods: StatMod[]): StatMod[] {
    return [...mods].sort((a, b) => getStatDef(a.stat).order - getStatDef(b.stat).order);
}
