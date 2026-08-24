/**
 * The passive skill tree: six pillars (branches), each a 16-node ARPG-style
 * graph — one Start node (selects the pillar, grants a small identity buff),
 * three Paths of sub-nodes fanning out from it (with a couple of deliberate
 * cross-links between paths, so it isn't three isolated lanes), and one
 * Final Convergence node per pillar: a huge capstone buff that costs no
 * point at all and unlocks automatically the moment every other node in
 * that pillar is learned — full commitment is its own reward.
 *
 * Nodes are level-gated (see `levelReq`) on top of their `prereq` chain, so
 * there's no saving points to jump ahead — you level into a path exactly
 * like most ARPGs. Max character level is 30, and the 15 purchasable nodes
 * per pillar (16 minus the free Final Convergence) all cost exactly 1
 * point, so a level-30 character can fully clear two pillars and build
 * around their synergy — see systems/skillTree.ts.
 *
 * Every node's effect is data, not code — a `SkillEffect` is either a flat
 * StatBlock delta (folds into aggregateStats exactly like a Rhune or a
 * Pillar) or a `{ kind: 'special'; key; amount }` tuple that dungeonScene.ts
 * reads by key. Rebalancing any node never requires touching combat code,
 * only this file — and every node has a stable name/id, because gear can
 * roll a "+node level" affix against specific nodes (see data/affixes.ts's
 * `nodeLevel` affix kind): level 1 is the node's listed effect, level 2
 * doubles it, level 3 triples it, and so on. All magnitudes below are
 * first-pass placeholders for playtesting.
 */
import type { StatBlock } from './types.ts';

export type SkillBranchId = 'axiora' | 'rhunekra' | 'hyphora' | 'fluxxara' | 'vitalis' | 'aeona';

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
    { id: 'rhunekra', name: 'Rhunekra', pillar: 'Magick', tagline: "Amplifies the Rhune socket system.", color: 0xc084fc },
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
 * express (procs, timers, conditional bonuses, structural unlocks). Both
 * scale linearly with the node's effective level — see resolveSkillTree.
 */
export type SkillEffect =
    | { kind: 'stat'; stat: keyof StatBlock; amount: number }
    | { kind: 'special'; key: string; amount?: number; amount2?: number };

export type SkillNodePosition = 'start' | 'path' | 'final';
export type SkillPath = 'A' | 'B' | 'C';

export interface SkillNodeDef {
    id: string;
    branch: SkillBranchId;
    position: SkillNodePosition;
    /** Which of the pillar's 3 paths this node belongs to — unset for start/final. */
    path?: SkillPath;
    /** Steps from the Start node along its path (0 for Start, 1..5 for path nodes, 6 for Final). */
    depth: number;
    name: string;
    description: string;
    /** 1 point for Start and every path node; 0 for Final — it's auto-unlocked, never bought. */
    cost: number;
    /** Character level required to allocate this node, on top of its prereqs. */
    levelReq: number;
    /** Node ids that must already be allocated (AND) before this one can be. */
    prereq: string[];
    effects: SkillEffect[];
}

interface NodeSpec {
    id: string;
    name: string;
    description: string;
    effects: SkillEffect[];
}

interface PillarSpec {
    start: NodeSpec;
    pathA: [NodeSpec, NodeSpec, NodeSpec, NodeSpec, NodeSpec];
    pathB: [NodeSpec, NodeSpec, NodeSpec, NodeSpec];
    pathC: [NodeSpec, NodeSpec, NodeSpec, NodeSpec, NodeSpec];
    final: NodeSpec;
}

/** Level gates per path, indexed by depth-1 — spaced across the 1-30 range with room to spare, so two pillars comfortably fit by 30. */
const LEVEL_A = [3, 6, 10, 14, 19];
const LEVEL_B = [3, 7, 12, 18];
const LEVEL_C = [3, 6, 10, 16, 22];

/**
 * Every pillar shares this shape: Start -> (Path A: 5 nodes, Path B: 4
 * nodes, Path C: 5 nodes) -> Final. Two deliberate cross-links stitch the
 * paths together rather than leaving them fully isolated — Path B's 3rd
 * node also requires Path A's 2nd, and Path C's 4th also requires Path B's
 * 3rd — so the "convergence" feeling starts well before the capstone.
 */
