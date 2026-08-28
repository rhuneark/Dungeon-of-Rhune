/**
 * Core data model for Dungeon of Rhune's item/progression systems.
 * Base-type + affix-pool architecture: an ItemInstance references a
 * BaseTypeDef by id and carries its own rolled affix values, so two
 * instances of the same base type are never identical.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** The 8 gear slots + 2 jewelry + 3 Rhune sockets = 13 equip slots total. */
export type GearSlot =
    | 'head'
    | 'torso'
    | 'legs'
    | 'feet'
    | 'hand1'
    | 'hand2'
    | 'jewelry1'
    | 'jewelry2';

export const GEAR_SLOTS: GearSlot[] = [
    'head',
    'torso',
    'legs',
    'feet',
    'hand1',
    'hand2',
    'jewelry1',
    'jewelry2',
];

/** hand1/hand2 are fully generic: any hand-item base type fits either. */
export function slotAcceptsKind(slot: GearSlot, kind: ItemKind): boolean {
    if (slot === 'hand1' || slot === 'hand2') return kind === 'hand';
    if (slot === 'jewelry1' || slot === 'jewelry2') return kind === 'jewelry';
    return kind === slot;
}

export type ItemKind = 'head' | 'torso' | 'legs' | 'feet' | 'hand' | 'jewelry';

/** How a hand item behaves in combat. Armor/jewelry base types have no role. */
export type WeaponRole = 'melee' | 'ranged' | 'shield';

/** Damage flavor. A hit's total damage is computed per-element, so elemental
 * amplifiers (Rhunes) can scale each component independently. */
export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'arcane';

export const ELEMENTS: Element[] = ['physical', 'fire', 'ice', 'lightning', 'poison', 'arcane'];

export const ELEMENT_COLOR: Record<Element, number> = {
    physical: 0xe5e7eb,
    fire: 0xf97316,
    ice: 0x67e8f9,
    lightning: 0xfacc15,
    poison: 0x4ade80,
    arcane: 0xc084fc,
};

/** A status effect Rhunes can apply to enemies (on-hit procs, trails, auras). */
export type StatusType = 'slow' | 'burn' | 'poison' | 'shock' | 'stun';

export interface StatBlock {
    damage?: number;
    fireRate?: number; // attacks per second
    aoeRadius?: number; // design units, melee swing / projectile splash
    projectileSpeed?: number; // design units/sec, ranged only
    maxHp?: number;
    moveSpeed?: number; // design units/sec
    armor?: number; // flat damage reduction per hit
    critChance?: number; // 0..1
    critDamage?: number; // bonus added to the base 1.8x crit multiplier
    lifesteal?: number; // 0..1 fraction of damage dealt healed
    magnetRadius?: number; // design units, loot pickup radius
    projectileCount?: number; // extra projectiles per ranged shot
    pierce?: number; // extra enemies a projectile can pass through
    thorns?: number; // flat damage reflected to enemies that hit you
    dodgeChance?: number; // 0..1 chance to negate contact damage entirely
    damageReduction?: number; // 0..1 percent mitigation, stacks with armor
    fireDamage?: number; // flat bonus damage, dealt as its own 'fire' component
    iceDamage?: number; // flat bonus damage, dealt as its own 'ice' component
    lightningDamage?: number; // flat bonus damage, dealt as its own 'lightning' component
    poisonDamage?: number; // flat bonus damage, dealt as its own 'poison' component
    arcaneDamage?: number; // flat bonus damage, dealt as its own 'arcane' component
    healOnKill?: number; // flat HP restored per kill
    reviveChance?: number; // 0..1 chance to survive a lethal hit at 1 HP, once per floor
    luck?: number; // nudges floor-loot rarity weights toward rare+
    salvageBonus?: number; // 0..1 bonus salvage currency from items/Rhunes
    floorHealPct?: number; // 0..1 fraction of max HP restored on floor clear
    invulnDuration?: number; // bonus seconds added to post-hit invulnerability
    knockback?: number; // design units enemies are pushed back on hit
    regen?: number; // HP restored per second
    splashRadius?: number; // design units — ranged hits also damage enemies in this radius
    blockChance?: number; // 0..1 chance to block contact damage entirely (Axiora)
    thornsPercent?: number; // 0..1 fraction of damage taken reflected to the attacker (Axiora)
}

export const STAT_LABELS: Record<keyof StatBlock, string> = {
    damage: 'Damage',
    fireRate: 'Attack Speed',
    aoeRadius: 'Swing/Blast Radius',
    projectileSpeed: 'Projectile Speed',
    maxHp: 'Max HP',
    moveSpeed: 'Move Speed',
    armor: 'Armor',
    critChance: 'Crit Chance',
    critDamage: 'Crit Damage',
    lifesteal: 'Lifesteal',
    magnetRadius: 'Loot Radius',
    projectileCount: 'Extra Projectiles',
    pierce: 'Pierce',
    thorns: 'Thorns',
    dodgeChance: 'Dodge Chance',
    damageReduction: 'Damage Reduction',
    fireDamage: 'Fire Damage',
    iceDamage: 'Ice Damage',
    lightningDamage: 'Lightning Damage',
    poisonDamage: 'Poison Damage',
    arcaneDamage: 'Arcane Damage',
    healOnKill: 'Heal on Kill',
    reviveChance: 'Revive Chance',
    luck: 'Luck',
    salvageBonus: 'Salvage Bonus',
    floorHealPct: 'Floor-Clear Heal',
    invulnDuration: 'Invulnerability',
    knockback: 'Knockback',
    regen: 'HP Regen',
    splashRadius: 'Splash Radius',
    blockChance: 'Block Chance',
    thornsPercent: 'Thorns %',
};

