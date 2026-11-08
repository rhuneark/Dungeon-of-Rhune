/**
 * Prefix / suffix pool. Magic items roll up to 1 prefix + 1 suffix; rares
 * roll 3-6 affixes (max 3 of each kind). A tier rolls only when the item
 * level >= its alvl — so the SAME base gets better affixes deeper in the Pit,
 * which is why a level-28 Ring of the Wyrm beats a level-3 one.
 *
 * Names are tiered like D2 ("Jagged" → "Savage"), but the words are ours.
 */
import type { AffixDef, AffixTier, StatRoll } from './types.ts';
import { DISCIPLINE_IDS_FOR_AFFIXES, DISCIPLINE_AFFIX_NAMES } from '../skills/disciplineNames.ts';

const r = (stat: string, min: number, max: number, min2?: number, max2?: number): StatRoll => ({ stat, min, max, min2, max2 });
const t = (name: string, alvl: number, ...rolls: StatRoll[]): AffixTier => ({ name, alvl, rolls });

const ARMOR = ['armor', 'shield'];
const DEFENSIVE = ['armor', 'shield', 'jewelry', 'curio'];

export const AFFIXES: AffixDef[] = [
    // ================================================================ PREFIXES
    {
        id: 'ed_weapon', kind: 'prefix', group: 'ed', tags: ['weapon'], weight: 30,
        tiers: [
            t('Jagged', 1, r('localDmgPct', 10, 20)),
            t('Deadly', 5, r('localDmgPct', 21, 30)),
            t('Vicious', 10, r('localDmgPct', 31, 40)),
            t('Brutal', 16, r('localDmgPct', 41, 55)),
            t('Ruinous', 22, r('localDmgPct', 56, 70)),
            t('Savage', 28, r('localDmgPct', 71, 90)),
        ],
    },
    {
        id: 'ed_armor', kind: 'prefix', group: 'ed', tags: ARMOR, weight: 30,
        tiers: [
            t('Sturdy', 1, r('localArmorPct', 10, 20)),
            t('Stout', 6, r('localArmorPct', 21, 30)),
            t('Glorious', 12, r('localArmorPct', 31, 40)),
            t('Hallowed', 18, r('localArmorPct', 41, 55)),
            t('Saintly', 26, r('localArmorPct', 56, 70)),
        ],
    },
    {
        id: 'flat_armor', kind: 'prefix', group: 'flatdef', tags: ARMOR, weight: 20,
        tiers: [
            t('Hardened', 1, r('localArmor', 3, 8)),
            t('Reinforced', 8, r('localArmor', 9, 15)),
            t('Bulwarked', 16, r('localArmor', 16, 30)),
        ],
    },
    {
        id: 'mana', kind: 'prefix', group: 'mana', tags: ['helm', 'chest', 'jewelry', 'caster', 'curio'], weight: 20,
        tiers: [
            t('Glinting', 1, r('mana', 5, 10)),
            t('Lucent', 6, r('mana', 11, 20)),
            t('Radiant', 12, r('mana', 21, 30)),
            t('Brilliant', 20, r('mana', 31, 45)),
        ],
    },
    ...(
        [
            ['fire', ['Charred', 'Kilnfired', 'Emberwoven']],
            ['cold', ['Frosted', 'Rimebound', 'Wintersworn']],
            ['lightning', ['Grounded', 'Stormsealed', 'Thunderproof']],
            ['poison', ['Mossy', 'Antivenom', 'Viperskin']],
            ['void', ['Shaded', 'Umbral', 'Starless']],
        ] as const
    ).map(
        ([type, names]): AffixDef => ({
            id: `res_${type}`, kind: 'prefix', group: `res_${type}`, tags: DEFENSIVE, weight: 14,
            tiers: [t(names[0], 1, r(`res:${type}`, 5, 10)), t(names[1], 10, r(`res:${type}`, 11, 20)), t(names[2], 20, r(`res:${type}`, 21, 30))],
        })
    ),
    {
        id: 'res_all', kind: 'prefix', group: 'res_all', tags: ['shield', 'amulet', 'ring', 'curio'], weight: 8,
        tiers: [t('Shimmering', 5, r('resAll', 3, 8)), t('Warded', 14, r('resAll', 9, 15)), t('Prismatic', 24, r('resAll', 16, 22))],
    },
    ...(
        [
            ['phys', ['Keen', 'Honed', 'Whetted']],
            ['fire', ['Searing', 'Scorching', 'Infernal']],
            ['cold', ['Biting', 'Frigid', 'Hoarfrost']],
            ['lightning', ['Crackling', 'Sparking', 'Thundering']],
            ['poison', ['Noxious', 'Venomous', 'Pestilent']],
            ['void', ['Hollow', 'Abyssal', 'Eclipsed']],
        ] as const
    ).map(
        ([type, names]): AffixDef => ({
            id: `dmgpct_${type}`, kind: 'prefix', group: `dmgpct_${type}`, tags: ['caster', 'jewelry', 'tome', 'gloves'], weight: 10,
            tiers: [t(names[0], 3, r(`dmgPct:${type}`, 5, 10)), t(names[1], 10, r(`dmgPct:${type}`, 11, 20)), t(names[2], 20, r(`dmgPct:${type}`, 21, 30))],
        })
    ),
    ...(
        [
            ['projectile', 'Piercing', 'Impaling'],
            ['area', 'Sweeping', 'Cataclysmic'],
            ['spell', 'Arcane', 'Eldritch'],
            ['melee', 'Martial', 'Warlord\'s'],
            ['minion', 'Commanding', 'Sovereign'],
            ['dot', 'Festering', 'Lingering'],
        ] as const
    ).map(
        ([tag, n1, n2]): AffixDef => ({
            id: `tag_${tag}`, kind: 'prefix', group: `tag_${tag}`, tags: ['weapon', 'jewelry', 'offhand', 'gloves'], weight: 8,
            tiers: [t(n1, 4, r(`tagPct:${tag}`, 8, 15)), t(n2, 16, r(`tagPct:${tag}`, 16, 30))],
        })
    ),
    // +Discipline skills — the D2 "class amulet" homage. Rare, chase-worthy.
    ...DISCIPLINE_IDS_FOR_AFFIXES.map(
        (d): AffixDef => ({
            id: `skilldisc_${d}`, kind: 'prefix', group: 'skilldisc', tags: ['amulet', 'caster', 'helm', 'curio_large'], weight: 3,
            tiers: [t(DISCIPLINE_AFFIX_NAMES[d][0], 10, r(`skillDisc:${d}`, 1, 1)), t(DISCIPLINE_AFFIX_NAMES[d][1], 26, r(`skillDisc:${d}`, 2, 2))],
        })
    ),
    {
        id: 'gold', kind: 'prefix', group: 'gold', tags: ['armor', 'jewelry', 'curio'], weight: 10,
        tiers: [t('Gilded', 1, r('findGold', 15, 40)), t('Avaricious', 10, r('findGold', 41, 80))],
    },
    // Targeted Find — hunt the KIND of loot you want.
    ...(
        [
            ['weapon', "Quartermaster's"],
            ['armor', "Outfitter's"],
            ['jewelry', "Jeweler's"],
            ['curio', "Collector's"],
            ['rhune', "Scribe's"],
            ['unique', "Grailseeker's"],
        ] as const
    ).map(
        ([kind, name]): AffixDef => ({
            id: `seek_${kind}`, kind: 'prefix', group: 'seek', tags: ['helm', 'gloves', 'boots', 'belt', 'jewelry', 'curio'], weight: kind === 'unique' ? 3 : 6,
            tiers: [t(name, 4, r(`seek:${kind}`, 10, 20)), t(name, 14, r(`seek:${kind}`, 21, 35)), t(name, 24, r(`seek:${kind}`, 36, 50))],
        })
    ),
    {
        id: 'sockets', kind: 'prefix', group: 'sockets', tags: ['weapon', 'shield', 'helm', 'chest'], excludeTags: ['caster'], weight: 6,
        tiers: [t('Hollowed', 1, r('sockets', 1, 1)), t('Carved', 10, r('sockets', 2, 2)), t('Graven', 20, r('sockets', 3, 3))],
    },

    // ================================================================ SUFFIXES
    {
        id: 'life', kind: 'suffix', group: 'life', tags: ['armor', 'shield', 'jewelry'], weight: 30,
        tiers: [
            t('of the Hare', 1, r('life', 5, 10)),
            t('of the Stag', 6, r('life', 11, 20)),
            t('of the Boar', 12, r('life', 21, 30)),
            t('of the Bear', 20, r('life', 31, 40)),
            t('of the Wyrm', 28, r('life', 41, 55)),
        ],
    },
    ...(
        [
            ['might', ['of the Ox', 'of the Bull', 'of the Titan']],
            ['finesse', ['of the Fox', 'of the Lynx', 'of the Viper']],
            ['vigor', ['of the Oak', 'of the Mountain', 'of the Ages']],
            ['spirit', ['of the Owl', 'of the Sage', 'of the Oracle']],
        ] as const
    ).map(
        ([stat, names]): AffixDef => ({
            id: `attr_${stat}`, kind: 'suffix', group: `attr_${stat}`, tags: ['armor', 'shield', 'jewelry', 'weapon'], weight: 14,
            tiers: [t(names[0], 1, r(stat, 1, 4)), t(names[1], 10, r(stat, 5, 9)), t(names[2], 22, r(stat, 10, 15))],
        })
    ),
    {
        id: 'attack_speed', kind: 'suffix', group: 'ias', tags: ['weapon', 'gloves', 'jewelry'], excludeTags: ['caster'], weight: 12,
        tiers: [t('of Readiness', 3, r('attackSpeed', 8, 12)), t('of Alacrity', 12, r('attackSpeed', 13, 20)), t('of Flurries', 24, r('attackSpeed', 21, 30))],
    },
    {
        id: 'cast_speed', kind: 'suffix', group: 'fcr', tags: ['caster', 'jewelry', 'chest', 'tome'], weight: 12,
        tiers: [t('of Murmurs', 3, r('castSpeed', 8, 12)), t('of Incantation', 12, r('castSpeed', 13, 20)), t('of the Choir', 24, r('castSpeed', 21, 30))],
    },
    {
        id: 'move_speed', kind: 'suffix', group: 'frw', tags: ['boots'], weight: 25,
        tiers: [t('of Wandering', 2, r('moveSpeed', 10, 10)), t('of the Wind', 12, r('moveSpeed', 20, 20)), t('of the Gale', 22, r('moveSpeed', 30, 30))],
    },
    {
        id: 'max_dmg', kind: 'suffix', group: 'maxdmg', tags: ['weapon'], weight: 20,
        tiers: [t('of Wounding', 1, r('localMaxDmg', 1, 3)), t('of Ruin', 10, r('localMaxDmg', 4, 8)), t('of Carnage', 20, r('localMaxDmg', 9, 15))],
    },
    {
        id: 'min_dmg', kind: 'suffix', group: 'mindmg', tags: ['weapon'], weight: 14,
        tiers: [t('of the Fang', 1, r('localMinDmg', 1, 2)), t('of the Tusk', 10, r('localMinDmg', 3, 5)), t('of the Maw', 20, r('localMinDmg', 6, 9))],
    },
    ...(
        [
            ['fire', ['of Embers', 'of Flame', 'of Immolation'], [[1, 2, 3, 5], [3, 5, 7, 10], [6, 10, 14, 22]]],
            ['cold', ['of Frost', 'of Ice', 'of the Glacier'], [[1, 2, 2, 4], [3, 4, 6, 9], [5, 8, 12, 18]]],
            ['lightning', ['of Sparks', 'of Thunder', 'of the Storm'], [[1, 1, 4, 8], [1, 3, 10, 18], [2, 5, 22, 35]]],
            ['poison', ['of Venom', 'of the Asp', 'of Pestilence'], [[2, 3, 4, 6], [4, 6, 8, 12], [8, 12, 16, 24]]],
            ['void', ['of Shadows', 'of the Hollow', 'of the Abyss'], [[1, 2, 3, 5], [2, 4, 5, 8], [5, 8, 12, 18]]],
        ] as const
    ).map(
        ([type, names, v]): AffixDef => ({
            id: `add_${type}`, kind: 'suffix', group: `add_${type}`, tags: ['weapon', 'gloves', 'ring', 'curio'], excludeTags: ['caster'], weight: 10,
            tiers: [
                t(names[0], 1, r(`addDmg:${type}`, v[0][0], v[0][1], v[0][2], v[0][3])),
                t(names[1], 10, r(`addDmg:${type}`, v[1][0], v[1][1], v[1][2], v[1][3])),
                t(names[2], 22, r(`addDmg:${type}`, v[2][0], v[2][1], v[2][2], v[2][3])),
            ],
        })
    ),
    {
        id: 'crit_chance', kind: 'suffix', group: 'crit', tags: ['weapon', 'ring', 'amulet', 'gloves'], weight: 10,
        tiers: [t('of Precision', 5, r('critChance', 3, 5)), t('of Lethality', 18, r('critChance', 6, 10))],
    },
    {
        id: 'crit_damage', kind: 'suffix', group: 'critdmg', tags: ['weapon', 'amulet'], weight: 8,
        tiers: [t('of Ferocity', 8, r('critDamage', 10, 20)), t('of Slaughter', 20, r('critDamage', 21, 35))],
    },
    {
        id: 'life_leech', kind: 'suffix', group: 'leech', tags: ['weapon', 'gloves', 'ring', 'amulet'], excludeTags: ['caster'], weight: 8,
        tiers: [t('of the Leech', 5, r('lifeLeech', 2, 4)), t('of the Lamprey', 15, r('lifeLeech', 5, 7))],
    },
    {
        id: 'mana_leech', kind: 'suffix', group: 'mleech', tags: ['weapon', 'gloves', 'ring', 'amulet'], weight: 6,
        tiers: [t('of the Moth', 5, r('manaLeech', 2, 4)), t('of the Wisp', 15, r('manaLeech', 5, 7))],
    },
    {
        id: 'life_on_kill', kind: 'suffix', group: 'lok', tags: ['weapon', 'gloves', 'ring'], weight: 8,
        tiers: [t('of the Vulture', 3, r('lifeOnKill', 2, 4)), t('of the Carrion', 14, r('lifeOnKill', 5, 9))],
    },
    {
        id: 'life_regen', kind: 'suffix', group: 'regen', tags: ['jewelry', 'chest', 'belt', 'helm'], weight: 10,
        tiers: [t('of Mending', 1, r('lifeRegen', 1, 2)), t('of Renewal', 12, r('lifeRegen', 3, 5))],
    },
    {
        id: 'mana_regen', kind: 'suffix', group: 'mregen', tags: ['jewelry', 'caster', 'helm', 'tome'], weight: 10,
        tiers: [t('of the Spring', 3, r('manaRegen', 10, 20)), t('of the Wellspring', 14, r('manaRegen', 21, 40))],
    },
    {
        id: 'thorns', kind: 'suffix', group: 'thorns', tags: ['chest', 'shield'], weight: 8,
        tiers: [t('of Brambles', 1, r('thorns', 2, 5)), t('of Thorns', 10, r('thorns', 6, 12)), t('of Spite', 20, r('thorns', 13, 25))],
    },
    {
        id: 'dmg_reduce', kind: 'suffix', group: 'dr', tags: ['chest', 'shield', 'helm', 'belt'], weight: 8,
        tiers: [t('of Warding', 5, r('dmgReduce', 1, 2)), t('of Iron Skin', 15, r('dmgReduce', 3, 5))],
    },
    {
        id: 'block', kind: 'suffix', group: 'block', tags: ['shield'], weight: 12,
        tiers: [t('of Deflection', 3, r('block', 5, 10)), t('of the Bastion', 15, r('block', 11, 20))],
    },
    {
        id: 'light', kind: 'suffix', group: 'light', tags: ['helm', 'ring', 'amulet', 'weapon'], weight: 8,
        tiers: [t('of the Candle', 1, r('lightRadius', 1, 1)), t('of the Lantern', 6, r('lightRadius', 2, 2)), t('of the Sun', 15, r('lightRadius', 3, 3))],
    },
    {
        id: 'rarity_find', kind: 'suffix', group: 'mf', tags: ['armor', 'jewelry'], weight: 12,
        tiers: [t('of Luck', 1, r('findRarity', 5, 10)), t('of Fortune', 10, r('findRarity', 11, 20)), t('of Providence', 20, r('findRarity', 21, 30))],
    },
    {
        id: 'quantity_find', kind: 'suffix', group: 'quantity', tags: ['jewelry', 'gloves'], weight: 5,
        tiers: [t('of Plenty', 10, r('findQuantity', 5, 10)), t('of Abundance', 22, r('findQuantity', 11, 20))],
    },
    {
        id: 'xp_gain', kind: 'suffix', group: 'xp', tags: ['amulet', 'helm'], weight: 4,
        tiers: [t('of the Scholar', 8, r('xpGain', 2, 4)), t('of the Archivist', 20, r('xpGain', 5, 8))],
    },

    // ======================= pseudo-affixes (never roll normally: weight 0, no tags)
    // Quality tiers below magic express their bonus/penalty as an affix line.
    { id: 'superior_w', kind: 'prefix', group: 'quality', tags: [], weight: 0, tiers: [t('Superior', 1, r('localDmgPct', 5, 15))] },
    { id: 'superior_a', kind: 'prefix', group: 'quality', tags: [], weight: 0, tiers: [t('Superior', 1, r('localArmorPct', 5, 15))] },
    { id: 'crude_w', kind: 'prefix', group: 'quality', tags: [], weight: 0, tiers: [t('Crude', 1, r('localDmgPct', -25, -15))] },
    { id: 'crude_a', kind: 'prefix', group: 'quality', tags: [], weight: 0, tiers: [t('Crude', 1, r('localArmorPct', -25, -15))] },

    // ============================================ CURIO-ONLY affixes (backpack charms)
    {
        id: 'c_life', kind: 'suffix', group: 'life', tags: ['curio'], weight: 30,
        tiers: [t('of Vitality', 1, r('life', 3, 8)), t('of Vigor', 10, r('life', 9, 15)), t('of Hardiness', 20, r('life', 16, 25))],
    },
    {
        id: 'c_mf', kind: 'suffix', group: 'mf', tags: ['curio'], weight: 15,
        tiers: [t('of Good Luck', 1, r('findRarity', 2, 5)), t('of Charmed Luck', 12, r('findRarity', 6, 9))],
    },
    {
        id: 'c_add', kind: 'prefix', group: 'c_add', tags: ['curio_medium', 'curio_large'], weight: 12,
        tiers: [t('Bristling', 10, r('addDmg:phys', 1, 2, 2, 4)), t('Serrated', 20, r('addDmg:phys', 2, 4, 5, 8))],
    },
    {
        id: 'c_res', kind: 'prefix', group: 'c_res', tags: ['curio'], weight: 15,
        tiers: [t('Tinted', 1, r('resAll', 2, 3)), t('Iridescent', 14, r('resAll', 4, 6))],
    },
];

const AFFIX_BY_ID = new Map(AFFIXES.map((a) => [a.id, a]));
export function getAffix(id: string): AffixDef | undefined {
    return AFFIX_BY_ID.get(id);
}

/** Curio bases only take affixes whose tags explicitly mention curio. */
export function affixAllowedOn(affix: AffixDef, baseTags: string[]): boolean {
    const isCurio = baseTags.includes('curio');
    if (isCurio && !affix.tags.some((tg) => tg.startsWith('curio'))) return false;
    if (!affix.tags.some((tg) => baseTags.includes(tg))) return false;
    if (affix.excludeTags?.some((tg) => baseTags.includes(tg))) return false;
    return true;
}