function buildPillar(branch: SkillBranchId, spec: PillarSpec): SkillNodeDef[] {
    const nodes: SkillNodeDef[] = [];
    const start = spec.start;
    nodes.push({
        id: start.id,
        branch,
        position: 'start',
        depth: 0,
        name: start.name,
        description: start.description,
        cost: 1,
        levelReq: 1,
        prereq: [],
        effects: start.effects,
    });

    const idsA: string[] = [];
    spec.pathA.forEach((s, i) => {
        const prereq = i === 0 ? [start.id] : [idsA[i - 1]];
        nodes.push({ id: s.id, branch, position: 'path', path: 'A', depth: i + 1, name: s.name, description: s.description, cost: 1, levelReq: LEVEL_A[i], prereq, effects: s.effects });
        idsA.push(s.id);
    });

    const idsB: string[] = [];
    spec.pathB.forEach((s, i) => {
        const prereq = i === 0 ? [start.id] : [idsB[i - 1]];
        if (i === 2) prereq.push(idsA[1]); // Path B's 3rd node also requires Path A's 2nd.
        nodes.push({ id: s.id, branch, position: 'path', path: 'B', depth: i + 1, name: s.name, description: s.description, cost: 1, levelReq: LEVEL_B[i], prereq, effects: s.effects });
        idsB.push(s.id);
    });

    const idsC: string[] = [];
    spec.pathC.forEach((s, i) => {
        const prereq = i === 0 ? [start.id] : [idsC[i - 1]];
        if (i === 3) prereq.push(idsB[2]); // Path C's 4th node also requires Path B's 3rd.
        nodes.push({ id: s.id, branch, position: 'path', path: 'C', depth: i + 1, name: s.name, description: s.description, cost: 1, levelReq: LEVEL_C[i], prereq, effects: s.effects });
        idsC.push(s.id);
    });

    const allOthers = [start.id, ...idsA, ...idsB, ...idsC];
    const final = spec.final;
    nodes.push({
        id: final.id,
        branch,
        position: 'final',
        depth: 6,
        name: final.name,
        description: final.description,
        cost: 0,
        levelReq: LEVEL_C[4],
        prereq: allOthers,
        effects: final.effects,
    });

    return nodes;
}

