/**
 * The passive skill tree: six branches, each themed to a lore pillar, each a
 * flat progression of 7 minor nodes -> 2 Notables (gated behind a minimum
 * spend in that branch) -> 1 Capstone (gated behind clearing the whole
 * branch, and mutually exclusive against every other branch's Capstone —
 * see systems/skillTree.ts's allocateNode). Entirely passive: nothing here
 * is player-triggered, every node is a permanent modifier or a background
 * proc dungeonScene.ts rolls on its own.
 *
 * Every node's effect is data, not code — a `SkillEffect` is either a flat
 * StatBlock delta (folds into aggregateStats exactly like a Rhune or a
 * Pillar) or a `{ kind: 'special'; key; amount }` tuple that dungeonScene.ts
 * reads by key. Rebalancing any node — including flipping which stat a
 * minor touches — never requires touching combat code, only this file.
 * All magnitudes below are first-pass placeholders for playtesting.
 */
import type { StatBlock } from './types.ts';

export type SkillBranchId = 'axiora' | 'rhynekra' | 'hyphora' | 'fluxxara' | 'vitalis' | 'aeona';
export type SkillNodeTier = 'minor' | 'notable' | 'capstone';

export interface SkillBranchDef {
    id: SkillBranchId;
    name: string;
    /** The lore pillar this branch is themed to. */
    pillar: string;
    tagline: string;
    color: number;
}

export const SKILL_BRANCHES: SkillBranchDef[] = [
    { id: 'axiora', name: 'Axiora', pillar: 'Law', tagline: 'Order & retaliation.', color: 0x818cf8 },
    { id: 'rhynekra', name: 'Rhynekra', pillar: 'Magick', tagline: "Amplifies the Rhune socket system.", color: 0xc084fc },
    { id: 'hyphora', name: 'Hyphora', pillar: 'Memory', tagline: 'Echo & repetition.', color: 0x67e8f9 },
    { id: 'fluxxara', name: 'Fluxxara', pillar: 'Change', tagline: 'Instability as power.', color: 0xf97316 },
    { id: 'vitalis', name: 'Vitalis', pillar: 'Life', tagline: 'Raw vitality.', color: 0x4ade80 },
    { id: 'aeona', name: 'Aeona', pillar: 'Time', tagline: 'Bending the moment.', color: 0xfacc15 },
];

/**
 * `stat` folds a flat StatBlock delta into aggregateStats, same as a Rhune
 * statMod. `special` is a named runtime hook — dungeonScene.ts (via
 * systems/skillTree.ts's resolver) looks it up by `key` and applies
 * `amount`/`amount2` itself, since these describe behavior no flat stat can
 * express (procs, timers, conditional bonuses, structural unlocks).
 */
export type SkillEffect =
    | { kind: 'stat'; stat: keyof StatBlock; amount: number }
    | { kind: 'special'; key: string; amount?: number; amount2?: number };

export interface SkillNodeDef {
    id: string;
    branch: SkillBranchId;
    tier: SkillNodeTier;
    name: string;
    description: string;
    cost: number;
    /** Points already spent in this branch (before this node) required to allocate it. */
    requiresBranchPoints: number;
    effects: SkillEffect[];
}

const MINOR_COST = 1;
const NOTABLE_COST = 2;
const CAPSTONE_COST = 3;
const NOTABLE_GATE = 4;
/** 7 minors (7) + 2 Notables (4) = 11 — a Capstone demands the whole branch below it first. */
const CAPSTONE_GATE = 11;

function minor(branch: SkillBranchId, key: string, name: string, description: string, effects: SkillEffect[]): SkillNodeDef {
    return { id: `${branch}_minor_${key}`, branch, tier: 'minor', name, description, cost: MINOR_COST, requiresBranchPoints: 0, effects };
}
function notable(branch: SkillBranchId, key: string, name: string, description: string, effects: SkillEffect[]): SkillNodeDef {
    return { id: `${branch}_notable_${key}`, branch, tier: 'notable', name, description, cost: NOTABLE_COST, requiresBranchPoints: NOTABLE_GATE, effects };
}
function capstone(branch: SkillBranchId, key: string, name: string, description: string, effects: SkillEffect[]): SkillNodeDef {
    return { id: `${branch}_capstone_${key}`, branch, tier: 'capstone', name, description, cost: CAPSTONE_COST, requiresBranchPoints: CAPSTONE_GATE, effects };
}

