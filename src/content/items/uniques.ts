/**
 * Uniques. Every stat ROLLS within its range (perfect rolls are a chase), and
 * every unique is tracked in the Codex the first time you find it — the
 * Grail hunt is part of the game.
 *
 * Quirks (quirk:<id>) are the weird little things. Text-only for now; combat
 * hooks read them by id later.
 */
import type { StatRoll, UniqueDef } from './types.ts';

const r = (stat: string, min: number, max: number = min, min2?: number, max2?: number): StatRoll => ({ stat, min, max, min2, max2 });
const q = (id: string): StatRoll => ({ stat: `quirk:${id}`, min: 1, max: 1 });

export const QUIRKS: Record<string, string> = {
    frog: '1% chance on cast to turn an enemy into a frog',
    sparks: 'Your footsteps leave harmless sparks',
    ghosts: 'Slain enemies rise as ghosts who wave goodbye',
    fanfare: 'Gold pickups are announced by a tiny fanfare',
    trees: 'Deals double damage to anything that was once a tree',
    clang: 'Blocks make a deeply satisfying CLANG',
    hat: "It's a very lucky hat",
    itchy: 'Itchy',
    rattle: 'You rattle when you walk',
    pickpocket: 'Vendors sell to you 10% cheaper (they never notice)',
    mud: 'You leave muddy footprints',
    glutton: 'Potions heal 25% more',
    ruin: 'Gambling costs 10% more. Worth it?',
    honk: 'Honks when a unique item drops nearby',
    compass: 'Always points toward the nearest unique item',
    bees: 'Bzzz',
    whisper: 'Sometimes whispers the name of a rhune you do not own',
};

