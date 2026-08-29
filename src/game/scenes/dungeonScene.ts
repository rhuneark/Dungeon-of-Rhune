/**
 * The endless arena floor: dodge via joystick/mouse-drag, equipped gear
 * auto-fires at the nearest enemy, floor clears drop loot, floor counter
 * increments endlessly with mild in-run escalation. All timers are ticked
 * off app.ticker deltaMS (not setTimeout) so pausing the ticker (host
 * onPause, or the Menu button) pauses everything here too.
 *
 * Damage is computed per-element (base weapon element + any flat elemental
 * stat adds + temporary elementBoost procs), each independently scaled by
 * equipped elementAmp Rhunes, then summed and crit-multiplied. Two proc
 * systems layer on top of gear stats: Rhune effects (rhuneRuntime.ts) and
 * item proc affixes (procAffixRuntime.ts, "X% chance on hit to..."). Both
 * hook the same trigger points here — onHit/onCrit (weapon attacks only,
 * not DOT ticks or proc-dealt damage), onKill, onBeingHit (contact damage
 * taken), onMove (throttled), and onFloorClear.
 */
import { Circle, Container, Graphics, Text, type Application, type Ticker } from 'pixi.js';
import type { Stage, Scene } from '../stage.ts';
import type { Element, ItemInstance, PartKind, ProcEffect, RhuneInstance, StatBlock, StatusType } from '../data/types.ts';
import { ELEMENT_COLOR } from '../data/types.ts';
import type { EquippedWeapon } from '../systems/inventory.ts';
import { pickBoss, pickEnemy } from '../data/enemies.ts';
import { getTier } from '../data/tiers.ts';
import { rollFloorLoot } from '../systems/itemGen.ts';
import { RARITIES } from '../data/rarity.ts';
import { itemDisplayName } from '../data/nameGen.ts';
import { getRhuneDef } from '../data/rhunes.ts';
import { PILLARS, type PillarDef } from '../data/pillars.ts';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../world.ts';
import { createCamera } from '../camera.ts';
import { createInputTracker, pointerMoveDirection } from '../input.ts';
import {
    getAuraConfigs,
    getMoveTrailConfigs,
    makeElementAmplifier,
    rollOnHitStatuses,
    rollOnKillProcs,
    type AuraConfig,
    type MoveTrailConfig,
    type RhuneAmplifiers,
    type ResolvedRhune,
    type StatusApplication,
} from '../systems/rhuneRuntime.ts';
import { rollProcAffixes, scaleProcEffect, type ResolvedProcAffix } from '../systems/procAffixRuntime.ts';
import type { SkillTreeRuntime } from '../systems/skillTree.ts';

export interface DungeonRunState {
    floor: number;
    hp: number;
    maxHp: number;
    kills: number;
    killsNeeded: number;
    elapsedSeconds: number;
    totalKills: number;
    bossKills: number;
}

export interface DungeonSceneOptions {
    tier: number;
    stats: Required<StatBlock>;
    weapons: EquippedWeapon[];
    rhunes: ResolvedRhune[];
    procAffixes: ResolvedProcAffix[];
    skillTree: SkillTreeRuntime;
    onHpChange(hp: number, maxHp: number): void;
    onFloorChange(floor: number, isBoss: boolean): void;
    onKillsChange(kills: number, needed: number): void;
    onBossHpChange(hp: number, maxHp: number): void;
    onFloorCleared(floor: number, loot: { items: ItemInstance[]; rhunes: RhuneInstance[]; parts: Partial<Record<PartKind, number>> }): void;
    onDeath(floorReached: number, elapsedSeconds: number, totalKills: number, bossKills: number): void;
    onCurrencyEarned(amount: number): void;
    onPillarChosen(pillar: PillarDef): void;
}

export interface DungeonScene extends Scene {
    getState(): DungeonRunState;
}

type DamageSource = 'weapon' | 'dot' | 'proc' | 'thorns';

interface EnemyStatus {
    status: StatusType;
    magnitude: number;
    remaining: number;
    tickTimer: number;
}

interface EnemyEntity {
    defId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    damage: number;
    speed: number;
    radius: number;
    g: Graphics;
    dead: boolean;
    statuses: EnemyStatus[];
    shockMult: number;
    isBoss: boolean;
}

interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    crit: boolean;
    g: Graphics;
    life: number;
    pierceRemaining: number;
    hitIds: Set<EnemyEntity>;
    source: DamageSource;
    splashRadius: number;
    element: Element;
    /** Whether Bonky-town's Wild Conversion fired for this specific shot — carries the element-status-rider through to the eventual damageEnemy() call. */
    wildConverted?: boolean;
}

interface LootOrb {
    x: number;
    y: number;
    collecting: boolean;
    g: Graphics;
    label: Text;
}

interface PillarPick {
    x: number;
    y: number;
    radius: number;
    def: PillarDef;
    container: Container;
    glow: Graphics;
}

interface Hazard {
    x: number;
    y: number;
    radius: number;
    element: Element;
    status: StatusType;
    magnitude: number;
    statusDuration: number;
    lifetime: number;
    remaining: number;
    g: Graphics;
}

interface ElementBoost {
    element: Element;
    amount: number;
    remaining: number;
    duration: number;
}

const STATUS_TINT: Record<StatusType, number> = {
    burn: 0xf97316,
    poison: 0x4ade80,
    shock: 0xfacc15,
    slow: 0x67e8f9,
    stun: 0xe5e7eb,
};
const STATUS_TINT_PRIORITY: StatusType[] = ['stun', 'burn', 'poison', 'shock', 'slow'];
const ON_MOVE_PROC_INTERVAL = 0.5;

