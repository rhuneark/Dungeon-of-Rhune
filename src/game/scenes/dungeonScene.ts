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
import { Container, Graphics, Text, type Application, type Ticker } from 'pixi.js';
import type { Stage, Scene } from '../stage.ts';
import type { Element, ItemInstance, ProcEffect, RhuneInstance, StatBlock, StatusType } from '../data/types.ts';
import { ELEMENT_COLOR } from '../data/types.ts';
import type { EquippedWeapon } from '../systems/inventory.ts';
import { ENEMIES, pickEnemy } from '../data/enemies.ts';
import { getTier } from '../data/tiers.ts';
import { rollFloorLoot } from '../systems/itemGen.ts';
import { RARITIES } from '../data/rarity.ts';
import { itemDisplayName } from '../data/nameGen.ts';
import { getRhuneDef } from '../data/rhunes.ts';
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
    type ResolvedRhune,
    type StatusApplication,
} from '../systems/rhuneRuntime.ts';
import { rollProcAffixes, scaleProcEffect, type ResolvedProcAffix } from '../systems/procAffixRuntime.ts';

export interface DungeonRunState {
    floor: number;
    hp: number;
    maxHp: number;
    kills: number;
    killsNeeded: number;
    elapsedSeconds: number;
    totalKills: number;
}

export interface DungeonSceneOptions {
    tier: number;
    stats: Required<StatBlock>;
    weapons: EquippedWeapon[];
    rhunes: ResolvedRhune[];
    procAffixes: ResolvedProcAffix[];
    onHpChange(hp: number, maxHp: number): void;
    onFloorChange(floor: number): void;
    onKillsChange(kills: number, needed: number): void;
    onFloorCleared(floor: number, loot: { items: ItemInstance[]; rhunes: RhuneInstance[] }): void;
    onDeath(floorReached: number, elapsedSeconds: number, totalKills: number): void;
    onCurrencyEarned(amount: number): void;
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
    speed: number;
    radius: number;
    g: Graphics;
    dead: boolean;
    statuses: EnemyStatus[];
    shockMult: number;
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
}

interface LootOrb {
    x: number;
    y: number;
    collecting: boolean;
    g: Graphics;
    label: Text;
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

    const elementAmp = makeElementAmplifier(opts.rhunes);
    const moveTrailConfigs = getMoveTrailConfigs(opts.rhunes);
    const auraConfigs = getAuraConfigs(opts.rhunes);
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
        hp: opts.stats.maxHp,
        maxHp: opts.stats.maxHp,
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
    const fxLayer = new Container();
    world.addChild(enemyLayer, projectileLayer, lootLayer, fxLayer);

    let enemies: EnemyEntity[] = [];
    let projectiles: Projectile[] = [];
    let lootOrbs: LootOrb[] = [];
    let hazards: Hazard[] = [];
    let lastFloorLoot: { items: ItemInstance[]; rhunes: RhuneInstance[] } = { items: [], rhunes: [] };

