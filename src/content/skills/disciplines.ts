/**
 * The four first-release Disciplines and their skills. Pick any two; every
 * pairing has a title. Cross-discipline nodes (a Bulwark slam that converts to
 * fire, a Hollowcaller thrall that borrows forge-fire) are deliberate: if a
 * combination makes sense, the trees let it work.
 */
import type { DisciplineId } from './disciplineNames.ts';
import type { DisciplineDef, SkillDef, SkillNode } from './types.ts';

const n = (
    id: string,
    name: string,
    maxRank: number,
    col: number,
    row: number,
    text: string,
    effects: [string, number][],
    requires?: [string, number]
): SkillNode => ({
    id,
    name,
    maxRank,
    col,
    row,
    text,
    effects: effects.map(([key, perRank]) => ({ key, perRank })),
    requires: requires ? { node: requires[0], points: requires[1] } : undefined,
});

export const DISCIPLINES: DisciplineDef[] = [
    {
        id: 'bulwark',
        name: 'Bulwark',
        tagline: 'Shields, plate, and stubbornness.',
        color: '#b9c6d2',
        perRank: [{ stat: 'might', value: 1 }, { stat: 'life', value: 4 }, { stat: 'armorPct', value: 1 }],
        maxRank: 25,
        lore: 'Thornwick’s gate has never fallen. The Bulwark is what people who held it called themselves.',
    },
    {
        id: 'emberwright',
        name: 'Emberwright',
        tagline: 'Fire, forge, and the patience of molten things.',
        color: '#ff8a3d',
        perRank: [{ stat: 'spirit', value: 1 }, { stat: 'mana', value: 3 }, { stat: 'dmgPct:fire', value: 1 }],
        maxRank: 25,
        lore: 'Smiths who learned that the forge listens. Brannoc will deny being one.',
    },
    {
        id: 'galeborn',
        name: 'Galeborn',
        tagline: 'Wind, lightning, and the art of being elsewhere.',
        color: '#7ec8e3',
        perRank: [{ stat: 'finesse', value: 1 }, { stat: 'moveSpeed', value: 0.5 }, { stat: 'dmgPct:lightning', value: 1 }],
        maxRank: 25,
        lore: 'Hunters of the high moor. They say a Galeborn is never where you aimed.',
    },
    {
        id: 'hollowcaller',
        name: 'Hollowcaller',
        tagline: 'The Hollow answered the Rhunewrights. It answers you, too.',
        color: '#a77bdc',
        perRank: [{ stat: 'spirit', value: 1 }, { stat: 'life', value: 2 }, { stat: 'dmgPct:void', value: 1 }],
        maxRank: 25,
        lore: 'Forbidden in three kingdoms. Tolerated in Thornwick, because Thornwick needs everyone.',
    },
];

/** Grim Dawn-style class titles for every pairing. */
const COMBOS: Record<string, string> = {
    'bulwark+emberwright': 'Forgeguard',
    'bulwark+galeborn': 'Stormshield',
    'bulwark+hollowcaller': 'Gravewarden',
    'emberwright+galeborn': 'Cindergale',
    'emberwright+hollowcaller': 'Ashbinder',
    'galeborn+hollowcaller': 'Nightwind',
};

export function comboTitle(a: DisciplineId | null, b: DisciplineId | null): string {
    if (a && b) return COMBOS[[a, b].sort().join('+')] ?? 'Wanderer';
    const one = a ?? b;
    return one ? DISCIPLINES.find((d) => d.id === one)!.name : 'Wanderer';
}