export const UNIQUES: UniqueDef[] = [
    // ---- weapons
    { id: 'grandmothers_needle', name: "Grandmother's Needle", baseId: 'dagger', qlvl: 3, reqLevel: 3, weight: 10,
        rolls: [r('localDmgPct', 40, 60), r('finesse', 3, 5), r('critChance', 5), r('lifeOnKill', 2, 3)],
        flavor: 'She darned socks with it. Also, other things.' },
    { id: 'first_oath', name: "Thornwick's First Oath", baseId: 'short_sword', qlvl: 4, reqLevel: 4, weight: 10,
        rolls: [r('localDmgPct', 50, 70), r('addDmg:fire', 2, 4, 6, 10), r('life', 10, 15), r('lightRadius', 2)],
        flavor: 'Sworn on the founding stone. Broken within the week.' },
    { id: 'the_persuader', name: 'The Persuader', baseId: 'club', qlvl: 2, reqLevel: 2, weight: 10,
        rolls: [r('localDmgPct', 60, 80), r('localMaxDmg', 3, 5), r('might', 3), r('thorns', 3)],
        flavor: 'Arguments end quickly.' },
    { id: 'kindling_splitter', name: 'Kindling Splitter', baseId: 'hand_axe', qlvl: 5, reqLevel: 5, weight: 10,
        rolls: [r('localDmgPct', 40, 60), r('addDmg:fire', 3, 5, 8, 12), r('dmgPct:fire', 10, 15), q('sparks')],
        flavor: 'Smells of pine sap and bad decisions.' },
    { id: 'wrens_whisper', name: "Wren's Whisper", baseId: 'short_bow', qlvl: 3, reqLevel: 3, weight: 10,
        rolls: [r('localDmgPct', 50, 70), r('attackSpeed', 15, 20), r('finesse', 4, 6), r('tagPct:projectile', 10, 20), r('moveSpeed', 10)],
        flavor: 'Wren never missed. Wren also never paid her tab.' },
    { id: 'pips_mistake', name: "Pip's Mistake", baseId: 'wand', qlvl: 2, reqLevel: 2, weight: 10,
        rolls: [r('skill:cinder_bolt', 2), r('mana', 15, 20), r('castSpeed', 10), q('frog')],
        flavor: 'Pip was trying to light a candle.' },
    { id: 'long_night_lantern', name: 'Lantern of the Long Night', baseId: 'staff', qlvl: 10, reqLevel: 10, weight: 8,
        rolls: [r('skillAll', 1), r('mana', 25, 35), r('lightRadius', 4), r('res:void', 20, 30), r('castSpeed', 20)],
        flavor: 'It has been lit for three hundred years. Nobody refills it.' },
    { id: 'long_goodbye', name: 'The Long Goodbye', baseId: 'spear', qlvl: 8, reqLevel: 8, weight: 8,
        rolls: [r('localDmgPct', 70, 100), r('critDamage', 20, 30), r('attackSpeed', 10), r('lifeLeech', 3, 5)],
        flavor: 'Keep them at arm’s length. Then a bit further.' },
    { id: 'ollos_correction', name: "Bishop Ollo's Correction", baseId: 'mace', qlvl: 9, reqLevel: 9, weight: 8,
        rolls: [r('localDmgPct', 60, 90), r('addDmg:lightning', 1, 2, 12, 20), r('spirit', 5), r('dmgReduce', 2)],
        flavor: 'Penance, delivered.' },
    { id: 'gravewake', name: 'Gravewake', baseId: 'greatsword', qlvl: 14, reqLevel: 14, weight: 6,
        rolls: [r('localDmgPct', 80, 120), r('addDmg:void', 4, 8, 10, 16), r('lifeLeech', 4, 6), r('might', 8, 12), q('ghosts')],
        flavor: 'The dead are polite about it, at least.' },
    { id: 'pauper_scepter', name: 'Scepter of the Pauper King', baseId: 'scepter', qlvl: 12, reqLevel: 12, weight: 6,
        rolls: [r('skillDisc:hollowcaller', 2), r('findGold', 50, 80), r('lifeRegen', 3), q('fanfare')],
        flavor: 'He ruled a kingdom of one beggar. The beggar was loyal.' },
    { id: 'woodcutters_grudge', name: "Woodcutter's Grudge", baseId: 'war_axe', qlvl: 16, reqLevel: 16, weight: 6,
        rolls: [r('localDmgPct', 100, 140), r('attackSpeed', 20), r('might', 10), q('trees')],
        flavor: 'The oak knows what it did.' },
    { id: 'anvils_opinion', name: "The Anvil's Opinion", baseId: 'maul', qlvl: 20, reqLevel: 20, weight: 5,
        rolls: [r('localDmgPct', 120, 160), r('localMinDmg', 5, 8), r('critChance', 5, 8), r('thorns', 10), r('dmgReduce', 3, 5)],
        flavor: 'Brannoc asked it once. It said: "Harder."' },

    // ---- off-hands
    { id: 'pan_lid', name: 'Pan Lid of Destiny', baseId: 'buckler', qlvl: 2, reqLevel: 2, weight: 10,
        rolls: [r('localArmorPct', 60, 90), r('block', 10), r('resAll', 5, 8), q('clang')],
        flavor: 'Destiny was mostly stew.' },
    { id: 'varns_marginalia', name: "Varn's Marginalia", baseId: 'tome', qlvl: 8, reqLevel: 8, weight: 8,
        rolls: [r('skillDisc:emberwright', 1), r('castSpeed', 15), r('xpGain', 5), r('mana', 20, 30)],
        flavor: '"See note 14." There is no note 14.' },
    { id: 'captains_last_stand', name: "Captain's Last Stand", baseId: 'kite_shield', qlvl: 15, reqLevel: 15, weight: 6,
        rolls: [r('localArmorPct', 80, 120), r('block', 15), r('life', 25, 40), r('resAll', 10, 15)],
        flavor: 'Maren’s mother held the gate with this. Maren will want it back.' },

    // ---- armor
    { id: 'lucky_hat', name: 'Lucky Hat', baseId: 'cap', qlvl: 1, reqLevel: 1, weight: 10,
        rolls: [r('findRarity', 20, 35), r('findGold', 25, 50), r('seek:unique', 10), q('hat')],
        flavor: 'Found in a ditch, which was lucky.' },
    { id: 'quiet_hours', name: 'Cowl of Quiet Hours', baseId: 'hood', qlvl: 6, reqLevel: 6, weight: 8,
        rolls: [r('spirit', 5, 8), r('mana', 15), r('castSpeed', 10), r('res:cold', 15, 20)],
        flavor: 'For the hours between the bells.' },
    { id: 'unbowed', name: 'Helm of the Unbowed', baseId: 'helm', qlvl: 16, reqLevel: 16, weight: 6,
        rolls: [r('localArmorPct', 80, 120), r('life', 20, 30), r('dmgReduce', 3), r('resAll', 8, 12)],
        flavor: 'The visor does not open. Neither did its owner’s mind.' },
    { id: 'grandfathers_woolens', name: "Grandfather's Woolens", baseId: 'quilted_armor', qlvl: 3, reqLevel: 3, weight: 10,
        rolls: [r('localArmorPct', 80, 120), r('res:cold', 20, 30), r('lifeRegen', 2, 3), q('itchy')],
        flavor: 'Knitted with love. And nettles.' },
    { id: 'last_rhunewright', name: 'Mantle of the Last Rhunewright', baseId: 'robe', qlvl: 14, reqLevel: 14, weight: 6,
        rolls: [r('skillAll', 1), r('castSpeed', 15, 20), r('manaRegen', 20, 30), r('res:void', 20), r('seek:rhune', 25, 40), q('whisper')],
        flavor: 'The hem is stitched with every word they knew. One is missing.' },
    { id: 'poachers_jerkin', name: "Poacher's Jerkin", baseId: 'leather_armor', qlvl: 8, reqLevel: 8, weight: 8,
        rolls: [r('localArmorPct', 60, 90), r('finesse', 5, 8), r('attackSpeed', 10), r('seek:curio', 20, 30)],
        flavor: 'Many pockets. Most of them are stolen.' },
    { id: 'rattlebones', name: 'Rattlebones', baseId: 'chain_mail', qlvl: 13, reqLevel: 13, weight: 6,
        rolls: [r('localArmorPct', 80, 110), r('thorns', 10, 15), r('dmgReduce', 2, 4), q('rattle')],
        flavor: 'Some of the links are teeth.' },
    { id: 'five_finger', name: 'Five-Finger Discount', baseId: 'gloves', qlvl: 4, reqLevel: 4, weight: 10,
        rolls: [r('findGold', 40, 60), r('attackSpeed', 10), r('seek:jewelry', 15, 25), q('pickpocket')],
        flavor: 'Pell has been looking for these.' },
    { id: 'grip_of_the_forge', name: 'Grip of the Forge', baseId: 'gauntlets', qlvl: 14, reqLevel: 14, weight: 6,
        rolls: [r('addDmg:fire', 3, 6, 8, 14), r('dmgPct:fire', 15, 25), r('might', 6, 10), r('attackSpeed', 10)],
        flavor: 'Still warm.' },
    { id: 'mudstompers', name: 'Mudstompers', baseId: 'boots', qlvl: 2, reqLevel: 2, weight: 10,
        rolls: [r('moveSpeed', 20), r('vigor', 3, 5), r('res:poison', 15, 25), q('mud')],
        flavor: 'Wipe your feet.' },
    { id: 'gale_shod', name: 'Gale-Shod', baseId: 'greaves', qlvl: 15, reqLevel: 15, weight: 6,
        rolls: [r('moveSpeed', 30), r('finesse', 6, 10), r('res:lightning', 20, 30)],
        flavor: 'The wind has to ask permission.' },
    { id: 'many_pockets', name: 'Belt of Many Pockets', baseId: 'sash', qlvl: 5, reqLevel: 5, weight: 10,
        rolls: [r('life', 10, 20), r('findQuantity', 5, 10), r('findGold', 20, 30)],
        flavor: 'At least nine. Possibly ten.' },
    { id: 'gluttons_cinch', name: 'Cinch of the Glutton', baseId: 'belt', qlvl: 11, reqLevel: 11, weight: 8,
        rolls: [r('life', 30, 45), r('lifeRegen', 3, 5), q('glutton')],
        flavor: 'Loosened twice. Tightened never.' },

    // ---- jewelry
    { id: 'small_mercies', name: 'Loop of Small Mercies', baseId: 'ring', qlvl: 6, reqLevel: 6, weight: 10,
        rolls: [r('life', 10, 15), r('lifeRegen', 2, 3), r('resAll', 5, 8)],
        flavor: 'It helps a little. That is the point.' },
    { id: 'gamblers_ruin', name: "Gambler's Ruin", baseId: 'ring', qlvl: 10, reqLevel: 10, weight: 8,
        rolls: [r('findRarity', 25, 40), r('critChance', 4, 6), q('ruin')],
        flavor: 'Odo has seven of these. He says they are lucky.' },
    { id: 'eye_of_the_goose', name: 'Eye of the Goose', baseId: 'amulet', qlvl: 7, reqLevel: 7, weight: 8,
        rolls: [r('findRarity', 15, 25), r('seek:unique', 15, 20), r('lightRadius', 2), q('honk')],
        flavor: 'It is watching. It is always watching.' },
    { id: 'hollow_heart', name: 'The Hollow Heart', baseId: 'amulet', qlvl: 18, reqLevel: 18, weight: 5,
        rolls: [r('skillDisc:hollowcaller', 2), r('dmgPct:void', 20, 30), r('life', 20, 30), r('res:void', 15)],
        flavor: 'It beats. Not in time with yours.' },

    // ---- curios
    { id: 'last_ember', name: 'The Last Ember', baseId: 'curio_small', qlvl: 16, reqLevel: 16, weight: 3,
        rolls: [r('allAttr', 6, 10), r('resAll', 6, 10), r('xpGain', 3, 5)],
        flavor: 'Carried up from the bottom of the Pit. By whom?' },
    { id: 'angry_bees', name: 'Jar of Angry Bees', baseId: 'curio_medium', qlvl: 12, reqLevel: 12, weight: 6,
        rolls: [r('addDmg:poison', 3, 5, 6, 10), r('thorns', 5, 8), q('bees')],
        flavor: 'Do not shake.' },
    { id: 'wanderers_compass', name: "Wanderer's Compass", baseId: 'curio_large', qlvl: 22, reqLevel: 22, weight: 3,
        rolls: [r('moveSpeed', 10), r('resAll', 8, 12), r('allAttr', 5, 8), q('compass')],
        flavor: 'North is wherever the treasure is.' },
];

const BY_ID = new Map(UNIQUES.map((u) => [u.id, u]));
export function getUnique(id: string): UniqueDef | undefined {
    return BY_ID.get(id);
}
export function uniquesForBase(baseId: string, ilvl: number): UniqueDef[] {
    return UNIQUES.filter((u) => u.baseId === baseId && u.qlvl <= ilvl);
}
