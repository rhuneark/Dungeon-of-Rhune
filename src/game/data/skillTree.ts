/**
 * The passive skill tree: six branches, each a FREEFORM grid — no forced
 * node order, no prerequisites, no level-gating per node. Every regular
 * node can be ranked up to 3 times (1 point per rank, so 24 points fully
 * maxes a branch's 8 regular nodes) whenever the player has a free point;
 * spend it on whatever you want, whenever you want. Each branch also has 2
 * single-point Mastery nodes, unlocked once at least 9 points total are
 * spent among that branch's 8 regular nodes (any combination of nodes/
 * ranks counts) — no other prerequisite. See systems/skillTree.ts for the
 * point-spend/unlock logic; nothing here is level- or order-gated.
 *
 * Entirely passive: nothing here is player-triggered, every node is a
 * permanent modifier or a background proc dungeonScene.ts reads by key.
 * Every node's effect is data, not code — a `SkillEffect` is either a flat
 * StatBlock delta (folds into aggregateStats exactly like a Rhune) or a
 * `{ kind: 'special'; key; amount }` tuple that dungeonScene.ts reads by
 * key, magnitude scaled linearly by the node's current rank (rank 2 = 2x
 * rank 1, rank 3 = 3x). Rebalancing a number is always just editing the
 * `effects` array below — it never touches the gating logic in
 * systems/skillTree.ts. All magnitudes are first-pass placeholders.
 */
import type { StatBlock } from './types.ts';

export type SkillBranchId = 'hardpass' | 'glowup' | 'dejavu' | 'bonkytown' | 'thoughtsprayers' | 'zoomies';

export interface SkillBranchDef {
    id: SkillBranchId;
    name: string;
    /** The theme this branch is built around. */
    pillar: string;
    tagline: string;
    color: number;
}

export const SKILL_BRANCHES: SkillBranchDef[] = [
    { id: 'hardpass', name: 'Hard Pass', pillar: 'Order & Retaliation', tagline: 'Block it, reflect it, make them regret it.', color: 0x818cf8 },
    { id: 'glowup', name: 'Glow Up', pillar: 'Rhune Amplification', tagline: 'Your Rhunes, but ridiculous.', color: 0xc084fc },
    { id: 'dejavu', name: 'Deja Vu', pillar: 'Echo & Repetition', tagline: "Didn't we just do this? Do it again.", color: 0x67e8f9 },
    { id: 'bonkytown', name: 'Bonky-town', pillar: 'Chaos & Impact', tagline: 'Population: you, hitting things really hard.', color: 0xf97316 },
    { id: 'thoughtsprayers', name: 'Thoughts & Prayers', pillar: 'Sustain', tagline: "Thoughts and prayers won't save you. This will.", color: 0x4ade80 },
    { id: 'zoomies', name: 'Zoomies', pillar: 'Tempo & Speed', tagline: 'Fast is a personality trait now.', color: 0xfacc15 },
];

/**
 * `stat` folds a flat StatBlock delta into aggregateStats, same as a Rhune
 * statMod. `special` is a named runtime hook — dungeonScene.ts (via
 * systems/skillTree.ts's resolver) looks it up by `key` and applies
 * `amount`/`amount2` itself, since these describe behavior no flat stat can
 * express. Both scale linearly with the node's current rank.
 */
export type SkillEffect =
    | { kind: 'stat'; stat: keyof StatBlock; amount: number }
    | { kind: 'special'; key: string; amount?: number; amount2?: number };

export type SkillNodeKind = 'regular' | 'mastery';

export interface SkillNodeDef {
    id: string;
    branch: SkillBranchId;
    kind: SkillNodeKind;
    name: string;
    description: string;
    /** 3 for every regular node, 1 for every Mastery. */
    maxRank: number;
    /** Base per-rank magnitude — the resolver multiplies this by the node's current rank. */
    effects: SkillEffect[];
}

function regular(branch: SkillBranchId, key: string, name: string, description: string, effects: SkillEffect[]): SkillNodeDef {
    return { id: `${branch}_${key}`, branch, kind: 'regular', name, description, maxRank: 3, effects };
}
function mastery(branch: SkillBranchId, key: string, name: string, description: string, effects: SkillEffect[]): SkillNodeDef {
    return { id: `${branch}_${key}`, branch, kind: 'mastery', name, description, maxRank: 1, effects };
}

