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
    'Vaguely Haunted',
    'Self-Assembled',
    'Off-Brand',
    'Formerly Sentient',
    'Extremely Online',
    'Under-Insured',
    'Overly Attached',
    'Improvised',
    'Committee-Approved',
    'Post-Ironic',
    'Undocumented',
    'Load-Bearing',
    'Third-Party',
    'Unnecessarily Spiky',
    'Gently Radioactive',
    'Peer-Reviewed',
    'Conspicuously Dented',
    'Non-Refundable',
    'Somewhat Legal',
    'Aggressively Average',
    'Cursed (Allegedly)',
    'Pre-Owned',
    'Hastily Enchanted',
    'Union-Made',
    'Wildly Overconfident',
    'Slightly Damp',
    'Ergonomically Incorrect',
    'Locally Sourced',
    'Chronically Online',
    'Barely Sanctioned',
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
    'of the Ex',
    'of Buyer’s Remorse',
    'of Minor Celebrity',
    'of the HOA',
    'of Unsolicited Advice',
    'of Emotional Baggage',
    'of the Group Project',
    'of Situational Awareness (Lacking)',
    'of the Restraining Order',
    'of Sudden Confidence',
    'of the Family Group Chat',
    'of Plausible Deniability',
    'of the Fine Print',
    'of Questionable Ancestry',
    'of Extreme Prejudice',
    'of the Discount Rack',
    'of Unresolved Trauma',
    'of the Layoff',
    "of Nobody's Business",
    'of the Petty Feud',
    'of Overwhelming Odor',
    'of the Third Warning',
    'of Delayed Consequences',
    'of the Group Chat Admin',
    'of Structural Regret',
    'of the Long Con',
    'of Mandatory Fun',
    'of the Off-Season',
    'of Excessive Paperwork',
    'of the Last Straw',
    'of Unearned Swagger',
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
    const baseName = base?.name ?? 'Unknown Item';
    const affixCount = item.affixes.length;
    if (affixCount === 0) return baseName;

    const prefix = pick(PREFIXES, hashSeed(item.instanceId, 17));
    if (affixCount === 1) return `${prefix} ${baseName}`;

    const suffix = pick(SUFFIXES, hashSeed(item.instanceId, 31));
    if (affixCount <= 3) return `${prefix} ${baseName} ${suffix}`;

    const suffix2 = pick(SUFFIXES, hashSeed(item.instanceId, 53) + 7);
    return `${prefix} ${baseName} ${suffix}, ${suffix2}`;
}

export const RARITY_TITLE: Record<Rarity, string> = {
    common: '',
    uncommon: 'Fine ',
    rare: 'Remarkable ',
    epic: 'Exceptional ',
    legendary: 'LEGENDARY ',
};