export const SKILL_NODES: SkillNodeDef[] = [
    // ============================= AXIORA (Law) =============================
    ...buildPillar('axiora', {
        start: { id: 'axiora_start', name: "Axiora's Oath", description: 'Swear the Oath — +1% damage reduction.', effects: [{ kind: 'stat', stat: 'damageReduction', amount: 0.01 }] },
        pathA: [
            { id: 'axiora_a1_broad_shoulders', name: 'Broad Shoulders', description: '+6 max HP.', effects: [{ kind: 'stat', stat: 'maxHp', amount: 6 }] },
            { id: 'axiora_a2_set_stance', name: 'Set Stance', description: '+2 armor.', effects: [{ kind: 'stat', stat: 'armor', amount: 2 }] },
            { id: 'axiora_minor_bulwark', name: 'Bulwark', description: '+3% damage reduction.', effects: [{ kind: 'stat', stat: 'damageReduction', amount: 0.03 }] },
            { id: 'axiora_minor_vitality_of_order', name: 'Vitality of Order', description: '+12 max HP.', effects: [{ kind: 'stat', stat: 'maxHp', amount: 12 }] },
            { id: 'axiora_notable_retribution', name: 'Retribution', description: 'Guaranteed counter-strike whenever you block or take a hit.', effects: [{ kind: 'special', key: 'retribution', amount: 10 }] },
        ],
        pathB: [
            { id: 'axiora_b1_level_head', name: 'Level Head', description: '+2% block chance.', effects: [{ kind: 'stat', stat: 'blockChance', amount: 0.02 }] },
            { id: 'axiora_minor_steady_guard', name: 'Steady Guard', description: '+3% block chance — blocked hits take no damage.', effects: [{ kind: 'stat', stat: 'blockChance', amount: 0.03 }] },
            { id: 'axiora_minor_lawful_reprisal', name: 'Lawful Reprisal', description: '+4% of damage taken reflected to the attacker.', effects: [{ kind: 'stat', stat: 'thornsPercent', amount: 0.04 }] },
            { id: 'axiora_minor_unshaken', name: 'Unshaken', description: 'Reduced stagger — +0.08s post-hit invulnerability.', effects: [{ kind: 'stat', stat: 'invulnDuration', amount: 0.08 }] },
        ],
        pathC: [
            { id: 'axiora_minor_iron_resolve', name: 'Iron Resolve', description: '+2% damage reduction.', effects: [{ kind: 'stat', stat: 'damageReduction', amount: 0.02 }] },
            { id: 'axiora_minor_measured_recovery', name: 'Measured Recovery', description: 'Being hit grants a brief burst of regen afterward.', effects: [{ kind: 'special', key: 'measuredRecovery', amount: 4, amount2: 2.5 }] },
            { id: 'axiora_c3_grim_patience', name: 'Grim Patience', description: '+0.03s post-hit invulnerability.', effects: [{ kind: 'stat', stat: 'invulnDuration', amount: 0.03 }] },
            { id: 'axiora_c4_iron_will', name: 'Iron Will', description: '+1% of damage taken reflected to the attacker.', effects: [{ kind: 'stat', stat: 'thornsPercent', amount: 0.01 }] },
            { id: 'axiora_notable_unbroken', name: 'Unbroken', description: "Immune to being crit — no single hit can deal more than 25% of your max HP.", effects: [{ kind: 'special', key: 'unbroken', amount: 0.25 }] },
        ],
        final: { id: 'axiora_capstone_aegis', name: 'Aegis of Axiora', description: 'Final Convergence — every 20s, gain 2s of total damage immunity on a fixed timer.', effects: [{ kind: 'special', key: 'aegisOfAxiora', amount: 20, amount2: 2 }] },
    }),

    // ============================ RHUNEKRA (Magick) ============================
    ...buildPillar('rhunekra', {
        start: { id: 'rhunekra_start', name: 'Rhunic Spark', description: 'Awaken the Rhunes — +2 arcane damage.', effects: [{ kind: 'stat', stat: 'arcaneDamage', amount: 2 }] },
        pathA: [
            { id: 'rhunekra_a1_minor_working', name: 'Minor Working', description: '+2 fire damage.', effects: [{ kind: 'stat', stat: 'fireDamage', amount: 2 }] },
            { id: 'rhunekra_a2_focused_casting', name: 'Focused Casting', description: '+3% crit chance.', effects: [{ kind: 'stat', stat: 'critChance', amount: 0.03 }] },
            { id: 'rhunekra_minor_attuned_socket', name: 'Attuned Socket', description: '+8% Rhune effect magnitude.', effects: [{ kind: 'special', key: 'rhuneEffectMult', amount: 0.08 }] },
            { id: 'rhunekra_minor_arcane_reservoir', name: 'Arcane Reservoir', description: '+10% Rhune buff/status duration.', effects: [{ kind: 'special', key: 'rhuneDurationMult', amount: 0.1 }] },
            { id: 'rhunekra_notable_overcharged_sigils', name: 'Overcharged Sigils', description: 'Rhune procs pulse to nearby enemies.', effects: [{ kind: 'special', key: 'overchargedSigils', amount: 90 }] },
        ],
        pathB: [
            { id: 'rhunekra_b1_steady_hand', name: 'Steady Hand', description: '+2 ice damage.', effects: [{ kind: 'stat', stat: 'iceDamage', amount: 2 }] },
            { id: 'rhunekra_minor_elemental_attunement', name: 'Elemental Attunement', description: '+6% elemental damage.', effects: [{ kind: 'special', key: 'elementalDamageMult', amount: 0.06 }] },
            { id: 'rhunekra_minor_kindling', name: 'Kindling', description: 'Small chance to apply a random status on hit, even without a matching Rhune.', effects: [{ kind: 'special', key: 'kindling', amount: 0.06 }] },
            { id: 'rhunekra_minor_resonance', name: 'Resonance', description: '+8% Rhune proc chance.', effects: [{ kind: 'special', key: 'rhuneProcChanceMult', amount: 0.08 }] },
        ],
        pathC: [
            { id: 'rhunekra_minor_runic_ward', name: 'Runic Ward', description: '+2% damage reduction.', effects: [{ kind: 'stat', stat: 'damageReduction', amount: 0.02 }] },
            { id: 'rhunekra_minor_deep_attunement', name: 'Deep Attunement', description: 'Rhune effects also apply a small stacking DoT.', effects: [{ kind: 'special', key: 'deepAttunement', amount: 3 }] },
            { id: 'rhunekra_c3_latent_power', name: 'Latent Power', description: '+2 lightning damage.', effects: [{ kind: 'stat', stat: 'lightningDamage', amount: 2 }] },
            { id: 'rhunekra_c4_overflow', name: 'Overflow', description: '+2 poison damage.', effects: [{ kind: 'stat', stat: 'poisonDamage', amount: 2 }] },
            { id: 'rhunekra_notable_elemental_cascade', name: 'Elemental Cascade', description: 'Status effects have a chance to spread between nearby enemies.', effects: [{ kind: 'special', key: 'elementalCascade', amount: 0.12, amount2: 120 }] },
        ],
        final: { id: 'rhunekra_capstone_fourth_rhune', name: 'The Fourth Rhune', description: 'Final Convergence — unlocks a 4th Rhune socket.', effects: [{ kind: 'special', key: 'fourthRhune' }] },
    }),

    // ============================= HYPHORA (Memory) =============================
    ...buildPillar('hyphora', {
        start: { id: 'hyphora_start', name: 'First Memory', description: 'The first thing you remember — +5 max HP.', effects: [{ kind: 'stat', stat: 'maxHp', amount: 5 }] },
        pathA: [
            { id: 'hyphora_a1_recollection', name: 'Recollection', description: '+2% lifesteal.', effects: [{ kind: 'stat', stat: 'lifesteal', amount: 0.02 }] },
            { id: 'hyphora_a2_echo_fragment', name: 'Echo Fragment', description: '+3 loot radius.', effects: [{ kind: 'stat', stat: 'magnetRadius', amount: 3 }] },
            { id: 'hyphora_minor_lingering_echo', name: 'Lingering Echo', description: 'Small chance a hit repeats itself.', effects: [{ kind: 'special', key: 'lingeringEcho', amount: 0.06 }] },
            { id: 'hyphora_minor_retained_force', name: 'Retained Force', description: '+damage the longer the floor has lasted (caps out).', effects: [{ kind: 'special', key: 'retainedForce', amount: 0.01, amount2: 0.3 }] },
            { id: 'hyphora_notable_echoing_strikes', name: 'Echoing Strikes', description: 'Every attack automatically strikes twice, guaranteed.', effects: [{ kind: 'special', key: 'echoingStrikes' }] },
        ],
        pathB: [
            { id: 'hyphora_b1_old_habit', name: 'Old Habit', description: '+4 move speed.', effects: [{ kind: 'stat', stat: 'moveSpeed', amount: 4 }] },
            { id: 'hyphora_minor_unforgotten', name: 'Unforgotten', description: '+12% buff/debuff duration.', effects: [{ kind: 'special', key: 'buffDurationMult', amount: 0.12 }] },
            { id: 'hyphora_minor_familiar_foe', name: 'Familiar Foe', description: '+damage vs. enemies already hit this fight.', effects: [{ kind: 'special', key: 'familiarFoe', amount: 0.1 }] },
            { id: 'hyphora_minor_steady_recall', name: 'Steady Recall', description: '+attack speed the longer you stay in combat this floor (caps out).', effects: [{ kind: 'special', key: 'steadyRecall', amount: 0.004, amount2: 0.2 }] },
        ],
        pathC: [
            { id: 'hyphora_minor_faded_scars', name: 'Faded Scars', description: 'Regen scaled from a fraction of max HP.', effects: [{ kind: 'special', key: 'fadedScars', amount: 0.006 }] },
            { id: 'hyphora_minor_encore', name: 'Encore', description: 'Killing blows grant a temporary stacking damage buff.', effects: [{ kind: 'special', key: 'encore', amount: 0.02, amount2: 6 }] },
            { id: 'hyphora_c3_muscle_memory', name: 'Muscle Memory', description: '+3% crit chance.', effects: [{ kind: 'stat', stat: 'critChance', amount: 0.03 }] },
            { id: 'hyphora_c4_lasting_impression', name: 'Lasting Impression', description: '+2% damage reduction.', effects: [{ kind: 'stat', stat: 'damageReduction', amount: 0.02 }] },
            { id: 'hyphora_notable_undying_recollection', name: 'Undying Recollection', description: "Encore's stacking kill-buff persists across floor transitions instead of resetting.", effects: [{ kind: 'special', key: 'undyingRecollection' }] },
        ],
        final: { id: 'hyphora_capstone_perfect_recall', name: 'Perfect Recall', description: 'Final Convergence — every 8s, auto-repeat the single hardest hit you have dealt this run.', effects: [{ kind: 'special', key: 'perfectRecall', amount: 8 }] },
    }),

    // ============================ FLUXXARA (Change) ============================
    ...buildPillar('fluxxara', {
        start: { id: 'fluxxara_start', name: 'Spark of Change', description: 'Embrace the flux — +2% crit chance.', effects: [{ kind: 'stat', stat: 'critChance', amount: 0.02 }] },
        pathA: [
            { id: 'fluxxara_a1_flicker', name: 'Flicker', description: '+3 move speed.', effects: [{ kind: 'stat', stat: 'moveSpeed', amount: 3 }] },
            { id: 'fluxxara_a2_unstable_edge', name: 'Unstable Edge', description: '+2% crit damage.', effects: [{ kind: 'stat', stat: 'critDamage', amount: 0.02 }] },
            { id: 'fluxxara_minor_chaotic_might', name: 'Chaotic Might', description: '+damage, with a small random bonus per hit.', effects: [{ kind: 'special', key: 'chaoticMight', amount: 0.03, amount2: 0.15 }] },
            { id: 'fluxxara_minor_shifting_form', name: 'Shifting Form', description: '+6 move speed.', effects: [{ kind: 'stat', stat: 'moveSpeed', amount: 6 }] },
            { id: 'fluxxara_notable_doubled_fate', name: 'Doubled Fate', description: "Small chance projectiles split in two — guaranteed if Hyphora's Echoing Strikes is also allocated.", effects: [{ kind: 'special', key: 'doubledFate', amount: 0.1 }] },
        ],
        pathB: [
            { id: 'fluxxara_b1_random_chance', name: 'Random Chance', description: '+0.05 pierce.', effects: [{ kind: 'stat', stat: 'pierce', amount: 0.05 }] },
            { id: 'fluxxara_minor_volatile_strikes', name: 'Volatile Strikes', description: 'Chance to apply a random status on hit.', effects: [{ kind: 'special', key: 'volatileStrikes', amount: 0.05 }] },
            { id: 'fluxxara_minor_entropy', name: 'Entropy', description: '+damage vs. enemies afflicted with 2+ status types.', effects: [{ kind: 'special', key: 'entropy', amount: 0.12 }] },
            { id: 'fluxxara_minor_twist_of_fate', name: 'Twist of Fate', description: '+5% crit damage.', effects: [{ kind: 'stat', stat: 'critDamage', amount: 0.05 }] },
        ],
        pathC: [
            { id: 'fluxxara_minor_adaptive_reflexes', name: 'Adaptive Reflexes', description: 'Taking damage briefly boosts dodge chance.', effects: [{ kind: 'special', key: 'adaptiveReflexes', amount: 0.1, amount2: 2 }] },
            { id: 'fluxxara_minor_mutation', name: 'Mutation', description: 'Chance on kill for a temporary random stat spike.', effects: [{ kind: 'special', key: 'mutation', amount: 0.1, amount2: 0.25 }] },
            { id: 'fluxxara_c3_wild_card', name: 'Wild Card', description: '+2% dodge chance.', effects: [{ kind: 'stat', stat: 'dodgeChance', amount: 0.02 }] },
            { id: 'fluxxara_c4_chaos_touch', name: 'Chaos Touch', description: '+1 fire damage.', effects: [{ kind: 'stat', stat: 'fireDamage', amount: 1 }] },
            { id: 'fluxxara_notable_wild_conversion', name: 'Wild Conversion', description: "Each hit's damage type randomly shifts, applying that element's status rider.", effects: [{ kind: 'special', key: 'wildConversion' }] },
        ],
        final: { id: 'fluxxara_capstone_chaotic_surge', name: 'Chaotic Surge', description: 'Final Convergence — periodically converts your damage type and grants a large temporary boost.', effects: [{ kind: 'special', key: 'chaoticSurge', amount: 15, amount2: 0.3 }] },
    }),

    // ============================= VITALIS (Life) =============================
    ...buildPillar('vitalis', {
        start: { id: 'vitalis_start', name: 'Spark of Life', description: 'The first spark — +5 max HP.', effects: [{ kind: 'stat', stat: 'maxHp', amount: 5 }] },
        pathA: [
            { id: 'vitalis_a1_green_thumb', name: 'Green Thumb', description: '+0.3 HP regen/sec.', effects: [{ kind: 'stat', stat: 'regen', amount: 0.3 }] },
            { id: 'vitalis_a2_thick_skin', name: 'Thick Skin', description: '+2 armor.', effects: [{ kind: 'stat', stat: 'armor', amount: 2 }] },
            { id: 'vitalis_minor_thriving', name: 'Thriving', description: '+14 max HP.', effects: [{ kind: 'stat', stat: 'maxHp', amount: 14 }] },
            { id: 'vitalis_minor_vigor', name: 'Vigor', description: '+0.8 HP regen/sec.', effects: [{ kind: 'stat', stat: 'regen', amount: 0.8 }] },
            { id: 'vitalis_notable_bonded_spirit', name: 'Bonded Spirit', description: 'Summon a permanent companion dealing passive damage.', effects: [{ kind: 'special', key: 'bondedSpirit', amount: 4 }] },
        ],
        pathB: [
            { id: 'vitalis_b1_deep_breath', name: 'Deep Breath', description: '+1% lifesteal.', effects: [{ kind: 'stat', stat: 'lifesteal', amount: 0.01 }] },
            { id: 'vitalis_minor_bloodletting', name: 'Bloodletting', description: '+2% lifesteal.', effects: [{ kind: 'stat', stat: 'lifesteal', amount: 0.02 }] },
            { id: 'vitalis_minor_resilient_flesh', name: 'Resilient Flesh', description: '+damage reduction while above 50% HP.', effects: [{ kind: 'special', key: 'resilientFlesh', amount: 0.06 }] },
            { id: 'vitalis_minor_second_breath', name: 'Second Breath', description: '+2 heal on kill.', effects: [{ kind: 'stat', stat: 'healOnKill', amount: 2 }] },
        ],
        pathC: [
            { id: 'vitalis_minor_overgrowth', name: 'Overgrowth', description: 'Regen scales up the lower your HP is.', effects: [{ kind: 'special', key: 'overgrowth', amount: 3 }] },
            { id: 'vitalis_minor_lifes_grip', name: "Life's Grip", description: '+10% effectiveness of all healing.', effects: [{ kind: 'special', key: 'healMult', amount: 0.1 }] },
            { id: 'vitalis_c3_vital_spark', name: 'Vital Spark', description: '+1 heal on kill.', effects: [{ kind: 'stat', stat: 'healOnKill', amount: 1 }] },
            { id: 'vitalis_c4_endurance', name: 'Endurance', description: '+2% damage reduction.', effects: [{ kind: 'stat', stat: 'damageReduction', amount: 0.02 }] },
            { id: 'vitalis_notable_vital_surge', name: 'Vital Surge', description: 'Below 30% HP, gain a large temporary damage and lifesteal boost.', effects: [{ kind: 'special', key: 'vitalSurge', amount: 0.3, amount2: 0.15 }] },
        ],
        final: {
            id: 'vitalis_capstone_overflowing_life',
            name: 'Overflowing Life',
            description: 'Final Convergence — +50 max HP and +2 regen/sec, permanently.',
            effects: [
                { kind: 'stat', stat: 'maxHp', amount: 50 },
                { kind: 'stat', stat: 'regen', amount: 2 },
            ],
        },
    }),

    // ============================== AEONA (Time) ==============================
    ...buildPillar('aeona', {
        start: { id: 'aeona_start', name: 'Tick', description: 'The moment begins — +3 move speed.', effects: [{ kind: 'stat', stat: 'moveSpeed', amount: 3 }] },
        pathA: [
            { id: 'aeona_a1_fleeting_moment', name: 'Fleeting Moment', description: '+0.02 attack speed.', effects: [{ kind: 'stat', stat: 'fireRate', amount: 0.02 }] },
            { id: 'aeona_a2_borrowed_time', name: 'Borrowed Time', description: '+0.03s dodge invulnerability window.', effects: [{ kind: 'stat', stat: 'invulnDuration', amount: 0.03 }] },
            { id: 'aeona_minor_fleet', name: 'Fleet', description: '+8 move speed.', effects: [{ kind: 'stat', stat: 'moveSpeed', amount: 8 }] },
            { id: 'aeona_minor_quickstep', name: 'Quickstep', description: '+0.05 attack speed.', effects: [{ kind: 'stat', stat: 'fireRate', amount: 0.05 }] },
            {
                id: 'aeona_notable_quickened_reflexes',
                name: 'Quickened Reflexes',
                description: '+20 move speed, +0.15 attack speed, +0.15s dodge invulnerability.',
                effects: [
                    { kind: 'stat', stat: 'moveSpeed', amount: 20 },
                    { kind: 'stat', stat: 'fireRate', amount: 0.15 },
                    { kind: 'stat', stat: 'invulnDuration', amount: 0.15 },
                ],
            },
        ],
        pathB: [
            { id: 'aeona_b1_quick_reflexes', name: 'Quick Reflexes', description: '+2% dodge chance.', effects: [{ kind: 'stat', stat: 'dodgeChance', amount: 0.02 }] },
            { id: 'aeona_minor_borrowed_second', name: 'Borrowed Second', description: '+0.04 attack speed (cooldown reduction, folded in).', effects: [{ kind: 'stat', stat: 'fireRate', amount: 0.04 }] },
            { id: 'aeona_minor_steady_hands', name: 'Steady Hands', description: '+0.05s dodge invulnerability window.', effects: [{ kind: 'stat', stat: 'invulnDuration', amount: 0.05 }] },
            { id: 'aeona_minor_momentum', name: 'Momentum', description: '+damage the longer you move without stopping (caps out, resets on stopping).', effects: [{ kind: 'special', key: 'momentum', amount: 0.015, amount2: 0.3 }] },
        ],
        pathC: [
            { id: 'aeona_minor_brief_reprieve', name: 'Brief Reprieve', description: 'Chance on dodge to briefly slow nearby enemies.', effects: [{ kind: 'special', key: 'briefReprieve', amount: 0.35, amount2: 100 }] },
            { id: 'aeona_minor_tick_tock', name: 'Tick Tock', description: 'Chance your own temporary buffs refresh instead of expiring.', effects: [{ kind: 'special', key: 'tickTock', amount: 0.1 }] },
            { id: 'aeona_c3_passing_second', name: 'Passing Second', description: '+2 move speed.', effects: [{ kind: 'stat', stat: 'moveSpeed', amount: 2 }] },
            { id: 'aeona_c4_held_breath', name: 'Held Breath', description: '+2% crit chance.', effects: [{ kind: 'stat', stat: 'critChance', amount: 0.02 }] },
            { id: 'aeona_notable_borrowed_moments', name: 'Borrowed Moments', description: 'Kills have a chance to reduce all weapon cooldowns.', effects: [{ kind: 'special', key: 'borrowedMoments', amount: 0.2, amount2: 0.5 }] },
        ],
        final: { id: 'aeona_capstone_rewind', name: 'Rewind', description: 'Final Convergence — once per floor, dying instead rewinds a few seconds, restoring your health and position from before the hit.', effects: [{ kind: 'special', key: 'rewind', amount: 3 }] },
    }),
];

export function getSkillNode(id: string): SkillNodeDef | undefined {
    return SKILL_NODES.find((n) => n.id === id);
}

export function nodesForBranch(branch: SkillBranchId): SkillNodeDef[] {
    return SKILL_NODES.filter((n) => n.branch === branch);
}

/** All ids that must be allocated for a pillar's Final Convergence to auto-unlock. */
export function finalNodeForBranch(branch: SkillBranchId): SkillNodeDef {
    const node = SKILL_NODES.find((n) => n.branch === branch && n.position === 'final');
    if (!node) throw new Error(`No final node for branch ${branch}`);
    return node;
}