export function createDungeonScene(app: Application, stage: Stage, opts: DungeonSceneOptions): DungeonScene {
    const tierDef = getTier(opts.tier);
    const world = new Container();
    stage.root.addChild(world);

    // Mutable copy of the player's gear-derived stats: Pillar picks (run-scoped,
    // never touch the save) add onto this directly for the rest of the run.
    const stats: Required<StatBlock> = { ...opts.stats };
    let pillarEnemyHpMult = 1;
    let pillarEnemyDamageMult = 1;
    let pillarEnemySpeedMult = 1;
    let pillarEnemySpawnMult = 1;

    // --- passive skill tree runtime (see data/skillTree.ts + systems/skillTree.ts) ---
    const skillTree = opts.skillTree;
    const sp = (key: string) => skillTree.special(key); // shorthand — most nodes are looked up once, up front, below

    // Glow Up: amplifies the Rhune system itself rather than adding new effects.
    const rhuneAmp: RhuneAmplifiers = {
        effectMult: 1 + (sp('rhuneEffectMult')?.amount ?? 0),
        chanceMult: 1 + (sp('rhuneProcChanceMult')?.amount ?? 0),
        durationMult: 1 + (sp('rhuneDurationMult')?.amount ?? 0),
    };
    const elementalDamageMult = 1 + (sp('elementalDamageMult')?.amount ?? 0);
    const kindling = sp('kindling');
    const deepAttunement = sp('deepAttunement');
    const elementalCascade = sp('elementalCascade'); // Chain Reaction mastery
    let elementalCascadeTimer = 0;

    // Hard Pass: order & retaliation.
    const measuredRecovery = sp('measuredRecovery');
    const retribution = sp('retribution');
    const unbroken = sp('unbroken'); // No Exceptions mastery
    const zeroTolerance = skillTree.has('hardpass_zero_tolerance');
    let regenBursts: { remaining: number; perSec: number }[] = [];

    // Deja Vu: echo & repetition.
    const lingeringEcho = sp('lingeringEcho');
    const buffDurationMult = 1 + (sp('buffDurationMult')?.amount ?? 0);
    const familiarFoe = sp('familiarFoe');
    const steadyRecall = sp('steadyRecall');
    const fadedScars = sp('fadedScars');
    const encore = sp('encore');
    const twiceAsNice = skillTree.has('dejavu_twice_as_nice');
    const undyingRecollection = skillTree.has('dejavu_undying_recollection');
    const groundhogDay = skillTree.has('dejavu_groundhog_day');
    let hitEnemiesThisFloor = new Set<EnemyEntity>();
    let encoreStacks = 0;
    let encoreRemaining = 0;

    // Bonky-town: instability as power.
    const chaoticMight = sp('chaoticMight');
    const volatileStrikes = sp('volatileStrikes');
    const entropy = sp('entropy');
    const adaptiveReflexes = sp('adaptiveReflexes');
    const wildConversion = sp('wildConversion');
    const doubledFateChance = skillTree.has('bonkytown_double_or_nothing') ? 1 : 0;
    let dodgeReflexRemaining = 0;

    // Thoughts & Prayers: raw vitality.
    const resilientFlesh = sp('resilientFlesh');
    const overgrowth = sp('overgrowth');
    const healMult = 1 + (sp('healMult')?.amount ?? 0);
    const bondedSpirit = sp('bondedSpirit'); // Bring a Friend mastery
    const unkillable = skillTree.has('thoughtsprayers_unkillable');
    let bondedSpiritTimer = 0;

    // Zoomies: bending the moment.
    const briefReprieve = sp('briefReprieve');
    const tickTock = sp('tickTock');
    const borrowedMoments = sp('borrowedMoments');
    const rewind = sp('rewind'); // Do-Over mastery
    let rewindUsedThisFloor = false;
    const REWIND_SNAPSHOT_INTERVAL = 0.5;
    let rewindSnapshotTimer = 0;
    let rewindBuffer: { x: number; y: number; hp: number }[] = [];

    const elementAmp = makeElementAmplifier(opts.rhunes, rhuneAmp);
    const moveTrailConfigs = getMoveTrailConfigs(opts.rhunes, rhuneAmp);
    const auraConfigs = getAuraConfigs(opts.rhunes, rhuneAmp);
    const moveTrailTimers = moveTrailConfigs.map(() => 0);
    const auraTimers: number[] = auraConfigs.map(() => 0);
    let onMoveProcTimer = 0;
    let elementBoosts: ElementBoost[] = [];
    let revivedThisFloor = false;

    const margin = 60;
    const bounds = () => ({
        minX: margin,
        maxX: WORLD_WIDTH - margin,
        minY: margin,
        maxY: WORLD_HEIGHT - margin,
    });

    // Arena backdrop — cheap flat fill re-drawn on resize.
    const floorBg = new Graphics();
    world.addChild(floorBg);
    const drawFloor = () => {
        const b = bounds();
        floorBg.clear();
        floorBg
            .roundRect(b.minX - margin, b.minY - margin, b.maxX - b.minX + margin * 2, b.maxY - b.minY + margin * 2, 24)
            .fill({ color: 0x11162a })
            .stroke({ width: 3, color: tierDef.color, alpha: 0.4 });
    };
    drawFloor();
    const offResize = stage.onResize(drawFloor);

    // Hazard trails render under everything else (ground effects).
    const hazardLayer = new Container();
    world.addChild(hazardLayer);

    // --- player ---
    const playerLayer = new Container();
    world.addChild(playerLayer);
    const playerG = new Graphics().circle(0, 0, 18).fill(0xf5f5f4).circle(6, -6, 5).fill(0x1c1917);
    const hammerG = new Graphics().roundRect(-4, -34, 8, 26, 3).fill(0xd97706);
    playerLayer.addChild(hammerG, playerG);
    const player = {
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        invuln: 0,
        hitFlash: 0,
    };
    playerLayer.position.set(player.x, player.y);

    // --- input + camera ---
    // Hold anywhere (mouse or touch) and the player walks toward the current
    // pointer position — no drag origin, so it doesn't matter where on
    // screen you first press. Keyboard (WASD/arrows) works alongside it.
    const input = createInputTracker(app);
    const camera = createCamera(stage, WORLD_WIDTH, WORLD_HEIGHT);

    // --- layers ---
    const enemyLayer = new Container();
    const projectileLayer = new Container();
    const lootLayer = new Container();
    const pillarLayer = new Container();
    const fxLayer = new Container();
    world.addChild(enemyLayer, projectileLayer, lootLayer, pillarLayer, fxLayer);

    let enemies: EnemyEntity[] = [];
    let projectiles: Projectile[] = [];
    let lootOrbs: LootOrb[] = [];
    let hazards: Hazard[] = [];
    let pillarPicks: PillarPick[] = [];
    let lastFloorLoot: { items: ItemInstance[]; rhunes: RhuneInstance[]; parts: Partial<Record<PartKind, number>> } = { items: [], rhunes: [], parts: {} };

    let floor = 1;
    let kills = 0;
    let killsNeeded = 0;
    let phase: 'combat' | 'looting' | 'pillars' | 'transition' | 'dead' = 'combat';
    let transitionTimer = 0;
    let elapsedSeconds = 0;
    let totalKills = 0;
    let bossKills = 0;

    function isBossFloor(f: number): boolean {
        return f % 10 === 0;
    }

    // Floating damage numbers / melee swing rings / explosions run their own
    // short-lived ticker callbacks outside the main tick loop — track them
    // so destroy() can tear them down too instead of leaking listeners.
    const transientTickers = new Set<(ticker: Ticker) => void>();
    function addTransientTicker(cb: (ticker: Ticker) => void) {
        transientTickers.add(cb);
        app.ticker.add(cb);
    }
    function removeTransientTicker(cb: (ticker: Ticker) => void) {
        transientTickers.delete(cb);
        app.ticker.remove(cb);
    }

    function fadeAndDestroy(g: Graphics, life: number) {
        let remaining = life;
        const cb = (ticker: Ticker) => {
            remaining -= ticker.deltaMS / 1000;
            g.alpha = Math.max(0, remaining / life);
            if (remaining <= 0) {
                removeTransientTicker(cb);
                g.destroy();
            }
        };
        addTransientTicker(cb);
    }

    function spawnCountForFloor(f: number): number {
        return Math.min(Math.round((10 + Math.floor(f * 1.4) + (opts.tier - 1) * 3) * pillarEnemySpawnMult), 60);
    }

    function statMultForFloor(f: number): number {
        return tierDef.enemyStatMult * (1 + f * (tierDef.floorScaleRate ?? 0.035));
    }

    function spawnFloorEnemies(f: number) {
        revivedThisFloor = false;
        const mult = statMultForFloor(f);
        const b = bounds();

        if (isBossFloor(f)) {
            killsNeeded = 1;
            kills = 0;
            opts.onKillsChange(kills, killsNeeded);
            const def = pickBoss();
            const hp = def.hp * mult * pillarEnemyHpMult;
            const x = WORLD_WIDTH / 2;
            const y = b.minY + 60;
            const g = new Graphics()
                .circle(0, 0, def.radius)
                .fill(def.color)
                .circle(0, 0, def.radius)
                .stroke({ width: 5, color: 0xfbbf24, alpha: 0.9 });
            g.position.set(x, y);
            enemyLayer.addChild(g);
            enemies.push({ defId: def.id, x, y, hp, maxHp: hp, damage: def.damage, speed: def.speed * pillarEnemySpeedMult, radius: def.radius, g, dead: false, statuses: [], shockMult: 1, isBoss: true });
            opts.onBossHpChange(hp, hp);
            return;
        }

        killsNeeded = spawnCountForFloor(f);
        kills = 0;
        opts.onKillsChange(kills, killsNeeded);
        for (let i = 0; i < killsNeeded; i++) {
            const def = pickEnemy();
            const edge = Math.floor(Math.random() * 4);
            let x = 0;
            let y = 0;
            if (edge === 0) { x = b.minX; y = b.minY + Math.random() * (b.maxY - b.minY); }
            else if (edge === 1) { x = b.maxX; y = b.minY + Math.random() * (b.maxY - b.minY); }
            else if (edge === 2) { x = b.minX + Math.random() * (b.maxX - b.minX); y = b.minY; }
            else { x = b.minX + Math.random() * (b.maxX - b.minX); y = b.maxY; }

            const g = new Graphics().circle(0, 0, def.radius).fill(def.color);
            g.position.set(x, y);
            enemyLayer.addChild(g);
            const hp = def.hp * mult * pillarEnemyHpMult;
            enemies.push({ defId: def.id, x, y, hp, maxHp: hp, damage: def.damage, speed: def.speed * pillarEnemySpeedMult, radius: def.radius, g, dead: false, statuses: [], shockMult: 1, isBoss: false });
        }
    }

    function floatingText(x: number, y: number, msg: string, color: number) {
        const t = new Text({ text: msg, style: { fill: color, fontSize: 20, fontWeight: 'bold' } });
        t.anchor.set(0.5);
        t.position.set(x, y);
        fxLayer.addChild(t);
        let life = 0.6;
        const cb = (ticker: Ticker) => {
            const dt = ticker.deltaMS / 1000;
            life -= dt;
            t.y -= 40 * dt;
            t.alpha = Math.max(0, life / 0.6);
            if (life <= 0) {
                removeTransientTicker(cb);
                t.destroy();
            }
        };
        addTransientTicker(cb);
    }

    function applyStatus(enemy: EnemyEntity, application: StatusApplication) {
        const existing = enemy.statuses.find((s) => s.status === application.status);
        if (existing) {
            existing.magnitude = application.magnitude;
            existing.remaining = application.duration;
        } else {
            enemy.statuses.push({ status: application.status, magnitude: application.magnitude, remaining: application.duration, tickTimer: 0 });
        }
    }

    function healPlayer(amount: number) {
        if (amount <= 0) return;
        player.hp = Math.min(player.maxHp, player.hp + amount * healMult);
        opts.onHpChange(player.hp, player.maxHp);
    }

    const ALL_STATUSES: StatusType[] = ['slow', 'burn', 'poison', 'shock', 'stun'];
    const STATUS_BASE: Record<StatusType, { magnitude: number; duration: number }> = {
        slow: { magnitude: 0.3, duration: 2 },
        burn: { magnitude: 4, duration: 3 },
        poison: { magnitude: 3, duration: 3 },
        shock: { magnitude: 0.15, duration: 2 },
        stun: { magnitude: 1, duration: 0.4 },
    };
    function randomStatusApplication(): StatusApplication {
        const status = ALL_STATUSES[Math.floor(Math.random() * ALL_STATUSES.length)];
        const base = STATUS_BASE[status];
        return { status, magnitude: base.magnitude, duration: base.duration * buffDurationMult };
    }
    const RANDOM_ELEMENTS: Element[] = ['fire', 'ice', 'lightning', 'poison', 'arcane'];
    const ELEMENT_STATUS_RIDER: Partial<Record<Element, StatusType>> = { fire: 'burn', ice: 'slow', lightning: 'shock', poison: 'poison' };

    /** Base damage (already element-tagged) + flat elemental stat adds + temp elementBoosts, each independently amplified, crit applied once to the total, then every damage-scaling skill node in one pass. */
    function computeHitDamage(baseDamage: number, weaponElement: Element, target: EnemyEntity | null): { total: number; crit: boolean; element: Element; wildConverted: boolean } {
        const wildConvertChance = wildConversion?.amount ?? 0;
        const wildConverted = wildConvertChance > 0 && Math.random() < wildConvertChance;
        const element = wildConverted ? RANDOM_ELEMENTS[Math.floor(Math.random() * RANDOM_ELEMENTS.length)] : weaponElement;
        const crit = Math.random() < stats.critChance;
        const components: Partial<Record<Element, number>> = {};
        components[element] = (components[element] ?? 0) + baseDamage;
        if (stats.fireDamage) components.fire = (components.fire ?? 0) + stats.fireDamage;
        if (stats.iceDamage) components.ice = (components.ice ?? 0) + stats.iceDamage;
        if (stats.lightningDamage) components.lightning = (components.lightning ?? 0) + stats.lightningDamage;
        if (stats.poisonDamage) components.poison = (components.poison ?? 0) + stats.poisonDamage;
        if (stats.arcaneDamage) components.arcane = (components.arcane ?? 0) + stats.arcaneDamage;
        for (const boost of elementBoosts) components[boost.element] = (components[boost.element] ?? 0) + boost.amount;
        let total = 0;
        for (const [el, val] of Object.entries(components)) {
            const mult = elementAmp(el as Element) * (el === 'physical' ? 1 : elementalDamageMult);
            total += (val as number) * mult;
        }
        if (crit) total *= 1.8 + stats.critDamage;

        if (familiarFoe && target && hitEnemiesThisFloor.has(target)) total *= 1 + familiarFoe.amount;
        if (encoreStacks > 0 && encore) total *= 1 + encoreStacks * encore.amount;
        if (chaoticMight) total *= 1 + chaoticMight.amount + Math.random() * chaoticMight.amount2;
        if (entropy && target && target.statuses.length >= 2) total *= 1 + entropy.amount;
        if (groundhogDay) total *= 1 + Math.min(1, 0.01 * floor);

        return { total, crit, element, wildConverted };
    }

    function spawnExplosion(x: number, y: number, radius: number, element: Element) {
        const color = ELEMENT_COLOR[element];
        const ring = new Graphics().circle(x, y, radius).fill({ color, alpha: 0.35 }).circle(x, y, radius).stroke({ width: 3, color: 0xfbbf24, alpha: 0.8 });
        fxLayer.addChild(ring);
        fadeAndDestroy(ring, 0.25);
    }

    function spawnProjectileBurst(x: number, y: number, count: number, damage: number, element: Element, source: DamageSource) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
            const speed = 380;
            const g = new Graphics().circle(0, 0, 5).fill(ELEMENT_COLOR[element]);
            g.position.set(x, y);
            projectileLayer.addChild(g);
            projectiles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                damage,
                crit: false,
                g,
                life: 1.5,
                pierceRemaining: 1,
                hitIds: new Set(),
                source,
                splashRadius: 0,
                element,
            });
        }
    }

    /** Executes one already-rarity-scaled proc effect (Rhune onKill result or item proc affix). */
    function executeProcEffect(effect: ProcEffect, originX: number, originY: number, target: EnemyEntity | null) {
        switch (effect.kind) {
            case 'statusApply':
                if (target) applyStatus(target, { status: effect.status, magnitude: effect.magnitude, duration: effect.duration });
                break;
            case 'projectileBurst':
                spawnProjectileBurst(originX, originY, effect.count, effect.damage, effect.element, 'proc');
                break;
            case 'heal':
                healPlayer(effect.amount);
                break;
            case 'elementBoost':
                elementBoosts.push({ element: effect.element, amount: effect.amount, remaining: effect.duration, duration: effect.duration });
                break;
            case 'explosion':
                spawnExplosion(originX, originY, effect.radius, effect.element);
                for (const other of [...enemies]) {
                    if (Math.hypot(other.x - originX, other.y - originY) <= effect.radius) {
                        damageEnemy(other, effect.damage, false, 'proc');
                    }
                }
                break;
            case 'currency':
                opts.onCurrencyEarned(effect.amount);
                break;
        }
    }

    function runItemProcs(cause: Parameters<typeof rollProcAffixes>[1], originX: number, originY: number, target: EnemyEntity | null) {
        for (const fired of rollProcAffixes(opts.procAffixes, cause)) {
            executeProcEffect(scaleProcEffect(fired.effect, fired.rarityMult), originX, originY, target);
        }
    }

    function handleOnKillProcs(deadEnemy: EnemyEntity) {
        for (const proc of rollOnKillProcs(opts.rhunes, rhuneAmp)) {
            if (proc.result === 'explosion') {
                spawnExplosion(deadEnemy.x, deadEnemy.y, 90, 'physical');
                for (const other of [...enemies]) {
                    if (Math.hypot(other.x - deadEnemy.x, other.y - deadEnemy.y) <= 90) {
                        damageEnemy(other, proc.magnitude, false, 'proc');
                    }
                }
            } else if (proc.result === 'currency') {
                opts.onCurrencyEarned(Math.max(1, Math.round(proc.magnitude)));
            } else if (proc.result === 'heal') {
                healPlayer(proc.magnitude);
            }
        }
        runItemProcs('onKill', deadEnemy.x, deadEnemy.y, null);
        if (stats.healOnKill > 0) healPlayer(stats.healOnKill);

        // Deja Vu: Encore — kills stack a temporary damage buff.
        if (encore) {
            encoreStacks = Math.min(10, encoreStacks + 1);
            encoreRemaining = encore.amount2;
        }
        // Zoomies: Borrowed Moments — kills have a chance to knock weapon cooldowns down.
        if (borrowedMoments && Math.random() < borrowedMoments.amount) {
            for (let i = 0; i < weaponCooldowns.length; i++) weaponCooldowns[i] *= 1 - borrowedMoments.amount2;
        }
    }

    /** `element` is the actually-dealt element (may differ from the weapon's own if Wild Conversion randomized it) — only weapon hits pass it. `wildConverted` says whether THIS hit was the one Wild Conversion randomized (so the status rider only applies when it actually fired, now that it's a per-hit chance rather than always-on). */
    function damageEnemy(enemy: EnemyEntity, amount: number, crit: boolean, source: DamageSource, element?: Element, wildConverted?: boolean) {
        if (enemy.dead) return;
        const finalAmount = amount * enemy.shockMult;
        enemy.hp -= finalAmount;
        floatingText(enemy.x, enemy.y - enemy.radius - 6, crit ? `${Math.round(finalAmount)}!` : `${Math.round(finalAmount)}`, crit ? 0xfbbf24 : 0xffffff);
        if (finalAmount > 0 && stats.lifesteal > 0) healPlayer(finalAmount * stats.lifesteal);
        if (source === 'weapon') {
            hitEnemiesThisFloor.add(enemy);
            const applications = rollOnHitStatuses(opts.rhunes, crit, rhuneAmp);
            for (const application of applications) {
                applyStatus(enemy, application);
                if (deepAttunement) applyStatus(enemy, { status: 'poison', magnitude: deepAttunement.amount, duration: 3 * buffDurationMult });
            }
            if (element && wildConverted) {
                const rider = ELEMENT_STATUS_RIDER[element];
                if (rider) applyStatus(enemy, { ...STATUS_BASE[rider], status: rider, duration: STATUS_BASE[rider].duration * buffDurationMult });
            }
            if (kindling && applications.length === 0 && Math.random() < kindling.amount) applyStatus(enemy, randomStatusApplication());
            if (volatileStrikes && Math.random() < volatileStrikes.amount) applyStatus(enemy, randomStatusApplication());
            runItemProcs('onHit', enemy.x, enemy.y, enemy);
            if (crit) runItemProcs('onCrit', enemy.x, enemy.y, enemy);
            if (stats.knockback > 0 && !enemy.dead) {
                const b = bounds();
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const d = Math.hypot(dx, dy) || 1;
                enemy.x = Math.min(Math.max(enemy.x + (dx / d) * stats.knockback, b.minX), b.maxX);
                enemy.y = Math.min(Math.max(enemy.y + (dy / d) * stats.knockback, b.minY), b.maxY);
                enemy.g.position.set(enemy.x, enemy.y);
            }
        }
        if (enemy.isBoss) opts.onBossHpChange(Math.max(0, enemy.hp), enemy.maxHp);
        if (enemy.hp <= 0) {
            enemy.dead = true;
            enemy.g.destroy();
            enemies = enemies.filter((e) => e !== enemy);
            kills += 1;
            totalKills += 1;
            if (enemy.isBoss) bossKills += 1;
            opts.onKillsChange(kills, killsNeeded);
            handleOnKillProcs(enemy);
        }
    }

    function findNearestEnemy(): EnemyEntity | null {
        let nearest: EnemyEntity | null = null;
        let nearestDist = Infinity;
        for (const e of enemies) {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = e;
            }
        }
        return nearest;
    }

    /** One melee hit against one enemy — factored out so Twice as Nice (guaranteed 2x) and Lingering Echo (chance to repeat) can both just call this again. */
    function applyMeleeHit(enemy: EnemyEntity, weapon: EquippedWeapon) {
        const { total, crit, element, wildConverted } = computeHitDamage(weapon.stats.damage ?? 5, weapon.element, enemy);
        damageEnemy(enemy, total, crit, 'weapon', element, wildConverted);
        if (lingeringEcho && Math.random() < lingeringEcho.amount) {
            const echo = computeHitDamage(weapon.stats.damage ?? 5, weapon.element, enemy);
            damageEnemy(enemy, echo.total, echo.crit, 'weapon', echo.element, echo.wildConverted);
        }
    }

    function fireMelee(weapon: EquippedWeapon) {
        const radius = (weapon.stats.aoeRadius ?? 60) + 30;
        let hitAny = false;
        const strikes = twiceAsNice ? 2 : 1;
        for (let s = 0; s < strikes; s++) {
            for (const enemy of [...enemies]) {
                const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (dist <= radius) {
                    hitAny = true;
                    applyMeleeHit(enemy, weapon);
                }
            }
        }
        if (hitAny) {
            const ring = new Graphics().circle(player.x, player.y, radius).stroke({ width: 4, color: ELEMENT_COLOR[weapon.element], alpha: 0.6 });
            fxLayer.addChild(ring);
            fadeAndDestroy(ring, 0.18);
        }
    }

    function spawnPlayerProjectile(angle: number, speed: number, damage: number, crit: boolean, element: Element, pierceRemaining: number, wildConverted: boolean) {
        const g = new Graphics().circle(0, 0, 6).fill(ELEMENT_COLOR[element]);
        g.position.set(player.x, player.y);
        projectileLayer.addChild(g);
        projectiles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage,
            crit,
            g,
            life: 2,
            pierceRemaining,
            hitIds: new Set(),
            source: 'weapon',
            splashRadius: stats.splashRadius,
            element,
            wildConverted,
        });
    }

    function fireRanged(weapon: EquippedWeapon) {
        const nearest = findNearestEnemy();
        if (!nearest) return;
        const dx = nearest.x - player.x;
        const dy = nearest.y - player.y;
        const baseAngle = Math.atan2(dy, dx);
        const speed = weapon.stats.projectileSpeed ?? 500;
        const shotCount = 1 + Math.floor(stats.projectileCount);
        const pierceCount = 1 + Math.floor(stats.pierce);
        const spreadStep = 0.16;
        const startAngle = baseAngle - (spreadStep * (shotCount - 1)) / 2;
        const volleys = twiceAsNice ? 2 : 1;
        for (let v = 0; v < volleys; v++) {
            for (let i = 0; i < shotCount; i++) {
                const angle = startAngle + spreadStep * i;
                const { total, crit, element, wildConverted } = computeHitDamage(weapon.stats.damage ?? 5, weapon.element, nearest);
                spawnPlayerProjectile(angle, speed, total, crit, element, pierceCount, wildConverted);
                if (doubledFateChance > 0 && Math.random() < doubledFateChance) {
                    spawnPlayerProjectile(angle + 0.3, speed, total, crit, element, pierceCount, wildConverted);
                }
            }
        }
    }

    function spawnHazard(cfg: MoveTrailConfig) {
        const g = new Graphics().circle(0, 0, cfg.radius).fill({ color: ELEMENT_COLOR[cfg.element], alpha: 0.28 });
        g.position.set(player.x, player.y);
        hazardLayer.addChild(g);
        hazards.push({
            x: player.x,
            y: player.y,
            radius: cfg.radius,
            element: cfg.element,
            status: cfg.status,
            magnitude: cfg.magnitude,
            statusDuration: cfg.duration,
            lifetime: cfg.hazardLifetime,
            remaining: cfg.hazardLifetime,
            g,
        });
    }

    function spawnFloorLoot(f: number) {
        const roll = rollFloorLoot(opts.tier, f, stats.luck, isBossFloor(f));
        lastFloorLoot = roll;
        const b = bounds();
        const drops: { color: number; name: string }[] = [
            ...roll.items.map((it) => ({ color: RARITIES[it.rarity].color, name: itemDisplayName(it) })),
            ...roll.rhunes.map((r) => ({ color: RARITIES[r.rarity].color, name: getRhuneDef(r.rhuneDefId)?.name ?? 'Unknown Rhune' })),
        ];
        if (drops.length === 0) {
            beginPillarChoiceOrTransition();
            return;
        }
        for (const drop of drops) {
            const x = Math.min(Math.max(player.x + (Math.random() - 0.5) * 160, b.minX), b.maxX);
            const y = Math.min(Math.max(player.y + (Math.random() - 0.5) * 160, b.minY), b.maxY);
            const g = new Graphics()
                .circle(0, 0, 10)
                .fill({ color: drop.color })
                .circle(0, 0, 16)
                .stroke({ width: 2, color: drop.color, alpha: 0.5 });
            g.position.set(x, y);
            const label = new Text({ text: drop.name, style: { fill: drop.color, fontSize: 13, fontWeight: 'bold' } });
            label.anchor.set(0.5, 1);
            label.position.set(x, y - 22);
            lootLayer.addChild(g, label);
            lootOrbs.push({ x, y, collecting: false, g, label });
        }
    }

    function pickTwoDistinctPillars(): PillarDef[] {
        const pool = [...PILLARS];
        const out: PillarDef[] = [];
        for (let i = 0; i < 2 && pool.length > 0; i++) {
            out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        }
        return out;
    }

    function drawPillarIcon(def: PillarDef): Graphics {
        const g = new Graphics().roundRect(-22, -70, 44, 140, 8).fill(def.color).roundRect(-30, -78, 60, 14, 4).fill(def.color).roundRect(-30, 62, 60, 14, 4).fill(def.color);
        if (def.kind === 'specialized') g.roundRect(-22, -70, 44, 140, 8).stroke({ width: 3, color: 0xef4444, alpha: 0.9 });
        return g;
    }

    const PILLAR_PICK_RADIUS = 60;
    const PILLAR_HIT_RADIUS = 95;

    function spawnPillarChoices() {
        const b = bounds();
        const centerX = (b.minX + b.maxX) / 2;
        const centerY = (b.minY + b.maxY) / 2;
        const offsets = [-160, 160];
        pickTwoDistinctPillars().forEach((def, i) => {
            const x = centerX + offsets[i];
            const y = centerY;

            const container = new Container();
            container.position.set(x, y);
            container.eventMode = 'static';
            container.cursor = 'pointer';
            container.hitArea = new Circle(0, 0, PILLAR_HIT_RADIUS);

            const glow = new Graphics().circle(0, 0, PILLAR_HIT_RADIUS).fill({ color: def.color, alpha: 0.16 });
            glow.visible = false;
            const icon = drawPillarIcon(def);
            const tag = def.kind === 'specialized' ? ' [RISK]' : '';
            const label = new Text({
                text: `${def.name}${tag}\n${def.description}\n(tap to choose)`,
                style: { fill: def.color, fontSize: 13, fontWeight: 'bold', align: 'center', wordWrap: true, wordWrapWidth: 220 },
            });
            label.anchor.set(0.5, 1);
            label.position.set(0, -88);

            container.addChild(glow, icon, label);
            container.on('pointerover', () => icon.scale.set(1.06));
            container.on('pointerout', () => icon.scale.set(1));

            pillarLayer.addChild(container);
            const pick: PillarPick = { x, y, radius: PILLAR_PICK_RADIUS, def, container, glow };
            container.on('pointertap', () => resolvePillarChoice(pick));
            pillarPicks.push(pick);
        });
    }

    /** Player taps one of the two pillar choices — the other is discarded, never both. */
    function resolvePillarChoice(chosen: PillarPick) {
        if (phase !== 'pillars') return; // already resolved by the other pick
        applyPillar(chosen.def);
        for (const p of pillarPicks) p.container.destroy({ children: true });
        pillarPicks = [];
        beginTransition();
    }

    function applyPillar(def: PillarDef) {
        for (const [k, v] of Object.entries(def.playerMods)) {
            const stat = k as keyof StatBlock;
            stats[stat] = (stats[stat] ?? 0) + (v as number);
        }
        // Re-clamp the same way aggregateStats does, so stacked pillar picks can't blow past sane caps.
        // moveSpeed/fireRate aren't in aggregateStats's clamp list because gear/skill-tree sources are
        // naturally bounded — but Pillars stack every floor with no limit on an endless run, so on a
        // long climb they need their own ceiling. Without one, moveSpeed keeps growing until the player
        // crosses the whole arena in a single frame; the camera's smoothed follow (camera.ts) can't keep
        // up with that, so the world visibly detaches and "parallaxes" behind the player. Uncapped
        // fireRate does the same thing to the attack loop — cooldown collapses toward 0 and the weapon
        // fires every frame, flooding the screen with overlapping floating damage numbers.
        stats.critChance = Math.min(stats.critChance, 0.75);
        stats.lifesteal = Math.min(stats.lifesteal, 0.5);
        stats.dodgeChance = Math.min(stats.dodgeChance, 0.6);
        stats.damageReduction = Math.min(stats.damageReduction, 0.75);
        stats.reviveChance = Math.min(stats.reviveChance, 0.75);
        stats.blockChance = Math.min(stats.blockChance, 0.6);
        stats.thornsPercent = Math.min(stats.thornsPercent, 0.75);
        stats.moveSpeed = Math.min(stats.moveSpeed, 900);
        stats.fireRate = Math.min(stats.fireRate, 11); // attack rate is 1 + fireRate (+ small skill-tree bonuses on top)

        if (def.playerMods.maxHp) {
            player.maxHp = stats.maxHp;
            healPlayer(def.playerMods.maxHp);
        }

        if (def.enemyMods) {
            // Same reasoning, same fix: cap the compounding multiplier itself, not just its inputs.
            pillarEnemyHpMult = Math.min(pillarEnemyHpMult * (def.enemyMods.hpMult ?? 1), 10);
            pillarEnemyDamageMult = Math.min(pillarEnemyDamageMult * (def.enemyMods.damageMult ?? 1), 6);
            pillarEnemySpeedMult = Math.min(pillarEnemySpeedMult * (def.enemyMods.speedMult ?? 1), 4);
            pillarEnemySpawnMult = Math.min(pillarEnemySpawnMult * (def.enemyMods.spawnMult ?? 1), 3);
        }

        opts.onPillarChosen(def);
    }

    function beginTransition() {
        phase = 'transition';
        transitionTimer = 0.9;
    }

    function beginPillarChoiceOrTransition() {
        if (!tierDef.pillarsEnabled) {
            beginTransition();
            return;
        }
        phase = 'pillars';
        spawnPillarChoices();
    }

    function nextFloor() {
        floor += 1;
        opts.onFloorChange(floor, isBossFloor(floor));
        phase = 'combat';
        hitEnemiesThisFloor = new Set();
        rewindUsedThisFloor = false;
        rewindBuffer = [];
        if (!undyingRecollection) {
            encoreStacks = 0;
            encoreRemaining = 0;
        }
        spawnFloorEnemies(floor);
    }

    function statusTint(enemy: EnemyEntity): number {
        for (const status of STATUS_TINT_PRIORITY) {
            if (enemy.statuses.some((s) => s.status === status)) return STATUS_TINT[status];
        }
        return 0xffffff;
    }

    const tick = (ticker: Ticker) => {
        const dt = ticker.deltaMS / 1000;
        if (phase === 'dead') return;
        elapsedSeconds += dt;

        elementBoosts = elementBoosts.filter((b) => {
            b.remaining -= dt;
            if (b.remaining <= 0 && tickTock && Math.random() < tickTock.amount) b.remaining = b.duration; // Zoomies: Tick Tock
            return b.remaining > 0;
        });

        // Regen: base stat + Overgrowth (scales up the lower HP is) + Faded Scars (scales with kills landed this floor).
        let effectiveRegen = stats.regen;
        if (overgrowth) effectiveRegen += overgrowth.amount * (1 - player.hp / Math.max(1, player.maxHp));
        if (fadedScars) effectiveRegen += fadedScars.amount * kills;
        if (effectiveRegen > 0 && player.hp < player.maxHp) healPlayer(effectiveRegen * dt);

        // Hard Pass: Measured Recovery — a burst of extra regen after being hit, independent of the base regen stat.
        regenBursts = regenBursts.filter((burst) => {
            healPlayer(burst.perSec * dt);
            burst.remaining -= dt;
            return burst.remaining > 0;
        });

        // Movement: keyboard first, pointer-hold overrides when active (clamped to world bounds).
        const b = bounds();
        const playerScreen = camera.worldToScreen(player.x, player.y);
        const pointerDir = pointerMoveDirection(input.pointer, playerScreen);
        const kbDir = input.keyboardDir();
        const dirX = pointerDir ? pointerDir.x : kbDir.x;
        const dirY = pointerDir ? pointerDir.y : kbDir.y;
        const isMoving = dirX !== 0 || dirY !== 0;
        player.x = Math.min(Math.max(player.x + dirX * stats.moveSpeed * dt, b.minX), b.maxX);
        player.y = Math.min(Math.max(player.y + dirY * stats.moveSpeed * dt, b.minY), b.maxY);
        playerLayer.position.set(player.x, player.y);
        if (isMoving) hammerG.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
        camera.update(player.x, player.y, dt);

        if (player.invuln > 0) player.invuln -= dt;
        if (player.hitFlash > 0) {
            player.hitFlash -= dt;
            playerG.tint = 0xff6b6b;
        } else {
            playerG.tint = 0xffffff;
        }

        // Decay every timed skill-tree buff in one place.
        if (encoreRemaining > 0) {
            encoreRemaining -= dt;
            if (encoreRemaining <= 0) encoreStacks = 0;
        }
        if (dodgeReflexRemaining > 0) dodgeReflexRemaining -= dt;

        if (phase === 'combat') {
            // Thoughts & Prayers: Bring a Friend — a permanent passive companion ticking damage on the nearest enemy.
            if (bondedSpirit) {
                bondedSpiritTimer -= dt;
                if (bondedSpiritTimer <= 0) {
                    bondedSpiritTimer = 1;
                    const nearest = findNearestEnemy();
                    if (nearest && Math.hypot(nearest.x - player.x, nearest.y - player.y) <= 260) {
                        damageEnemy(nearest, bondedSpirit.amount, false, 'proc');
                    }
                }
            }

            // Glow Up: Chain Reaction — statused enemies have a chance to spread one status to a nearby enemy.
            if (elementalCascade) {
                elementalCascadeTimer -= dt;
                if (elementalCascadeTimer <= 0) {
                    elementalCascadeTimer = 1;
                    for (const e of enemies) {
                        if (e.statuses.length === 0 || Math.random() >= elementalCascade.amount) continue;
                        const spread = e.statuses[Math.floor(Math.random() * e.statuses.length)];
                        for (const other of enemies) {
                            if (other === e || Math.hypot(other.x - e.x, other.y - e.y) > elementalCascade.amount2) continue;
                            applyStatus(other, { status: spread.status, magnitude: spread.magnitude, duration: spread.remaining });
                            break;
                        }
                    }
                }
            }

            // Zoomies: Do-Over — periodically snapshot position/HP so a lethal hit can be undone once per floor.
            if (rewind && !rewindUsedThisFloor) {
                rewindSnapshotTimer -= dt;
                if (rewindSnapshotTimer <= 0) {
                    rewindSnapshotTimer = REWIND_SNAPSHOT_INTERVAL;
                    rewindBuffer.push({ x: player.x, y: player.y, hp: player.hp });
                    if (rewindBuffer.length > Math.ceil(rewind.amount / REWIND_SNAPSHOT_INTERVAL) + 1) rewindBuffer.shift();
                }
            }

            // Move trails: drop a hazard on an interval while moving.
            moveTrailConfigs.forEach((cfg, i) => {
                moveTrailTimers[i] -= dt;
                if (isMoving && moveTrailTimers[i] <= 0) {
                    moveTrailTimers[i] = cfg.tickInterval;
                    spawnHazard(cfg);
                }
            });

            // Item proc affixes that trigger while moving, throttled so it isn't a per-frame roll.
            onMoveProcTimer -= dt;
            if (isMoving && onMoveProcTimer <= 0) {
                onMoveProcTimer = ON_MOVE_PROC_INTERVAL;
                runItemProcs('onMove', player.x, player.y, null);
            }

            // Hazards: tick lifetime, fade, apply status to anything standing in them.
            hazards = hazards.filter((hz) => {
                hz.remaining -= dt;
                hz.g.alpha = Math.max(0, (hz.remaining / hz.lifetime) * 0.28);
                if (hz.remaining <= 0) {
                    hz.g.destroy();
                    return false;
                }
                for (const e of enemies) {
                    if (Math.hypot(e.x - hz.x, e.y - hz.y) <= hz.radius + e.radius) {
                        applyStatus(e, { status: hz.status, magnitude: hz.magnitude, duration: hz.statusDuration });
                        if (deepAttunement) applyStatus(e, { status: 'poison', magnitude: deepAttunement.amount, duration: 3 * buffDurationMult });
                    }
                }
                return true;
            });

            // Auras: on each aura's own cadence, refresh a status on everything nearby.
            auraConfigs.forEach((cfg: AuraConfig, i) => {
                auraTimers[i] -= dt;
                if (auraTimers[i] > 0) return;
                auraTimers[i] = cfg.tickInterval;
                for (const e of enemies) {
                    if (Math.hypot(e.x - player.x, e.y - player.y) <= cfg.radius) {
                        applyStatus(e, { status: cfg.status, magnitude: cfg.magnitude, duration: cfg.duration });
                        if (deepAttunement) applyStatus(e, { status: 'poison', magnitude: deepAttunement.amount, duration: 3 * buffDurationMult });
                    }
                }
            });

            for (const e of enemies) {
                // Status effects: decay, resolve speed/damage modifiers, tick DOTs.
                let speedMult = 1;
                let shockMult = 1;
                e.statuses = e.statuses.filter((s) => {
                    s.remaining -= dt;
                    if (s.status === 'slow') speedMult = Math.min(speedMult, 1 - s.magnitude);
                    if (s.status === 'stun') speedMult = 0;
                    if (s.status === 'shock') shockMult = Math.max(shockMult, 1 + s.magnitude);
                    if (s.status === 'burn' || s.status === 'poison') {
                        s.tickTimer -= dt;
                        if (s.tickTimer <= 0) {
                            s.tickTimer += 0.5;
                            const dotElement: Element = s.status === 'burn' ? 'fire' : 'poison';
                            damageEnemy(e, s.magnitude * 0.5 * elementAmp(dotElement) * elementalDamageMult, false, 'dot');
                        }
                    }
                    return s.remaining > 0;
                });
                if (e.dead) continue; // a DOT tick above may have just killed this enemy
                e.shockMult = shockMult;
                e.g.tint = statusTint(e);

                const dx = player.x - e.x;
                const dy = player.y - e.y;
                const dist = Math.hypot(dx, dy) || 1;
                e.x += (dx / dist) * e.speed * speedMult * dt;
                e.y += (dy / dist) * e.speed * speedMult * dt;
                e.g.position.set(e.x, e.y);

                if (dist <= e.radius + 18 && player.invuln <= 0) {
                    player.invuln = 0.6 + stats.invulnDuration;
                    const dodgeBoost = dodgeReflexRemaining > 0 && adaptiveReflexes ? adaptiveReflexes.amount : 0;
                    const dodged = Math.random() < stats.dodgeChance + dodgeBoost;
                    const blocked = !dodged && Math.random() < stats.blockChance;
                    if (dodged) {
                        floatingText(player.x, player.y - 30, 'Dodge!', 0x38bdf8);
                        if (adaptiveReflexes) dodgeReflexRemaining = adaptiveReflexes.amount2;
                        if (briefReprieve && Math.random() < briefReprieve.amount) {
                            for (const other of enemies) {
                                if (Math.hypot(other.x - player.x, other.y - player.y) <= briefReprieve.amount2) {
                                    applyStatus(other, { status: 'slow', magnitude: 0.4, duration: 1.2 });
                                }
                            }
                        }
                    } else if (blocked) {
                        floatingText(player.x, player.y - 30, 'Block!', 0x818cf8);
                        if (retribution && Math.random() < retribution.amount2) damageEnemy(e, retribution.amount, false, 'proc');
                    } else {
                        const afterArmor = Math.max(1, e.damage * statMultForFloor(floor) * pillarEnemyDamageMult - stats.armor);
                        const flatDr = stats.damageReduction + (resilientFlesh && player.hp / player.maxHp > 0.5 ? resilientFlesh.amount : 0);
                        let afterReduction = afterArmor * (1 - flatDr);
                        if (unbroken) afterReduction = Math.min(afterReduction, player.maxHp * unbroken.amount);
                        player.hp = Math.max(0, player.hp - afterReduction);
                        player.hitFlash = 0.2;
                        opts.onHpChange(player.hp, player.maxHp);
                        const thornsHits = zeroTolerance ? 2 : 1;
                        for (let i = 0; i < thornsHits; i++) {
                            if (stats.thorns > 0) damageEnemy(e, stats.thorns, false, 'thorns');
                            if (stats.thornsPercent > 0) damageEnemy(e, afterReduction * stats.thornsPercent, false, 'thorns');
                        }
                        if (retribution && Math.random() < retribution.amount2) damageEnemy(e, retribution.amount, false, 'proc');
                        if (measuredRecovery) regenBursts.push({ remaining: measuredRecovery.amount2, perSec: measuredRecovery.amount / measuredRecovery.amount2 });
                        runItemProcs('onBeingHit', player.x, player.y, e);
                        if (player.hp <= 0) {
                            if (rewind && !rewindUsedThisFloor && rewindBuffer.length > 0) {
                                rewindUsedThisFloor = true;
                                const snapshot = rewindBuffer[0];
                                player.x = snapshot.x;
                                player.y = snapshot.y;
                                player.hp = Math.max(1, snapshot.hp);
                                player.invuln = 1.5;
                                playerLayer.position.set(player.x, player.y);
                                opts.onHpChange(player.hp, player.maxHp);
                                floatingText(player.x, player.y - 40, 'Do-Over!', 0xfacc15);
                            } else if (!revivedThisFloor && (unkillable || Math.random() < stats.reviveChance)) {
                                revivedThisFloor = true;
                                player.hp = 1;
                                opts.onHpChange(player.hp, player.maxHp);
                                floatingText(player.x, player.y - 40, 'Revived!', 0xfbbf24);
                            } else {
                                phase = 'dead';
                                opts.onDeath(floor, elapsedSeconds, totalKills, bossKills);
                                return;
                            }
                        }
                    }
                }
            }

            opts.weapons.forEach((weapon, i) => {
                weaponCooldowns[i] -= dt;
                if (weaponCooldowns[i] > 0) return;
                const steadyRecallBonus = steadyRecall ? Math.min(steadyRecall.amount2, steadyRecall.amount * kills) : 0;
                const rate = Math.max(0.2, 1 + stats.fireRate + steadyRecallBonus);
                weaponCooldowns[i] = 1 / rate;
                if (weapon.role === 'melee') fireMelee(weapon);
                else if (weapon.role === 'ranged') fireRanged(weapon);
            });

            projectiles = projectiles.filter((p) => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                p.g.position.set(p.x, p.y);
                if (p.life <= 0) {
                    p.g.destroy();
                    return false;
                }
                for (const e of enemies) {
                    if (p.hitIds.has(e)) continue;
                    if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + 6) {
                        damageEnemy(e, p.damage, p.crit, p.source, p.element, p.wildConverted);
                        if (p.source === 'weapon' && lingeringEcho && Math.random() < lingeringEcho.amount) {
                            damageEnemy(e, p.damage, p.crit, p.source, p.element, p.wildConverted);
                        }
                        p.hitIds.add(e);
                        if (p.splashRadius > 0) {
                            for (const other of [...enemies]) {
                                if (other === e || p.hitIds.has(other)) continue;
                                if (Math.hypot(other.x - e.x, other.y - e.y) <= p.splashRadius) {
                                    damageEnemy(other, p.damage * 0.6, false, 'proc');
                                    p.hitIds.add(other);
                                }
                            }
                        }
                        p.pierceRemaining -= 1;
                        if (p.pierceRemaining <= 0) {
                            p.g.destroy();
                            return false;
                        }
                    }
                }
                return true;
            });

            if (kills >= killsNeeded && enemies.length === 0) {
                phase = 'looting';
                spawnFloorLoot(floor);
            }
        } else if (phase === 'looting') {
            const magnet = stats.magnetRadius;
            let allGone = true;
            lootOrbs = lootOrbs.filter((orb) => {
                const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
                if (dist <= magnet || orb.collecting) {
                    orb.collecting = true;
                    const dx = player.x - orb.x;
                    const dy = player.y - orb.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const speed = 500;
                    orb.x += (dx / d) * speed * dt;
                    orb.y += (dy / d) * speed * dt;
                    orb.g.position.set(orb.x, orb.y);
                    orb.label.position.set(orb.x, orb.y - 22);
                    if (d < 20) {
                        orb.g.destroy();
                        orb.label.destroy();
                        return false;
                    }
                    allGone = false;
                    return true;
                }
                allGone = false;
                return true;
            });
            if (allGone) {
                if (stats.floorHealPct > 0) healPlayer(player.maxHp * stats.floorHealPct);
                runItemProcs('onFloorClear', player.x, player.y, null);
                opts.onFloorCleared(floor, lastFloorLoot);
                beginPillarChoiceOrTransition();
            }
        } else if (phase === 'pillars') {
            // Purely visual — picking a Pillar is a deliberate tap (see spawnPillarChoices), never automatic.
            for (const pick of pillarPicks) {
                pick.glow.visible = Math.hypot(pick.x - player.x, pick.y - player.y) <= pick.radius;
            }
        } else if (phase === 'transition') {
            transitionTimer -= dt;
            if (transitionTimer <= 0) nextFloor();
        }
    };

    const weaponCooldowns = opts.weapons.map(() => 0);

    opts.onFloorChange(floor, isBossFloor(floor));
    opts.onHpChange(player.hp, player.maxHp);
    spawnFloorEnemies(floor);
    app.ticker.add(tick);

    return {
        destroy() {
            app.ticker.remove(tick);
            for (const cb of transientTickers) app.ticker.remove(cb);
            transientTickers.clear();
            input.destroy();
            camera.destroy();
            offResize();
            world.destroy({ children: true });
        },
        getState(): DungeonRunState {
            return { floor, hp: player.hp, maxHp: player.maxHp, kills, killsNeeded, elapsedSeconds, totalKills, bossKills };
        },
    };
}