    let floor = 1;
    let kills = 0;
    let killsNeeded = 0;
    let phase: 'combat' | 'looting' | 'transition' | 'dead' = 'combat';
    let transitionTimer = 0;
    let elapsedSeconds = 0;
    let totalKills = 0;

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
        return Math.min(10 + Math.floor(f * 1.4) + (opts.tier - 1) * 3, 45);
    }

    function statMultForFloor(f: number): number {
        return tierDef.enemyStatMult * (1 + f * 0.035);
    }

    function spawnFloorEnemies(f: number) {
        killsNeeded = spawnCountForFloor(f);
        kills = 0;
        revivedThisFloor = false;
        opts.onKillsChange(kills, killsNeeded);
        const mult = statMultForFloor(f);
        const b = bounds();
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
            enemies.push({ defId: def.id, x, y, hp: def.hp * mult, speed: def.speed, radius: def.radius, g, dead: false, statuses: [], shockMult: 1 });
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
        player.hp = Math.min(player.maxHp, player.hp + amount);
        opts.onHpChange(player.hp, player.maxHp);
    }

    /** Base damage (already element-tagged) + flat elemental stat adds + temp elementBoosts, each independently amplified, crit applied once to the total. */
    function computeHitDamage(baseDamage: number, weaponElement: Element): { total: number; crit: boolean } {
        const crit = Math.random() < opts.stats.critChance;
        const components: Partial<Record<Element, number>> = {};
        components[weaponElement] = (components[weaponElement] ?? 0) + baseDamage;
        if (opts.stats.fireDamage) components.fire = (components.fire ?? 0) + opts.stats.fireDamage;
        if (opts.stats.iceDamage) components.ice = (components.ice ?? 0) + opts.stats.iceDamage;
        if (opts.stats.lightningDamage) components.lightning = (components.lightning ?? 0) + opts.stats.lightningDamage;
        if (opts.stats.poisonDamage) components.poison = (components.poison ?? 0) + opts.stats.poisonDamage;
        if (opts.stats.arcaneDamage) components.arcane = (components.arcane ?? 0) + opts.stats.arcaneDamage;
        for (const boost of elementBoosts) components[boost.element] = (components[boost.element] ?? 0) + boost.amount;
        let total = 0;
        for (const [el, val] of Object.entries(components)) total += (val as number) * elementAmp(el as Element);
        if (crit) total *= 1.8 + opts.stats.critDamage;
        return { total, crit };
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
                elementBoosts.push({ element: effect.element, amount: effect.amount, remaining: effect.duration });
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
        for (const proc of rollOnKillProcs(opts.rhunes)) {
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
        if (opts.stats.healOnKill > 0) healPlayer(opts.stats.healOnKill);
    }

    function damageEnemy(enemy: EnemyEntity, amount: number, crit: boolean, source: DamageSource) {
        if (enemy.dead) return;
        const finalAmount = amount * enemy.shockMult;
        enemy.hp -= finalAmount;
        floatingText(enemy.x, enemy.y - enemy.radius - 6, crit ? `${Math.round(finalAmount)}!` : `${Math.round(finalAmount)}`, crit ? 0xfbbf24 : 0xffffff);
        if (finalAmount > 0 && opts.stats.lifesteal > 0) healPlayer(finalAmount * opts.stats.lifesteal);
        if (source === 'weapon') {
            for (const application of rollOnHitStatuses(opts.rhunes, crit)) applyStatus(enemy, application);
            runItemProcs('onHit', enemy.x, enemy.y, enemy);
            if (crit) runItemProcs('onCrit', enemy.x, enemy.y, enemy);
            if (opts.stats.knockback > 0 && !enemy.dead) {
                const b = bounds();
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const d = Math.hypot(dx, dy) || 1;
                enemy.x = Math.min(Math.max(enemy.x + (dx / d) * opts.stats.knockback, b.minX), b.maxX);
                enemy.y = Math.min(Math.max(enemy.y + (dy / d) * opts.stats.knockback, b.minY), b.maxY);
                enemy.g.position.set(enemy.x, enemy.y);
            }
        }
        if (enemy.hp <= 0) {
            enemy.dead = true;
            enemy.g.destroy();
            enemies = enemies.filter((e) => e !== enemy);
            kills += 1;
            totalKills += 1;
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

    function fireMelee(weapon: EquippedWeapon) {
        const radius = (weapon.stats.aoeRadius ?? 60) + 30;
        let hitAny = false;
        for (const enemy of [...enemies]) {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist <= radius) {
                hitAny = true;
                const { total, crit } = computeHitDamage(weapon.stats.damage ?? 5, weapon.element);
                damageEnemy(enemy, total, crit, 'weapon');
            }
        }
        if (hitAny) {
            const ring = new Graphics().circle(player.x, player.y, radius).stroke({ width: 4, color: ELEMENT_COLOR[weapon.element], alpha: 0.6 });
            fxLayer.addChild(ring);
            fadeAndDestroy(ring, 0.18);
        }
    }

    function fireRanged(weapon: EquippedWeapon) {
        const nearest = findNearestEnemy();
        if (!nearest) return;
        const dx = nearest.x - player.x;
        const dy = nearest.y - player.y;
        const baseAngle = Math.atan2(dy, dx);
        const speed = weapon.stats.projectileSpeed ?? 500;
        const shotCount = 1 + Math.floor(opts.stats.projectileCount);
        const pierceCount = 1 + Math.floor(opts.stats.pierce);
        const spreadStep = 0.16;
        const startAngle = baseAngle - (spreadStep * (shotCount - 1)) / 2;
        for (let i = 0; i < shotCount; i++) {
            const angle = startAngle + spreadStep * i;
            const { total, crit } = computeHitDamage(weapon.stats.damage ?? 5, weapon.element);
            const g = new Graphics().circle(0, 0, 6).fill(ELEMENT_COLOR[weapon.element]);
            g.position.set(player.x, player.y);
            projectileLayer.addChild(g);
            projectiles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                damage: total,
                crit,
                g,
                life: 2,
                pierceRemaining: pierceCount,
                hitIds: new Set(),
                source: 'weapon',
                splashRadius: opts.stats.splashRadius,
            });
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
        const roll = rollFloorLoot(opts.tier, f, opts.stats.luck);
        lastFloorLoot = roll;
        const b = bounds();
        const drops: { color: number; name: string }[] = [
            ...roll.items.map((it) => ({ color: RARITIES[it.rarity].color, name: itemDisplayName(it) })),
            ...roll.rhunes.map((r) => ({ color: RARITIES[r.rarity].color, name: getRhuneDef(r.rhuneDefId)?.name ?? 'Unknown Rhune' })),
        ];
        if (drops.length === 0) {
            beginTransition();
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

    function beginTransition() {
        phase = 'transition';
        transitionTimer = 0.9;
    }

    function nextFloor() {
        floor += 1;
        opts.onFloorChange(floor);
        phase = 'combat';
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
            return b.remaining > 0;
        });

        if (opts.stats.regen > 0 && player.hp < player.maxHp) healPlayer(opts.stats.regen * dt);

        // Movement: keyboard first, pointer-hold overrides when active (clamped to world bounds).
        const b = bounds();
        const playerScreen = camera.worldToScreen(player.x, player.y);
        const pointerDir = pointerMoveDirection(input.pointer, playerScreen);
        const kbDir = input.keyboardDir();
        const dirX = pointerDir ? pointerDir.x : kbDir.x;
        const dirY = pointerDir ? pointerDir.y : kbDir.y;
        const isMoving = dirX !== 0 || dirY !== 0;
        player.x = Math.min(Math.max(player.x + dirX * opts.stats.moveSpeed * dt, b.minX), b.maxX);
        player.y = Math.min(Math.max(player.y + dirY * opts.stats.moveSpeed * dt, b.minY), b.maxY);
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

        if (phase === 'combat') {
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
                            damageEnemy(e, s.magnitude * 0.5 * elementAmp(dotElement), false, 'dot');
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
                    const def = ENEMIES.find((d) => d.id === e.defId)!;
                    player.invuln = 0.6 + opts.stats.invulnDuration;
                    if (Math.random() < opts.stats.dodgeChance) {
                        floatingText(player.x, player.y - 30, 'Dodge!', 0x38bdf8);
                    } else {
                        const afterArmor = Math.max(1, def.damage * statMultForFloor(floor) - opts.stats.armor);
                        const afterReduction = afterArmor * (1 - opts.stats.damageReduction);
                        player.hp = Math.max(0, player.hp - afterReduction);
                        player.hitFlash = 0.2;
                        opts.onHpChange(player.hp, player.maxHp);
                        if (opts.stats.thorns > 0) damageEnemy(e, opts.stats.thorns, false, 'thorns');
                        runItemProcs('onBeingHit', player.x, player.y, e);
                        if (player.hp <= 0) {
                            if (!revivedThisFloor && Math.random() < opts.stats.reviveChance) {
                                revivedThisFloor = true;
                                player.hp = 1;
                                opts.onHpChange(player.hp, player.maxHp);
                                floatingText(player.x, player.y - 40, 'Revived!', 0xfbbf24);
                            } else {
                                phase = 'dead';
                                opts.onDeath(floor, elapsedSeconds, totalKills);
                                return;
                            }
                        }
                    }
                }
            }

            opts.weapons.forEach((weapon, i) => {
                weaponCooldowns[i] -= dt;
                if (weaponCooldowns[i] > 0) return;
                const rate = Math.max(0.2, weapon.stats.fireRate ?? 1);
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
                        damageEnemy(e, p.damage, p.crit, p.source);
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
            const magnet = opts.stats.magnetRadius;
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
                if (opts.stats.floorHealPct > 0) healPlayer(player.maxHp * opts.stats.floorHealPct);
                runItemProcs('onFloorClear', player.x, player.y, null);
                opts.onFloorCleared(floor, lastFloorLoot);
                beginTransition();
            }
        } else if (phase === 'transition') {
            transitionTimer -= dt;
            if (transitionTimer <= 0) nextFloor();
        }
    };

    const weaponCooldowns = opts.weapons.map(() => 0);

    opts.onFloorChange(floor);
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
            return { floor, hp: player.hp, maxHp: player.maxHp, kills, killsNeeded, elapsedSeconds, totalKills };
        },
    };
}