export interface BaseTypeDef {
    id: string;
    name: string;
    kind: ItemKind;
    role?: WeaponRole; // set only for kind === 'hand'
    /** Damage element for kind==='hand' base stat damage. Defaults to 'physical'. */
    element?: Element;
    /** Base stat contribution before affixes, at rarity="common". */
    baseStats: StatBlock;
    /** id into AFFIX_POOLS — which affixes this base type can roll. */
    affixPoolId: string;
    /** Pixi Graphics draw color for the placeholder icon/world sprite. */
    color: number;
}

export interface StatAffixDef {
    kind: 'stat';
    id: string;
    stat: keyof StatBlock;
    label: string;
    min: number;
    max: number;
    isPercent?: boolean;
}

/** What triggers a proc affix. Mirrors Rhune hooks but lives on gear instead. */
export type ProcCause = 'onHit' | 'onCrit' | 'onKill' | 'onMove' | 'onBeingHit' | 'onFloorClear';

/**
 * What a proc affix does when it fires. Base magnitudes here scale with the
 * item's rarity the same way procAffixRuntime.ts scales Rhune effects.
 */
export type ProcEffect =
    | { kind: 'statusApply'; status: StatusType; magnitude: number; duration: number }
    /** "Throw N daggers/axes" — a burst of small projectiles from the player toward random nearby directions. */
    | { kind: 'projectileBurst'; count: number; damage: number; element: Element }
    | { kind: 'heal'; amount: number }
    /** Temporary buff to one elemental damage stat — "increase [dmg type] by X" for a few seconds. */
    | { kind: 'elementBoost'; element: Element; amount: number; duration: number }
    | { kind: 'explosion'; damage: number; radius: number; element: Element }
    | { kind: 'currency'; amount: number };

/** "X% chance on [cause] to [effect]" — the out-there proc affixes gear itself can roll. */
export interface ProcAffixDef {
    kind: 'proc';
    id: string;
    label: string;
    cause: ProcCause;
    chanceMin: number;
    chanceMax: number;
    effect: ProcEffect;
}

/**
 * "+N levels" to a specific named skill node (see data/skillTree.ts) — the
 * rare, flashy affix kind: a node's effect scales linearly with its
 * effective level (1 = base, 2 = double, 3 = triple...), so this is a
 * deliberately huge, build-defining roll rather than an incremental stat.
 * Only rolls on jewelry, and only targets a pillar's Final Convergence node
 * (see AFFIX_POOLS.jewelry) — exactly the "crazy buff, highly sought after"
 * gear the brief asked for.
 */
export interface NodeLevelAffixDef {
    kind: 'nodeLevel';
    id: string;
    nodeId: string;
    label: string;
}

export type AffixDef = StatAffixDef | ProcAffixDef | NodeLevelAffixDef;

export interface RolledAffix {
    affixId: string;
    /** Rolled stat bonus (stat affixes) or rolled proc chance 0..1 (proc affixes). */
    value: number;
}

export interface ItemInstance {
    instanceId: string;
    baseTypeId: string;
    rarity: Rarity;
    affixes: RolledAffix[];
    /** Tier the item dropped in — flavors salvage value. */
    tierDropped?: number;
}

/**
 * Rhune effects — the "extra 10 layers of chaos" on top of gear stats. Most
 * numeric fields here are BASE magnitudes at common rarity; rhuneRuntime.ts
 * scales them by the instance's rarity (RARITIES[rarity].valueMult) and
 * clamps proc chances, so a legendary Rhune of the same effect hits harder
 * / procs more often than a common one without needing separate defs.
 */
export type RhuneEffect =
    /** Plain flat/percent bonus to a StatBlock field — folded into aggregateStats like an affix. */
    | { kind: 'statMod'; stat: keyof StatBlock; baseValue: number }
    /** Chance on a weapon hit (optionally crit-only) to apply a status effect to the enemy hit. */
    | { kind: 'onHitStatus'; chance: number; status: StatusType; magnitude: number; duration: number; critOnly?: boolean }
    /** Triggers when an enemy dies. */
    | { kind: 'onKill'; chance: number; result: 'explosion' | 'currency' | 'heal'; magnitude: number }
    /** While moving, periodically drops a hazard zone that applies a status to enemies standing in it. */
    | { kind: 'moveTrail'; element: Element; status: StatusType; magnitude: number; radius: number; hazardLifetime: number; tickInterval: number }
    /** Multiplies all damage dealt of one element. */
    | { kind: 'elementAmp'; element: Element; mult: number }
    /** Continuous radius effect around the player: refreshes a short-lived status on any enemy inside every tick (so the status decays naturally once an enemy leaves range). */
    | { kind: 'aura'; radius: number; status: StatusType; magnitude: number; tickInterval: number; duration: number };

