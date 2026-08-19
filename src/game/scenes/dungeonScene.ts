/**
 * The endless arena floor: dodge via joystick/mouse-drag, equipped gear
 * auto-fires at the nearest enemy, floor clears drop loot, floor counter
 * increments endlessly with mild in-run escalation. All timers are ticked
 * off app.ticker deltaMS (not setTimeout) so pausing the ticker (host
 * onPause, or the Menu button) pauses everything here too.
 */
import { Container, Graphics, Text, type Application, type Ticker } from 'pixi.js';
import type { Stage, Scene } from '../stage.ts';
import type { ItemInstance, RhuneInstance, StatBlock } from '../data/types.ts';
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
    onHpChange(hp: number, maxHp: number): void;
    onFloorChange(floor: number): void;
    onKillsChange(kills: number, needed: number): void;
    onFloorCleared(floor: number, loot: { items: ItemInstance[]; rhunes: RhuneInstance[] }): void;
    onDeath(floorReached: number, elapsedSeconds: number, totalKills: number): void;
}

export interface DungeonScene extends Scene {
    getState(): DungeonRunState;
}

interface EnemyEntity {
    defId: string;
    x: number;
    y: number;
    hp: number;
    speed: number;
    radius: number;
    g: Graphics;
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
}

interface LootOrb {
    x: number;
    y: number;
    collecting: boolean;
    g: Graphics;
    label: Text;
}