export const SKILL_NODES: SkillNodeDef[] = [
    // ============================= AXIORA (Law) =============================
    minor('axiora', 'bulwark', 'Bulwark', '+3% damage reduction.', [{ kind: 'stat', stat: 'damageReduction', amount: 0.03 }]),
    minor('axiora', 'vitality_of_order', 'Vitality of Order', '+12 max HP.', [{ kind: 'stat', stat: 'maxHp', amount: 12 }]),
    minor('axiora', 'steady_guard', 'Steady Guard', '+3% block chance — blocked hits take no damage.', [{ kind: 'stat', stat: 'blockChance', amount: 0.03 }]),
    minor('axiora', 'lawful_reprisal', 'Lawful Reprisal', '+4% of damage taken reflected to the attacker.', [{ kind: 'stat', stat: 'thornsPercent', amount: 0.04 }]),
    minor('axiora', 'unshaken', 'Unshaken', 'Reduced stagger — +0.08s post-hit invulnerability.', [{ kind: 'stat', stat: 'invulnDuration', amount: 0.08 }]),
    minor('axiora', 'iron_resolve', 'Iron Resolve', '+2% damage reduction (status resistance, adapted).', [{ kind: 'stat', stat: 'damageReduction', amount: 0.02 }]),
    minor('axiora', 'measured_recovery', 'Measured Recovery', 'Being hit grants a brief burst of regen afterward.', [{ kind: 'special', key: 'measuredRecovery', amount: 4, amount2: 2.5 }]),
    notable(
        'axiora',
        'retribution',
        'Retribution',
        'Guaranteed counter-strike whenever you block or take a hit.',
        [{ kind: 'special', key: 'retribution', amount: 10 }]
    ),
    notable(
        'axiora',
        'unbroken',
        'Unbroken',
        "Immune to being crit — no single hit can deal more than 25% of your max HP.",
        [{ kind: 'special', key: 'unbroken', amount: 0.25 }]
    ),
    capstone(
        'axiora',
        'aegis',
        'Aegis of Axiora',
        'Every 20s, gain 2s of total damage immunity on a fixed timer.',
        [{ kind: 'special', key: 'aegisOfAxiora', amount: 20, amount2: 2 }]
    ),

    // ============================ RHYNEKRA (Magick) ============================
    minor('rhynekra', 'attuned_socket', 'Attuned Socket', '+8% Rhune effect magnitude.', [{ kind: 'special', key: 'rhuneEffectMult', amount: 0.08 }]),
    minor('rhynekra', 'arcane_reservoir', 'Arcane Reservoir', '+10% Rhune buff/status duration.', [{ kind: 'special', key: 'rhuneDurationMult', amount: 0.1 }]),
    minor('rhynekra', 'elemental_attunement', 'Elemental Attunement', '+6% elemental damage.', [{ kind: 'special', key: 'elementalDamageMult', amount: 0.06 }]),
    minor('rhynekra', 'kindling', 'Kindling', 'Small chance to apply a random status on hit, even without a matching Rhune.', [{ kind: 'special', key: 'kindling', amount: 0.06 }]),
    minor('rhynekra', 'resonance', 'Resonance', '+8% Rhune proc chance.', [{ kind: 'special', key: 'rhuneProcChanceMult', amount: 0.08 }]),
    minor('rhynekra', 'runic_ward', 'Runic Ward', '+2% damage reduction (elemental ward, adapted).', [{ kind: 'stat', stat: 'damageReduction', amount: 0.02 }]),
    minor('rhynekra', 'deep_attunement', 'Deep Attunement', 'Rhune effects also apply a small stacking DoT.', [{ kind: 'special', key: 'deepAttunement', amount: 3 }]),
    notable(
        'rhynekra',
        'overcharged_sigils',
        'Overcharged Sigils',
        'Rhune procs pulse to nearby enemies.',
        [{ kind: 'special', key: 'overchargedSigils', amount: 90 }]
    ),
    notable(
        'rhynekra',
        'elemental_cascade',
        'Elemental Cascade',
        'Status effects have a chance to spread between nearby enemies.',
        [{ kind: 'special', key: 'elementalCascade', amount: 0.12, amount2: 120 }]
    ),
    capstone(
        'rhynekra',
        'fourth_rhune',
        'The Fourth Rhune',
        'Unlocks a 4th Rhune socket.',
        [{ kind: 'special', key: 'fourthRhune' }]
    ),

    // ============================= HYPHORA (Memory) =============================
    minor('hyphora', 'lingering_echo', 'Lingering Echo', 'Small chance a hit repeats itself.', [{ kind: 'special', key: 'lingeringEcho', amount: 0.06 }]),
    minor('hyphora', 'retained_force', 'Retained Force', '+damage the longer the floor has lasted (caps out).', [{ kind: 'special', key: 'retainedForce', amount: 0.01, amount2: 0.3 }]),
    minor('hyphora', 'unforgotten', 'Unforgotten', '+12% buff/debuff duration.', [{ kind: 'special', key: 'buffDurationMult', amount: 0.12 }]),
    minor('hyphora', 'familiar_foe', 'Familiar Foe', '+damage vs. enemies already hit this fight.', [{ kind: 'special', key: 'familiarFoe', amount: 0.1 }]),
    minor('hyphora', 'steady_recall', 'Steady Recall', '+attack speed the longer you stay in combat this floor (caps out).', [{ kind: 'special', key: 'steadyRecall', amount: 0.004, amount2: 0.2 }]),
    minor('hyphora', 'faded_scars', 'Faded Scars', 'Regen scaled from a fraction of max HP.', [{ kind: 'special', key: 'fadedScars', amount: 0.006 }]),
    minor('hyphora', 'encore', 'Encore', 'Killing blows grant a temporary stacking damage buff.', [{ kind: 'special', key: 'encore', amount: 0.02, amount2: 6 }]),
    notable(
        'hyphora',
        'echoing_strikes',
        'Echoing Strikes',
        'Every attack automatically strikes twice, guaranteed.',
        [{ kind: 'special', key: 'echoingStrikes' }]
    ),
    notable(
        'hyphora',
        'undying_recollection',
        'Undying Recollection',
        "Encore's stacking kill-buff persists across floor transitions instead of resetting.",
        [{ kind: 'special', key: 'undyingRecollection' }]
    ),
    capstone(
        'hyphora',
        'perfect_recall',
        'Perfect Recall',
        'Every 8s, auto-repeat the single hardest hit you have dealt this run.',
        [{ kind: 'special', key: 'perfectRecall', amount: 8 }]
    ),

    // ============================ FLUXXARA (Change) ============================
    minor('fluxxara', 'chaotic_might', 'Chaotic Might', '+damage, with a small random bonus per hit.', [{ kind: 'special', key: 'chaoticMight', amount: 0.03, amount2: 0.15 }]),
    minor('fluxxara', 'shifting_form', 'Shifting Form', '+6 move speed.', [{ kind: 'stat', stat: 'moveSpeed', amount: 6 }]),
    minor('fluxxara', 'volatile_strikes', 'Volatile Strikes', 'Chance to apply a random status on hit.', [{ kind: 'special', key: 'volatileStrikes', amount: 0.05 }]),
    minor('fluxxara', 'entropy', 'Entropy', '+damage vs. enemies afflicted with 2+ status types.', [{ kind: 'special', key: 'entropy', amount: 0.12 }]),
    minor('fluxxara', 'twist_of_fate', 'Twist of Fate', '+5% crit damage.', [{ kind: 'stat', stat: 'critDamage', amount: 0.05 }]),
    minor('fluxxara', 'adaptive_reflexes', 'Adaptive Reflexes', 'Taking damage briefly boosts dodge chance.', [{ kind: 'special', key: 'adaptiveReflexes', amount: 0.1, amount2: 2 }]),
    minor('fluxxara', 'mutation', 'Mutation', 'Chance on kill for a temporary random stat spike.', [{ kind: 'special', key: 'mutation', amount: 0.1, amount2: 0.25 }]),
    notable(
        'fluxxara',
        'doubled_fate',
        'Doubled Fate',
        "Small chance projectiles split in two — guaranteed if Hyphora's Echoing Strikes is also allocated.",
        [{ kind: 'special', key: 'doubledFate', amount: 0.1 }]
    ),
    notable(
        'fluxxara',
        'wild_conversion',
        'Wild Conversion',
        "Each hit's damage type randomly shifts, applying that element's status rider.",
        [{ kind: 'special', key: 'wildConversion' }]
    ),
    capstone(
        'fluxxara',
        'chaotic_surge',
        'Chaotic Surge',
        'Periodically converts your damage type and grants a large temporary boost.',
        [{ kind: 'special', key: 'chaoticSurge', amount: 15, amount2: 0.3 }]
    ),

    // ============================= VITALIS (Life) =============================
    minor('vitalis', 'thriving', 'Thriving', '+14 max HP.', [{ kind: 'stat', stat: 'maxHp', amount: 14 }]),
    minor('vitalis', 'vigor', 'Vigor', '+0.8 HP regen/sec.', [{ kind: 'stat', stat: 'regen', amount: 0.8 }]),
    minor('vitalis', 'bloodletting', 'Bloodletting', '+2% lifesteal.', [{ kind: 'stat', stat: 'lifesteal', amount: 0.02 }]),
    minor('vitalis', 'resilient_flesh', 'Resilient Flesh', '+damage reduction while above 50% HP.', [{ kind: 'special', key: 'resilientFlesh', amount: 0.06 }]),
    minor('vitalis', 'second_breath', 'Second Breath', '+2 heal on kill.', [{ kind: 'stat', stat: 'healOnKill', amount: 2 }]),
    minor('vitalis', 'overgrowth', 'Overgrowth', 'Regen scales up the lower your HP is.', [{ kind: 'special', key: 'overgrowth', amount: 3 }]),
    minor('vitalis', 'lifes_grip', "Life's Grip", '+10% effectiveness of all healing.', [{ kind: 'special', key: 'healMult', amount: 0.1 }]),
    notable(
        'vitalis',
        'bonded_spirit',
        'Bonded Spirit',
        'Summon a permanent companion dealing passive damage.',
        [{ kind: 'special', key: 'bondedSpirit', amount: 4 }]
    ),
    notable(
        'vitalis',
        'vital_surge',
        'Vital Surge',
        'Below 30% HP, gain a large temporary damage and lifesteal boost.',
        [{ kind: 'special', key: 'vitalSurge', amount: 0.3, amount2: 0.15 }]
    ),
    capstone(
        'vitalis',
        'overflowing_life',
        'Overflowing Life',
        '+50 max HP and +2 regen/sec, permanently.',
        [
            { kind: 'stat', stat: 'maxHp', amount: 50 },
            { kind: 'stat', stat: 'regen', amount: 2 },
        ]
    ),

    // ============================== AEONA (Time) ==============================
    minor('aeona', 'fleet', 'Fleet', '+8 move speed.', [{ kind: 'stat', stat: 'moveSpeed', amount: 8 }]),
    minor('aeona', 'quickstep', 'Quickstep', '+0.05 attack speed.', [{ kind: 'stat', stat: 'fireRate', amount: 0.05 }]),
    minor('aeona', 'borrowed_second', 'Borrowed Second', '+0.04 attack speed (cooldown reduction, folded in).', [{ kind: 'stat', stat: 'fireRate', amount: 0.04 }]),
    minor('aeona', 'steady_hands', 'Steady Hands', '+0.05s dodge invulnerability window.', [{ kind: 'stat', stat: 'invulnDuration', amount: 0.05 }]),
    minor('aeona', 'momentum', 'Momentum', '+damage the longer you move without stopping (caps out, resets on stopping).', [{ kind: 'special', key: 'momentum', amount: 0.015, amount2: 0.3 }]),
    minor('aeona', 'brief_reprieve', 'Brief Reprieve', 'Chance on dodge to briefly slow nearby enemies.', [{ kind: 'special', key: 'briefReprieve', amount: 0.35, amount2: 100 }]),
    minor('aeona', 'tick_tock', 'Tick Tock', 'Chance your own temporary buffs refresh instead of expiring.', [{ kind: 'special', key: 'tickTock', amount: 0.1 }]),
    notable(
        'aeona',
        'quickened_reflexes',
        'Quickened Reflexes',
        '+20 move speed, +0.15 attack speed, +0.15s dodge invulnerability.',
        [
            { kind: 'stat', stat: 'moveSpeed', amount: 20 },
            { kind: 'stat', stat: 'fireRate', amount: 0.15 },
            { kind: 'stat', stat: 'invulnDuration', amount: 0.15 },
        ]
    ),
    notable(
        'aeona',
        'borrowed_moments',
        'Borrowed Moments',
        'Kills have a chance to reduce all weapon cooldowns.',
        [{ kind: 'special', key: 'borrowedMoments', amount: 0.2, amount2: 0.5 }]
    ),
    capstone(
        'aeona',
        'rewind',
        'Rewind',
        'Once per floor, dying instead rewinds a few seconds, restoring your health and position from before the hit.',
        [{ kind: 'special', key: 'rewind', amount: 3 }]
    ),
];

export function getSkillNode(id: string): SkillNodeDef | undefined {
    return SKILL_NODES.find((n) => n.id === id);
}

export function nodesForBranch(branch: SkillBranchId): SkillNodeDef[] {
    return SKILL_NODES.filter((n) => n.branch === branch);
}