export const SKILLS: SkillDef[] = [
    // ================================================================ BULWARK
    {
        id: 'shieldcrash', name: 'Shieldcrash', discipline: 'bulwark', unlockRank: 1, kind: 'attack', damageType: 'phys', tags: ['melee', 'area'],
        description: 'Slam forward with shield or weapon, striking everything in a short cone and staggering it.',
        baseInfo: ['Weapon Damage: 140%', 'Mana: 6'],
        tree: [
            n('heavier', 'Heavier Swing', 5, 0, 1, '+{v}% damage', [['damagePct', 10]]),
            n('stagger', 'Staggering Blow', 4, 1, 0, '+{v}% stagger chance', [['staggerPct', 12]], ['heavier', 2]),
            n('wide', 'Wide Arc', 3, 1, 2, '+{v}% area', [['areaPct', 20]], ['heavier', 2]),
            n('momentum', 'Iron Momentum', 3, 2, 0, '+{v}% armor per enemy hit (3s, stacks)', [['armorPerHitPct', 4]], ['stagger', 2]),
            n('seismic', 'Seismic Crash', 1, 2, 2, 'Sends a shockwave forward (gains Projectile)', [['addTag:projectile', 1]], ['wide', 3]),
            n('molten', 'Molten Edge', 1, 3, 1, 'Converts all Physical damage to Fire', [['convert:phys>fire', 100]], ['heavier', 5]),
            n('answer', "Bulwark's Answer", 5, 3, 0, '+{v}% block chance for 4s after a crash', [['blockAfterPct', 3]], ['momentum', 3]),
            n('earthshaker', 'Earthshaker', 2, 4, 2, '+{v} shockwaves', [['projectiles', 1]], ['seismic', 1]),
        ],
    },
    {
        id: 'iron_hide', name: 'Iron Hide', discipline: 'bulwark', unlockRank: 5, kind: 'passive', tags: [],
        description: 'Your skin learns from your armor.',
        baseInfo: ['Passive'],
        passivePerLevel: [{ stat: 'armorPct', value: 3 }, { stat: 'dmgReduce', value: 0.5 }],
        tree: [
            n('plated', 'Plated Flesh', 5, 0, 1, '+{v}% armor', [['stat:armorPct', 6]]),
            n('thick', 'Thick Blood', 5, 1, 0, '+{v}% maximum life', [['stat:lifePct', 3]], ['plated', 2]),
            n('scar', 'Scar Tissue', 3, 1, 2, 'Damage reduced by {v}', [['stat:dmgReduce', 1]], ['plated', 2]),
            n('spiked', 'Spiked Mail', 4, 2, 2, 'Attackers take {v} damage', [['stat:thorns', 5]], ['scar', 2]),
            n('unyielding', 'Unyielding', 5, 2, 0, '+{v} to all resistances', [['stat:resAll', 3]], ['thick', 3]),
            n('patience', "Mountain's Patience", 3, 3, 1, 'Replenish life +{v}', [['stat:lifeRegen', 2]], ['unyielding', 2]),
        ],
    },
    {
        id: 'rallying_roar', name: 'Rallying Roar', discipline: 'bulwark', unlockRank: 10, kind: 'buff', tags: ['area'],
        description: 'A war cry that steels you and your allies: more damage and resistances for a while.',
        baseInfo: ['Duration: 8s', 'Cooldown: 12s', '+15% damage, +10 all res'],
        tree: [
            n('long', 'Long Echo', 5, 0, 1, '+{v}s duration', [['durationSec', 1]]),
            n('fury', 'Battle Fury', 5, 1, 0, '+{v}% buff damage', [['buffDamagePct', 5]], ['long', 1]),
            n('hymn', 'Battle Hymn', 3, 1, 2, '+{v}% attack speed while active', [['buffAttackSpeedPct', 5]], ['long', 1]),
            n('terror', 'Terrifying', 1, 2, 0, 'Enemies nearby flee for 2s', [['fear', 1]], ['fury', 3]),
            n('hearth', 'Hearthsong', 3, 2, 2, 'Heals {v}% of life when used', [['healPct', 5]], ['hymn', 2]),
            n('quick', 'Hoarse Throat', 3, 3, 1, '-{v}% cooldown', [['cooldownPct', -10]], ['long', 4]),
        ],
    },

    // ============================================================ EMBERWRIGHT
    {
        id: 'cinder_bolt', name: 'Cinder Bolt', discipline: 'emberwright', unlockRank: 1, kind: 'spell', damageType: 'fire', tags: ['spell', 'projectile'],
        description: 'Fling a spitting coal from the forge of your palm.',
        baseInfo: ['Fire Damage: 4-9 (+20%/lvl)', 'Mana: 4'],
        tree: [
            n('stoked', 'Stoked', 5, 0, 1, '+{v}% damage', [['damagePct', 12]]),
            n('twin', 'Twin Embers', 2, 1, 0, '+{v} projectiles', [['projectiles', 1]], ['stoked', 2]),
            n('bellows', 'Bellows', 4, 1, 2, '+{v}% cast speed', [['castSpeedPct', 6]], ['stoked', 2]),
            n('pierce', "Smelter's Pierce", 2, 2, 0, 'Pierces {v} enemies', [['pierce', 1]], ['twin', 1]),
            n('kiln', 'Kiln Burst', 1, 2, 1, 'Explodes on impact (gains Area)', [['addTag:area', 1]], ['stoked', 4]),
            n('slag', 'Slag', 3, 3, 1, 'Leaves burning slag: {v}% damage over time', [['dotPct', 20], ['addTag:dot', 1]], ['kiln', 1]),
            n('frostforge', 'Frostforge', 1, 3, 2, 'Converts all Fire damage to Cold', [['convert:fire>cold', 100]], ['bellows', 3]),
            n('thrift', 'Thrift', 3, 4, 0, '-{v}% mana cost', [['manaCostPct', -10]], ['pierce', 2]),
        ],
    },
    {
        id: 'forgeheart', name: 'Forgeheart', discipline: 'emberwright', unlockRank: 5, kind: 'passive', tags: [],
        description: 'Something in your chest has started to glow.',
        baseInfo: ['Passive'],
        passivePerLevel: [{ stat: 'dmgPct:fire', value: 4 }, { stat: 'res:fire', value: 2 }],
        tree: [
            n('banked', 'Banked Coals', 5, 0, 1, 'Regenerate mana +{v}%', [['stat:manaRegen', 8]]),
            n('tempered', 'Tempered', 4, 1, 0, '+{v}% armor', [['stat:armorPct', 5]], ['banked', 2]),
            n('ignition', 'Ignition', 5, 1, 2, '+{v}% damage over time', [['stat:tagPct:dot', 6]], ['banked', 2]),
            n('molten_core', 'Molten Core', 3, 2, 2, '-{v}% to enemy fire resistance', [['stat:pen:fire', 4]], ['ignition', 3]),
            n('ashen', 'Ashen Will', 5, 2, 0, '+{v} to life', [['stat:life', 6]], ['tempered', 2]),
        ],
    },
    {
        id: 'molten_ring', name: 'Molten Ring', discipline: 'emberwright', unlockRank: 10, kind: 'spell', damageType: 'fire', tags: ['spell', 'area'],
        description: 'A ring of molten metal erupts outward from you.',
        baseInfo: ['Fire Damage: 10-18 (+18%/lvl)', 'Mana: 12'],
        tree: [
            n('radius', 'Spreading Heat', 4, 0, 1, '+{v}% area', [['areaPct', 15]]),
            n('hotter', 'Hotter', 5, 1, 0, '+{v}% damage', [['damagePct', 12]], ['radius', 1]),
            n('magma', 'Lingering Magma', 3, 1, 2, 'Leaves magma: {v}% damage over time', [['dotPct', 25], ['addTag:dot', 1]], ['radius', 2]),
            n('pulse', 'Second Pulse', 1, 2, 0, 'Erupts again after 1s', [['repeat', 1]], ['hotter', 4]),
            n('volcanic', 'Volcanic', 2, 2, 2, 'Knocks enemies back', [['knockback', 1]], ['magma', 1]),
            n('cinderguard', 'Cinderguard', 3, 3, 1, '+{v}% armor for 4s after casting', [['armorAfterPct', 10]], ['volcanic', 1]),
        ],
    },

    // ================================================================ GALEBORN
    {
        id: 'arcing_shot', name: 'Arcing Shot', discipline: 'galeborn', unlockRank: 1, kind: 'attack', damageType: 'lightning', tags: ['ranged', 'projectile'],
        description: 'A shot that hops between enemies. With a bow it fires an arrow; without one, you throw the spark yourself.',
        baseInfo: ['Weapon Damage: 110% as Lightning', 'Chains: 1', 'Mana: 5'],
        tree: [
            n('charged', 'Charged Tip', 5, 0, 1, '+{v}% damage', [['damagePct', 10]]),
            n('chain', 'Chain', 3, 1, 0, '+{v} chains', [['chains', 1]], ['charged', 2]),
            n('quick', 'Quick Draw', 4, 1, 2, '+{v}% attack speed', [['attackSpeedPct', 5]], ['charged', 1]),
            n('split', 'Split Bolt', 2, 2, 0, '+{v} projectiles', [['projectiles', 1]], ['chain', 2]),
            n('clap', 'Thunderclap', 1, 2, 2, 'Bursts on the final hit (gains Area)', [['addTag:area', 1]], ['quick', 2]),
            n('rime', 'Rime Arrow', 1, 3, 1, 'Converts all Lightning damage to Cold', [['convert:lightning>cold', 100]], ['charged', 5]),
            n('static', 'Static', 3, 3, 2, '+{v}% shock chance', [['shockPct', 10]], ['clap', 1]),
        ],
    },
    {
        id: 'tailwind', name: 'Tailwind', discipline: 'galeborn', unlockRank: 5, kind: 'passive', tags: [],
        description: 'The wind is always at your back now.',
        baseInfo: ['Passive'],
        passivePerLevel: [{ stat: 'moveSpeed', value: 2 }, { stat: 'attackSpeed', value: 1 }],
        tree: [
            n('slip', 'Slipstream', 5, 0, 1, '+{v}% faster run/walk', [['stat:moveSpeed', 2]]),
            n('eye', 'Eye of the Storm', 5, 1, 0, '+{v}% critical strike chance', [['stat:critChance', 1]], ['slip', 2]),
            n('second', 'Second Wind', 3, 1, 2, 'Replenish life +{v}', [['stat:lifeRegen', 2]], ['slip', 2]),
            n('gust', 'Gust Guard', 3, 2, 2, '+{v} to all resistances', [['stat:resAll', 2]], ['second', 2]),
            n('updraft', 'Updraft', 3, 2, 0, '+{v}% critical strike damage', [['stat:critDamage', 8]], ['eye', 3]),
        ],
    },
    {
        id: 'gust_step', name: 'Gust Step', discipline: 'galeborn', unlockRank: 10, kind: 'movement', tags: [],
        description: 'Become a gust of wind and reappear a short distance away.',
        baseInfo: ['Distance: 4 tiles', 'Cooldown: 4s'],
        tree: [
            n('stride', 'Long Stride', 3, 0, 1, '+{v}% distance', [['distancePct', 20]]),
            n('recharge', 'Recharge', 4, 1, 0, '-{v}% cooldown', [['cooldownPct', -8]], ['stride', 1]),
            n('thunderstep', 'Thunderstep', 3, 1, 2, 'Deals lightning damage along the path', [['pathDamagePct', 40]], ['stride', 2]),
            n('twin', 'Twin Step', 1, 2, 0, '+1 charge', [['charges', 1]], ['recharge', 3]),
            n('afterimage', 'Afterimage', 1, 2, 2, 'Leaves a decoy that draws attacks', [['decoy', 1]], ['thunderstep', 2]),
        ],
    },

    // ============================================================ HOLLOWCALLER
    {
        id: 'void_lance', name: 'Void Lance', discipline: 'hollowcaller', unlockRank: 1, kind: 'spell', damageType: 'void', tags: ['spell', 'projectile'],
        description: 'A spear of nothing. It goes through things.',
        baseInfo: ['Void Damage: 5-8 (+20%/lvl)', 'Pierces all', 'Mana: 6'],
        tree: [
            n('deeper', 'Deeper Dark', 5, 0, 1, '+{v}% damage', [['damagePct', 12]]),
            n('hunger', 'Hungering', 3, 1, 0, '{v}% of damage leeched as life', [['leechPct', 2]], ['deeper', 2]),
            n('volley', 'Lance Volley', 2, 1, 2, '+{v} projectiles', [['projectiles', 1]], ['deeper', 3]),
            n('splinter', 'Splinter', 1, 2, 2, 'Splits into 3 on kill', [['splitOnKill', 3]], ['volley', 1]),
            n('rot', 'Rotlance', 1, 2, 0, 'Converts all Void damage to Poison (gains Damage over Time)', [['convert:void>poison', 100], ['addTag:dot', 1]], ['hunger', 2]),
            n('horizon', 'Event Horizon', 1, 3, 1, 'Pulls enemies along its path', [['pull', 1]], ['deeper', 5]),
        ],
    },
    {
        id: 'hollow_thralls', name: 'Hollow Thralls', discipline: 'hollowcaller', unlockRank: 5, kind: 'summon', damageType: 'void', tags: ['minion'],
        description: 'Call hollow-eyed thralls that fight beside you. They do not complain.',
        baseInfo: ['Thralls: 1 (+1 per 5 levels)', 'Mana: 15'],
        tree: [
            n('more', 'More Thralls', 2, 0, 1, '+{v} thralls', [['minionCount', 1]]),
            n('bone', 'Bonecraft', 5, 1, 0, '+{v}% thrall life', [['minionLifePct', 15]], ['more', 1]),
            n('fury', 'Hollow Fury', 5, 1, 2, '+{v}% thrall damage', [['minionDamagePct', 12]], ['more', 1]),
            n('lantern', 'Grave Lantern', 1, 2, 2, 'Thralls explode when they die', [['deathBurst', 1]], ['fury', 3]),
            n('pact', 'Pact', 3, 2, 0, 'Heal {v}% of life when a thrall dies', [['healOnMinionDeathPct', 4]], ['bone', 2]),
            n('smith', 'Thrall-Smith', 1, 3, 1, 'Thralls deal Fire instead of Void, and benefit from your Fire damage', [['convert:void>fire', 100]], ['fury', 5]),
        ],
    },
    {
        id: 'rot_hex', name: 'Rot Hex', discipline: 'hollowcaller', unlockRank: 10, kind: 'spell', damageType: 'poison', tags: ['spell', 'area', 'dot'],
        description: 'Curse an area. The cursed rot, slowly, then quickly.',
        baseInfo: ['Poison: 20 over 4s (+22%/lvl)', 'Mana: 10'],
        tree: [
            n('linger', 'Linger', 3, 0, 1, '+{v}s duration', [['durationSec', 1]]),
            n('wither', 'Withering', 4, 1, 0, '-{v}% enemy resistances', [['enemyResPct', -4]], ['linger', 1]),
            n('contagion', 'Contagion', 1, 1, 2, 'Spreads to a nearby enemy on death', [['spread', 1]], ['linger', 2]),
            n('weakness', 'Weakness', 3, 2, 0, 'Hexed enemies deal {v}% less damage', [['enemyDamagePct', -5]], ['wither', 2]),
            n('bees', 'Swarm', 1, 2, 2, 'Hexed enemies release angry bees on death', [['bees', 1]], ['contagion', 1]),
        ],
    },
];

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
export function getSkill(id: string): SkillDef | undefined {
    return SKILL_BY_ID.get(id);
}
export function getDiscipline(id: string): DisciplineDef | undefined {
    return DISCIPLINES.find((d) => d.id === id);
}
export function skillsOf(id: DisciplineId): SkillDef[] {
    return SKILLS.filter((s) => s.discipline === id);
}

/** Max specialized skills (Last Epoch: 5). */
export const MAX_SPECIALIZED = 5;
/** Base tree points cap from skill level. */
export const SKILL_LEVEL_CAP = 20;