export interface RhuneDef {
    id: string;
    name: string;
    description: string;
    effect: RhuneEffect;
}

export interface RhuneInstance {
    instanceId: string;
    rhuneDefId: string;
    rarity: Rarity;
}

export interface TierDef {
    id: number;
    name: string;
    tagline: string;
    /** Multiplies enemy hp + damage, at floor 1 of this tier. */
    enemyStatMult: number;
    /** Floors that must be cleared in this tier to unlock the next one. */
    unlockAtFloor: number;
    /**
     * Per-floor compounding rate on top of enemyStatMult — see
     * dungeonScene.ts's statMultForFloor(). Defaults to 0.035 (every tier's
     * original curve) when omitted; a tier meant as an endless climb (easy
     * early, brutal deep) sets this much higher instead of raising
     * enemyStatMult, so floor 1 stays approachable.
     */
    floorScaleRate?: number;
    /** Weighted rarity table for loot drops in this tier. */
    lootWeights: Record<Rarity, number>;
    color: number;
    /** Whether Pillar choices drop between floors on this tier. */
    pillarsEnabled: boolean;
}

export interface EnemyDef {
    id: string;
    name: string;
    hp: number;
    damage: number;
    speed: number;
    radius: number;
    color: number;
}

/**
 * Bounty progress kinds the Quest Board tracks. Deliberately mirror actions
 * already possible without the board (killing things, clearing floors,
 * salvaging, gambling) so bounties are "keep doing what you're doing" goals.
 */
export type BountyKind = 'kills' | 'floors' | 'bossKills' | 'salvage' | 'gamble';

/**
 * Bounties are generated fresh each period and carry their own label/target/
 * reward inline rather than referencing a static def table — unlike Rhunes
 * and base types, there's no persistent roster to go stale, so there's
 * nothing to look up and nothing that can point at removed content.
 */
export interface BountyInstance {
    instanceId: string;
    kind: BountyKind;
    label: string;
    target: number;
    progress: number;
    reward: number;
    claimed: boolean;
}

export interface SaveData {
    version: 1;
    currency: number;
    /** The Chest: permanent storage. Equipped items/rhunes still live here (equipping never moves them out). */
    items: ItemInstance[];
    rhunes: RhuneInstance[];
    /** The Inventory: a small bounded bag for loot fresh out of a run — must be manually stored in the Chest to keep it safe from bag-capacity overflow. */
    bag: ItemInstance[];
    bagRhunes: RhuneInstance[];
    bagUpgradeLevel: number;
    chestUpgradeLevel: number;
    equipped: Record<GearSlot, string | null>;
    equippedRhunes: [string | null, string | null, string | null];
    /** A 4th Rhune socket — inert (and hidden in the UI) until the Rhynekra capstone "The Fourth Rhune" is allocated. */
    bonusRhuneSocket: string | null;
    selectedTier: number;
    unlockedTiers: number[];
    bestFloorByTier: Record<number, number>;
    stats: {
        lifetimeKills: number;
        lifetimeBossKills: number;
    };
    dailyBounties: BountyInstance[];
    weeklyBounties: BountyInstance[];
    dailyBountiesGeneratedAt: number;
    weeklyBountiesGeneratedAt: number;
    /**
     * The passive skill tree (see data/skillTree.ts + systems/skillTree.ts).
     * Lifetime XP — level and points available are always DERIVED from xp,
     * never stored, so they can't drift out of sync — plus the list of
     * allocated node ids. Respec clears `allocated` and refunds nothing but
     * the points (it costs Scrap, see respecCost()).
     */
    build: {
        xp: number;
        allocated: string[];
    };
}

export function emptyEquipped(): Record<GearSlot, string | null> {
    return {
        head: null,
        torso: null,
        legs: null,
        feet: null,
        hand1: null,
        hand2: null,
        jewelry1: null,
        jewelry2: null,
    };
}

export function defaultSaveData(): SaveData {
    return {
        version: 1,
        currency: 0,
        items: [],
        rhunes: [],
        bag: [],
        bagRhunes: [],
        bagUpgradeLevel: 0,
        chestUpgradeLevel: 0,
        equipped: emptyEquipped(),
        equippedRhunes: [null, null, null],
        bonusRhuneSocket: null,
        selectedTier: 1,
        unlockedTiers: [1],
        bestFloorByTier: {},
        stats: { lifetimeKills: 0, lifetimeBossKills: 0 },
        dailyBounties: [],
        weeklyBounties: [],
        dailyBountiesGeneratedAt: 0,
        weeklyBountiesGeneratedAt: 0,
        build: { xp: 0, allocated: [] },
    };
}