export function createDungeonScene(app: Application, stage: Stage, opts: DungeonSceneOptions): DungeonScene {
    const tierDef = getTier(opts.tier);
    const world = new Container();
    stage.root.addChild(world);

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
    let lastFloorLoot: { items: ItemInstance[]; rhunes: RhuneInstance[] } = { items: [], rhunes: [] };

    let floor = 1;
    let kills = 0;
    let killsNeeded = 0;
    let phase: 'combat' | 'looting' | 'transition' | 'dead' = 'combat';
    let transitionTimer = 0;
    let elapsedSeconds = 0;
    let totalKills = 0;

    // Floating damage numbers / melee swing rings run their own short-lived
    // ticker callbacks outside the main tick loop — track them so destroy()
    // can tear them down too instead of leaking listeners on the old app.
    const transientTickers = new Set<(ticker: Ticker) => void>();
    function addTransientTicker(cb: (ticker: Ticker) => void) {
        transientTickers.add(cb);
        app.ticker.add(cb);
    }
    function removeTransientTicker(cb: (ticker: Ticker) => void) {
        transientTickers.delete(cb);
        app.ticker.remove(cb);
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
            enemies.push({ defId: def.id, x, y, hp: def.hp * mult, speed: def.speed, radius: def.radius, g });
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

    function rollDamage(base: number): { amount: number; crit: boolean } {
        const crit = Math.random() < opts.stats.critChance;
        return { amount: crit ? base * 1.8 : base, crit };
    }

    function damageEnemy(enemy: EnemyEntity, amount: number, crit: boolean) {
        enemy.hp -= amount;
        floatingText(enemy.x, enemy.y - enemy.radius - 6, crit ? `${Math.round(amount)}!` : `${Math.round(amount)}`, crit ? 0xfbbf24 : 0xffffff);
        if (opts.stats.lifesteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + amount * opts.stats.lifesteal);
            opts.onHpChange(player.hp, player.maxHp);
        }
        if (enemy.hp <= 0) {
            enemy.g.destroy();
            enemies = enemies.filter((e) => e !== enemy);
            kills += 1;
            totalKills += 1;
            opts.onKillsChange(kills, killsNeeded);
        }
    }

    function fireMelee(weapon: EquippedWeapon) {
        const radius = (weapon.stats.aoeRadius ?? 60) + 30;
        const dmg = weapon.stats.damage ?? 5;
        let hitAny = false;
        for (const enemy of [...enemies]) {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist <= radius) {
                hitAny = true;
                const { amount, crit } = rollDamage(dmg);
                damageEnemy(enemy, amount, crit);
            }
        }
        if (hitAny) {
            const ring = new Graphics().circle(player.x, player.y, radius).stroke({ width: 4, color: 0xf5f5f4, alpha: 0.6 });
            fxLayer.addChild(ring);
            let life = 0.18;
            const cb = (ticker: Ticker) => {
                life -= ticker.deltaMS / 1000;
                ring.alpha = Math.max(0, life / 0.18);
                if (life <= 0) {
                    removeTransientTicker(cb);
                    ring.destroy();
                }
            };
            addTransientTicker(cb);
        }
    }

    function fireRanged(weapon: EquippedWeapon) {
        if (enemies.length === 0) return;
        let nearest: EnemyEntity | null = null;
        let nearestDist = Infinity;
        for (const e of enemies) {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = e;
            }
        }
        if (!nearest) return;
        const speed = weapon.stats.projectileSpeed ?? 500;
        const dx = nearest.x - player.x;
        const dy = nearest.y - player.y;
        const dist = Math.hypot(dx, dy) || 1;
        const g = new Graphics().circle(0, 0, 6).fill(0x818cf8);
        g.position.set(player.x, player.y);
        projectileLayer.addChild(g);
        const { amount, crit } = rollDamage(weapon.stats.damage ?? 5);
        projectiles.push({ x: player.x, y: player.y, vx: (dx / dist) * speed, vy: (dy / dist) * speed, damage: amount, crit, g, life: 2 });
    }

    function spawnFloorLoot(f: number) {
        const roll = rollFloorLoot(opts.tier, f);
        lastFloorLoot = roll;
        const b = bounds();
        const drops: { color: number; name: string }[] = [
            ...roll.items.map((it) => ({ color: RARITIES[it.rarity].color, name: itemDisplayName(it) })),
            ...roll.rhunes.map((r) => ({ color: RARITIES[r.rarity].color, name: getRhuneDef(r.rhuneDefId).name })),
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

    const tick = (ticker: Ticker) => {
        const dt = ticker.deltaMS / 1000;
        if (phase === 'dead') return;
        elapsedSeconds += dt;

        // Movement: keyboard first, pointer-hold overrides when active (clamped to world bounds).
        const b = bounds();
        const playerScreen = camera.worldToScreen(player.x, player.y);
        const pointerDir = pointerMoveDirection(input.pointer, playerScreen);
        const kbDir = input.keyboardDir();
        const dirX = pointerDir ? pointerDir.x : kbDir.x;
        const dirY = pointerDir ? pointerDir.y : kbDir.y;
        player.x = Math.min(Math.max(player.x + dirX * opts.stats.moveSpeed * dt, b.minX), b.maxX);
        player.y = Math.min(Math.max(player.y + dirY * opts.stats.moveSpeed * dt, b.minY), b.maxY);
        playerLayer.position.set(player.x, player.y);
        if (dirX !== 0 || dirY !== 0) hammerG.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;
        camera.update(player.x, player.y, dt);

        if (player.invuln > 0) player.invuln -= dt;
        if (player.hitFlash > 0) {
            player.hitFlash -= dt;
            playerG.tint = 0xff6b6b;
        } else {
            playerG.tint = 0xffffff;
        }

        if (phase === 'combat') {
            for (const e of enemies) {
                const dx = player.x - e.x;
                const dy = player.y - e.y;
                const dist = Math.hypot(dx, dy) || 1;
                e.x += (dx / dist) * e.speed * dt;
                e.y += (dy / dist) * e.speed * dt;
                e.g.position.set(e.x, e.y);

                if (dist <= e.radius + 18 && player.invuln <= 0) {
                    const def = ENEMIES.find((d) => d.id === e.defId)!;
                    const dmg = Math.max(1, def.damage * statMultForFloor(floor) - opts.stats.armor);
                    player.hp = Math.max(0, player.hp - dmg);
                    player.invuln = 0.6;
                    player.hitFlash = 0.2;
                    opts.onHpChange(player.hp, player.maxHp);
                    if (player.hp <= 0) {
                        phase = 'dead';
                        opts.onDeath(floor, elapsedSeconds, totalKills);
                        return;
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
                    if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + 6) {
                        damageEnemy(e, p.damage, p.crit);
                        p.g.destroy();
                        return false;
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
