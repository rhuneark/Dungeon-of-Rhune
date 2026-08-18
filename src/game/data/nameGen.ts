import type { ItemInstance, Rarity } from './types.ts';
import { getBaseType } from './baseTypes.ts';

/**
 * Comedic display names, v1 static word-bank (brief flags an AI-generated
 * v2 upgrade later). Higher rarity = more affixes = more words tacked on.
 */
const PREFIXES = [
    'Rusty',
    'Suspicious',
    'Overqualified',
    'Passive-Aggressive',
    'Discount',
    'Ceremonial',
    'Barely-Legal',
    'Emotionally Damaged',
    'Freelance',
    'Unlicensed',
    'Deeply Confused',
    'Mildly Cursed',
    'Artisanal',
    'Repossessed',
    'Overcaffeinated',
];

const SUFFIXES = [
    'of Mild Concern',
    'of Aggressive Napping',
    'of Overcommitment',
    'of Poor Decisions',
    "of Yesterday's Regret",
    'of Tax Evasion',
    'of Excessive Confidence',
    'of the Group Chat',
    'of Structural Integrity (Questionable)',
    'of the Landlord',
    'of Main Character Energy',
    'of Unpaid Overtime',
    'of Chronic Lateness',
    'of Personal Growth',
    'of Spite',
];

function pick<T>(arr: T[], seed: number): T {
    return arr[Math.floor(seed) % arr.length];
}

/** Deterministic-ish hash from the instance id so a given item's name is stable. */
function hashSeed(str: string, salt: number): number {
    let h = salt;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

export function itemDisplayName(item: ItemInstance): string {
    const base = getBaseType(item.baseTypeId);
    const affixCount = item.affixes.length;
    if (affixCount === 0) return base.name;

    const prefix = pick(PREFIXES, hashSeed(item.instanceId, 17));
    if (affixCount === 1) return `${prefix} ${base.name}`;

    const suffix = pick(SUFFIXES, hashSeed(item.instanceId, 31));
    if (affixCount <= 3) return `${prefix} ${base.name} ${suffix}`;

    const suffix2 = pick(SUFFIXES, hashSeed(item.instanceId, 53) + 7);
    return `${prefix} ${base.name} ${suffix}, ${suffix2}`;
}

export const RARITY_TITLE: Record<Rarity, string> = {
    common: '',
    uncommon: 'Fine ',
    rare: 'Remarkable ',
    epic: 'Exceptional ',
    legendary: 'LEGENDARY ',
};