export const SKILL_NODES: SkillNodeDef[] = [
    // ============================ HARD PASS (Order & Retaliation) ============================
    regular('hardpass', 'bulwark', 'Bulwark', 'Per rank: +1% damage reduction.', [{ kind: 'stat', stat: 'damageReduction', amount: 0.01 }]),
    regular('hardpass', 'thick_skin', 'Thick Skin', 'Per rank: +6 max HP.', [{ kind: 'stat', stat: 'maxHp', amount: 6 }]),
    regular('hardpass', 'steady_guard', 'Steady Guard', 'Per rank: +1.5% block chance — blocked hits take no damage.', [{ kind: 'stat', stat: 'blockChance', amount: 0.015 }]),
    regular('hardpass', 'iron_resolve', 'Iron Resolve', 'Per rank: +0.03s post-hit invulnerability (status resistance, adapted).', [{ kind: 'stat', stat: 'invulnDuration', amount: 0.03 }]),
    regular('hardpass', 'measured_recovery', 'Measured Recovery', 'Being hit grants a brief burst of regen afterward. Scales with rank.', [{ kind: 'special', key: 'measuredRecovery', amount: 1.5, amount2: 2 }]),
    regular('hardpass', 'lawful_reprisal', 'Lawful Reprisal', 'Per rank: +1.5% of damage taken reflected to the attacker.', [{ kind: 'stat', stat: 'thornsPercent', amount: 0.015 }]),
    regular('hardpass', 'retribution', 'Retribution', 'Chance of a guaranteed counter-strike whenever you block or take a hit. Scales with rank.', [{ kind: 'special', key: 'retribution', amount: 6, amount2: 0.12 }]),
    regular('hardpass', 'plate_layer', 'Plate Layer', 'Per rank: +2 armor (flat damage reduction per hit).', [{ kind: 'stat', stat: 'armor', amount: 2 }]),
    mastery('hardpass', 'zero_tolerance', 'Zero Tolerance', 'Mastery — thorns triggers twice per hit taken instead of once.', [{ kind: 'special', key: 'thornsDoubleTrigger' }]),
    mastery('hardpass', 'no_exceptions', 'No Exceptions', 'Mastery — no single hit can ever deal more than 25% of your max HP.', [{ kind: 'special', key: 'unbroken', amount: 0.25 }]),

    // ============================== GLOW UP (Rhune Amplification) ==============================
    regular('glowup', 'attuned_socket', 'Attuned Socket', 'Per rank: +4% Rhune effect magnitude.', [{ kind: 'special', key: 'rhuneEffectMult', amount: 0.04 }]),
    regular('glowup', 'arcane_reservoir', 'Arcane Reservoir', 'Per rank: +5% Rhune buff/status duration.', [{ kind: 'special', key: 'rhuneDurationMult', amount: 0.05 }]),
    regular('glowup', 'elemental_attunement', 'Elemental Attunement', 'Per rank: +3% elemental damage.', [{ kind: 'special', key: 'elementalDamageMult', amount: 0.03 }]),
    regular('glowup', 'runic_ward', 'Runic Ward', 'Per rank: +1% damage reduction (elemental ward, adapted).', [{ kind: 'stat', stat: 'damageReduction', amount: 0.01 }]),
    regular('glowup', 'kindling', 'Kindling', 'Chance to apply a random status on hit, even without a matching Rhune. Scales with rank.', [{ kind: 'special', key: 'kindling', amount: 0.03 }]),
    regular('glowup', 'resonance', 'Resonance', 'Per rank: +4% Rhune proc chance.', [{ kind: 'special', key: 'rhuneProcChanceMult', amount: 0.04 }]),
    regular('glowup', 'deep_attunement', 'Deep Attunement', 'Rhune effects also apply a small stacking DoT. Scales with rank.', [{ kind: 'special', key: 'deepAttunement', amount: 1.5 }]),
    regular('glowup', 'runic_overcharge', 'Runic Overcharge', 'Per rank: +3 flat arcane damage.', [{ kind: 'stat', stat: 'arcaneDamage', amount: 3 }]),
    mastery('glowup', 'chain_reaction', 'Chain Reaction', 'Mastery — status effects have a chance to spread to nearby enemies on their own.', [{ kind: 'special', key: 'elementalCascade', amount: 0.12, amount2: 90 }]),
    mastery('glowup', 'fourth_rhune', 'The Fourth Rhune', 'Mastery — unlocks a 4th Rhune socket.', [{ kind: 'special', key: 'fourthRhune' }]),

    // =============================== DEJA VU (Echo & Repetition) ===============================
    regular('dejavu', 'familiar_foe', 'Familiar Foe', 'Per rank: +4% damage vs. enemies already hit this fight.', [{ kind: 'special', key: 'familiarFoe', amount: 0.04 }]),
    regular('dejavu', 'unforgotten', 'Unforgotten', 'Per rank: +5% buff/debuff duration.', [{ kind: 'special', key: 'buffDurationMult', amount: 0.05 }]),
    regular('dejavu', 'encore', 'Encore', 'Killing blows grant a temporary stacking damage buff. Scales with rank.', [{ kind: 'special', key: 'encore', amount: 0.01, amount2: 1.2 }]),
    regular('dejavu', 'lingering_echo', 'Lingering Echo', 'Per rank: +3% chance a hit repeats itself.', [{ kind: 'special', key: 'lingeringEcho', amount: 0.03 }]),
    regular('dejavu', 'faded_scars', 'Faded Scars', 'Regen scales with kills landed on this floor. Scales with rank.', [{ kind: 'special', key: 'fadedScars', amount: 0.15 }]),
    regular('dejavu', 'steady_recall', 'Steady Recall', 'Attack speed builds with every kill this floor, resets on floor change. Scales with rank.', [{ kind: 'special', key: 'steadyRecall', amount: 0.01, amount2: 0.4 }]),
    regular('dejavu', 'undying_recollection', 'Undying Recollection', "Encore's stacking kill-buff persists across floor transitions instead of resetting.", [{ kind: 'special', key: 'undyingRecollection' }]),
    regular('dejavu', 'repeat_strike', 'Repeat Strike', 'Per rank: +1 pierce — your hits carry on to hit again.', [{ kind: 'stat', stat: 'pierce', amount: 1 }]),
    mastery('dejavu', 'twice_as_nice', 'Twice as Nice', 'Mastery — every attack now hits twice, guaranteed.', [{ kind: 'special', key: 'echoingStrikes' }]),
    mastery('dejavu', 'groundhog_day', 'Groundhog Day', '+1% damage per floor reached this run, caps at 100%.', [{ kind: 'special', key: 'groundhogDay' }]),

    // ============================== BONKY-TOWN (Chaos & Impact) ==============================
    regular('bonkytown', 'chaotic_might', 'Chaotic Might', '+damage, with a small random bonus per hit. Scales with rank.', [{ kind: 'special', key: 'chaoticMight', amount: 0.01, amount2: 0.05 }]),
    regular('bonkytown', 'twist_of_fate', 'Twist of Fate', 'Per rank: +2% crit damage.', [{ kind: 'stat', stat: 'critDamage', amount: 0.02 }]),
    regular('bonkytown', 'volatile_strikes', 'Volatile Strikes', 'Per rank: +2% chance to apply a random status on hit.', [{ kind: 'special', key: 'volatileStrikes', amount: 0.02 }]),
    regular('bonkytown', 'adaptive_reflexes', 'Adaptive Reflexes', 'Taking a hit briefly boosts dodge chance. Scales with rank.', [{ kind: 'special', key: 'adaptiveReflexes', amount: 0.04, amount2: 0.7 }]),
    regular('bonkytown', 'shifting_form', 'Shifting Form', 'Per rank: +2 move speed.', [{ kind: 'stat', stat: 'moveSpeed', amount: 2 }]),
    regular('bonkytown', 'entropy', 'Entropy', 'Per rank: +4% damage vs. enemies afflicted with 2+ status types.', [{ kind: 'special', key: 'entropy', amount: 0.04 }]),
    regular('bonkytown', 'wild_conversion', "Wild Conversion", "Chance per hit that its damage type shifts, applying that element's status rider. Scales with rank.", [{ kind: 'special', key: 'wildConversion', amount: 0.3 }]),
    regular('bonkytown', 'sledgehammer', 'Sledgehammer', 'Per rank: +6 knockback on hit.', [{ kind: 'stat', stat: 'knockback', amount: 6 }]),
    mastery('bonkytown', 'double_or_nothing', 'Double or Nothing', 'Mastery — projectiles split into two, guaranteed.', [{ kind: 'special', key: 'doubleOrNothing' }]),
    mastery('bonkytown', 'finders_keepers', 'Finders Keepers', 'Mastery — +50% item find.', [{ kind: 'stat', stat: 'luck', amount: 0.5 }]),

    // ============================ THOUGHTS & PRAYERS (Sustain) ============================
    regular('thoughtsprayers', 'thriving', 'Thriving', 'Per rank: +5 max HP.', [{ kind: 'stat', stat: 'maxHp', amount: 5 }]),
    regular('thoughtsprayers', 'vigor', 'Vigor', 'Per rank: +0.25 HP regen/sec.', [{ kind: 'stat', stat: 'regen', amount: 0.25 }]),
    regular('thoughtsprayers', 'bloodletting', 'Bloodletting', 'Per rank: +0.7% lifesteal.', [{ kind: 'stat', stat: 'lifesteal', amount: 0.007 }]),
    regular('thoughtsprayers', 'resilient_flesh', 'Resilient Flesh', '+damage reduction while above 50% HP. Scales with rank.', [{ kind: 'special', key: 'resilientFlesh', amount: 0.02 }]),
    regular('thoughtsprayers', 'second_breath', 'Second Breath', 'Per rank: +0.7 heal burst on kill.', [{ kind: 'stat', stat: 'healOnKill', amount: 0.7 }]),
    regular('thoughtsprayers', 'overgrowth', 'Overgrowth', 'Regen scales up the lower your HP is. Scales with rank.', [{ kind: 'special', key: 'overgrowth', amount: 1 }]),
    regular('thoughtsprayers', 'lifes_grip', "Life's Grip", 'Per rank: +3% effectiveness of all healing.', [{ kind: 'special', key: 'healMult', amount: 0.03 }]),
    regular('thoughtsprayers', 'clean_slate', 'Clean Slate', 'Per rank: +4% max HP restored on floor clear.', [{ kind: 'stat', stat: 'floorHealPct', amount: 0.04 }]),
    mastery('thoughtsprayers', 'bring_a_friend', 'Bring a Friend', 'Mastery — summon a permanent companion dealing passive damage.', [{ kind: 'special', key: 'bondedSpirit', amount: 4 }]),
    mastery('thoughtsprayers', 'unkillable', 'Unkillable (For a Bit)', 'Mastery — once per floor, surviving a killing blow at 1 HP instead of dying.', [{ kind: 'special', key: 'unkillable' }]),

    // ================================ ZOOMIES (Tempo & Speed) ================================
    regular('zoomies', 'fleet', 'Fleet', 'Per rank: +2.5 move speed.', [{ kind: 'stat', stat: 'moveSpeed', amount: 2.5 }]),
    regular('zoomies', 'quickstep', 'Quickstep', 'Per rank: +1.5% attack speed.', [{ kind: 'stat', stat: 'fireRate', amount: 0.015 }]),
    regular('zoomies', 'borrowed_second', 'Borrowed Second', 'Per rank: +1.3% attack speed (cooldown reduction, folded in).', [{ kind: 'stat', stat: 'fireRate', amount: 0.013 }]),
    regular('zoomies', 'steady_hands', 'Steady Hands', 'Per rank: +0.015s dodge invulnerability window.', [{ kind: 'stat', stat: 'invulnDuration', amount: 0.015 }]),
    regular('zoomies', 'brief_reprieve', 'Brief Reprieve', 'Dodging has a chance to briefly slow nearby enemies. Scales with rank.', [{ kind: 'special', key: 'briefReprieve', amount: 0.1, amount2: 35 }]),
    regular('zoomies', 'tick_tock', 'Tick Tock', 'Per rank: +3% chance your temporary effects refresh instead of expiring.', [{ kind: 'special', key: 'tickTock', amount: 0.03 }]),
    regular('zoomies', 'borrowed_moments', 'Borrowed Moments', 'Kills have a chance to reduce all weapon cooldowns. Scales with rank.', [{ kind: 'special', key: 'borrowedMoments', amount: 0.06, amount2: 0.15 }]),
    regular('zoomies', 'quick_draw', 'Quick Draw', 'Per rank: +40 projectile speed.', [{ kind: 'stat', stat: 'projectileSpeed', amount: 40 }]),
    mastery('zoomies', 'do_over', 'Do-Over', 'Mastery — once per floor, dying instead rewinds a few seconds, restoring your health and position from before the hit.', [{ kind: 'special', key: 'rewind', amount: 3 }]),
    mastery('zoomies', 'overclocked', 'Overclocked', 'Mastery — a large permanent boost to attack speed and move speed.', [
        { kind: 'stat', stat: 'moveSpeed', amount: 15 },
        { kind: 'stat', stat: 'fireRate', amount: 0.12 },
    ]),
];

export function getSkillNode(id: string): SkillNodeDef | undefined {
    return SKILL_NODES.find((n) => n.id === id);
}

export function nodesForBranch(branch: SkillBranchId): SkillNodeDef[] {
    return SKILL_NODES.filter((n) => n.branch === branch);
}

export function regularNodesForBranch(branch: SkillBranchId): SkillNodeDef[] {
    return SKILL_NODES.filter((n) => n.branch === branch && n.kind === 'regular');
}

export function masteryNodesForBranch(branch: SkillBranchId): SkillNodeDef[] {
    return SKILL_NODES.filter((n) => n.branch === branch && n.kind === 'mastery');
}

/** Points that must be spent among a branch's 8 regular nodes (any combination) before its Masteries unlock. */
export const MASTERY_UNLOCK_THRESHOLD = 9;
