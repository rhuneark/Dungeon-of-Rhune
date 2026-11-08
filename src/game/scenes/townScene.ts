/**
 * Town scene: builds a ZoneDef into a living map — terrain, y-sorted props,
 * NPCs, the goose, the player, ground loot — and runs D2-style input:
 * click/hold to walk (A* pathing), click a person/thing to walk over and use
 * it, click a label to pick loot up. WASD also works.
 */
import { Container, Graphics, Sprite, type Application, type FederatedPointerEvent, type Texture } from 'pixi.js';
import { getNpc } from '../../content/npcs.ts';
import { createItem } from '../../systems/itemGen.ts';
import { createRng } from '../../systems/rng.ts';
import { session } from '../../state/session.ts';
import { store } from '../../state/store.ts';
import { charFrames, charMeta, charRotation, dirFromVector, propMeta, propTexture, type Dir8 } from '../engine/art.ts';
import { Fx } from '../engine/fx.ts';
import { GroundItems, type GroundEntry } from '../engine/groundItems.ts';
import { NavGrid, TILE, type Pt } from '../engine/nav.ts';
import { buildGround, TerrainMap } from '../engine/tilemap.ts';
import type { Scene, Stage } from '../stage.ts';
import { bindWorld } from '../worldBridge.ts';
import type { PropAction, ZoneDef } from '../world/zone.ts';

export type InteractTarget =
    | { kind: 'npc'; id: string; name: string }
    | { kind: 'prop'; action: PropAction; name: string }
    | { kind: 'critter'; id: 'goose' };

export interface TownCallbacks {
    onInteract(target: InteractTarget): void;
    /** Return true if the item was taken into the inventory. */
    onPickup(entry: GroundEntry): boolean;
    /** Clicked the ground while holding an item on the cursor. */
    onDropCursor(): boolean;
}

/** Something clickable in the world. */
interface Hotspot {
    target: InteractTarget;
    /** World-space hover rect. */
    rect: { x0: number; y0: number; x1: number; y1: number };
    /** Where to walk to before interacting. */
    approach: Pt;
    range: number;
    sprite: Sprite;
    highlight: Sprite;
    color: string;
}

const PLAYER_SPEED = 135;
const NPC_SPRITE_RANGE = 44;

export function createTownScene(app: Application, stage: Stage, zone: ZoneDef, cb: TownCallbacks): Scene {
    const W = zone.w * TILE;
    const H = zone.h * TILE;
    stage.setBounds(W, H);

    // ------------------------------------------------------------ terrain
    const terrain = new TerrainMap(zone.w, zone.h);
    zone.paint(terrain);
    const nav = new NavGrid(zone.w, zone.h);
    for (let y = 0; y < zone.h; y++) for (let x = 0; x < zone.w; x++) if (terrain.get(x, y) === 'water') nav.block(x, y);

    const ground = buildGround(terrain);
    const decals = new Container();
    const fx = new Fx();
    const items = new GroundItems(nav, fx);
    const world = new Container();
    world.sortableChildren = true;
    const overlay = new Container();
    stage.root.addChild(ground, decals, items.layer, world, fx.layer, items.labelLayer, overlay);

    const hotspots: Hotspot[] = [];
    const rng = createRng(zone.decorSeed);

    const makeHighlight = (tex: Texture, s: Sprite): Sprite => {
        const h = new Sprite(tex);
        h.anchor.copyFrom(s.anchor);
        h.scale.copyFrom(s.scale);
        h.blendMode = 'add';
        h.alpha = 0.28;
        h.visible = false;
        return h;
    };

    // --------------------------------------------------------------- props
    const placeProp = (p: ZoneDef['props'][number]) => {
        const tex = propTexture(p.art);
        const meta = propMeta(p.art);
        const s = new Sprite(tex);
        s.anchor.set(0.5, 1);
        if (p.flip) s.scale.x = -1;
        const px = Math.round(p.x * TILE);
        const py = Math.round(p.y * TILE);
        s.position.set(px, py);
        if (p.decal) decals.addChild(s);
        else {
            s.zIndex = py + (p.sortOffset ?? 0) * TILE;
            world.addChild(s);
        }
        if (p.block) {
            const [bw, bh] = p.block;
            const cx0 = Math.round(p.x - bw / 2);
            nav.block(cx0, Math.ceil(p.y) - bh, bw, bh);
        }
        if (p.action && meta) {
            const hl = makeHighlight(tex, s);
            hl.position.copyFrom(s.position);
            hl.zIndex = s.zIndex + 0.5;
            (p.decal ? decals : world).addChild(hl);
            const [bx0, by0, bx1, by1] = meta.bbox;
            const left = px - meta.w / 2;
            const top = py - meta.h;
            hotspots.push({
                target: { kind: 'prop', action: p.action, name: p.name ?? p.art },
                rect: { x0: left + bx0, y0: top + by0, x1: left + bx1, y1: top + by1 },
                approach: { x: px, y: py + (p.decal ? -meta.h / 2 : 14) },
                range: p.decal ? 34 : 30,
                sprite: s,
                highlight: hl,
                color: '#e8d9b0',
            });
        } else if (p.name && meta) {
            // Named but inert: still shows its name on hover.
            const [bx0, by0, bx1, by1] = meta.bbox;
            const left = px - meta.w / 2;
            const top = py - meta.h;
            hotspots.push({
                target: { kind: 'prop', action: 'statue', name: p.name },
                rect: { x0: left + bx0, y0: top + by0, x1: left + bx1, y1: top + by1 },
                approach: { x: px, y: py + 14 },
                range: -1,
                sprite: s,
                highlight: makeHighlight(tex, s),
                color: '#a89f8a',
            });
        }
    };
    zone.props.forEach(placeProp);

    // Forest border: a ring of trees you can't walk through (gap at the gate).
    for (let x = 0; x < zone.w; x++) {
        for (const y of [0, 1, zone.h - 2, zone.h - 1]) if (!(y >= zone.h - 2 && x >= 26 && x <= 33)) nav.block(x, y);
    }
    for (let y = 0; y < zone.h; y++) for (const x of [0, 1, zone.w - 2, zone.w - 1]) nav.block(x, y);
    nav.block(26, zone.h - 2, 8, 2);
    const treeAt = (x: number, y: number) => {
        const art = rng.chance(0.5) ? 'tree_pine' : 'tree_oak';
        const s = new Sprite(propTexture(art));
        s.anchor.set(0.5, 1);
        if (rng.chance(0.5)) s.scale.x = -1;
        s.position.set(Math.round(x * TILE + rng.int(-6, 6)), Math.round(y * TILE + rng.int(-4, 4)));
        s.zIndex = s.y;
        world.addChild(s);
    };
    for (let x = 0; x <= zone.w; x += 1.6) {
        treeAt(x, 1.6);
        if (x < 25 || x > 35) treeAt(x + 0.8, zone.h + 0.2);
    }
    for (let y = 3; y <= zone.h; y += 1.7) {
        treeAt(0.9, y);
        treeAt(zone.w - 0.9, y);
    }

    // Scattered decor on open grass.
    const decor = ['flowers', 'grass_tuft', 'mushrooms', 'rocks_small', 'grass_tuft', 'flowers'];
    for (let y = 2; y < zone.h - 2; y++) {
        for (let x = 2; x < zone.w - 2; x++) {
            if (terrain.get(x, y) !== 'grass' || nav.isBlocked(x, y) || !rng.chance(0.07)) continue;
            let nearRoad = false;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (terrain.get(x + dx, y + dy) !== 'grass') nearRoad = true;
            if (nearRoad) continue;
            const s = new Sprite(propTexture(rng.pick(decor)));
            s.anchor.set(0.5, 1);
            s.position.set(x * TILE + 16 + rng.int(-8, 8), y * TILE + 28 + rng.int(-6, 4));
            decals.addChild(s);
        }
    }

    // ---------------------------------------------------------------- NPCs
    interface NpcEnt {
        id: string;
        sprite: Sprite;
        frames: Texture[];
        t: number;
        x: number;
        y: number;
        sheet: string;
        facing: Dir8 | null;
    }
    const npcs: NpcEnt[] = [];
    const shadow = (x: number, y: number, rx = 11) => {
        const g = new Graphics().ellipse(0, 0, rx, rx * 0.4).fill({ color: 0x000000, alpha: 0.28 });
        g.position.set(Math.round(x), Math.round(y));
        decals.addChild(g);
        return g;
    };
    const footOffset = (sheetName: string) => {
        const m = charMeta(sheetName);
        return m ? m.cell[1] - m.footY : 0;
    };
    for (const n of zone.npcs) {
        const def = getNpc(n.id);
        if (!def) continue;
        const frames = charFrames(def.sprite, 'breathing_idle', 'south');
        const s = new Sprite(frames[0]);
        s.anchor.set(0.5, 1);
        const x = Math.round(n.x * TILE);
        const y = Math.round(n.y * TILE);
        s.position.set(x, y + footOffset(def.sprite));
        s.zIndex = y;
        world.addChild(s);
        shadow(x, y - 1);
        nav.block(Math.floor(n.x), Math.floor(n.y - 0.3));
        const hl = makeHighlight(frames[0], s);
        hl.position.copyFrom(s.position);
        hl.zIndex = y + 0.5;
        world.addChild(hl);
        npcs.push({ id: n.id, sprite: s, frames, t: Math.random() * 4, x, y, sheet: def.sprite, facing: null });
        hotspots.push({
            target: { kind: 'npc', id: n.id, name: def.name },
            rect: { x0: x - 14, y0: y - 54, x1: x + 14, y1: y + 2 },
            approach: { x, y: y + 22 },
            range: NPC_SPRITE_RANGE,
            sprite: s,
            highlight: hl,
            color: '#e8d9b0',
        });
    }

    // ---------------------------------------------------------------- goose
    const goose = (() => {
        const area = zone.critterArea;
        if (!area) return null;
        const s = new Sprite(propTexture('goose'));
        s.anchor.set(0.5, 1);
        const pos = { x: ((area.x0 + area.x1) / 2) * TILE, y: area.y0 * TILE + 32 };
        s.position.set(pos.x, pos.y);
        world.addChild(s);
        const hl = makeHighlight(propTexture('goose'), s);
        world.addChild(hl);
        const hs: Hotspot = {
            target: { kind: 'critter', id: 'goose' },
            rect: { x0: 0, y0: 0, x1: 0, y1: 0 },
            approach: pos,
            range: 34,
            sprite: s,
            highlight: hl,
            color: '#ffffff',
        };
        hotspots.push(hs);
        return { s, hl, pos, target: { ...pos }, wait: 1, flee: 0, area, hs, t: 0 };
    })();

    // --------------------------------------------------------------- player
    const hero = session.hero;
    const player = {
        x: zone.spawn.x * TILE,
        y: zone.spawn.y * TILE,
        dir: 'north' as Dir8,
        path: [] as Pt[],
        moving: false,
        animT: 0,
        pending: null as Hotspot | GroundEntry | null,
    };
    const pSprite = new Sprite(charRotation('player', 'north'));
    pSprite.anchor.set(0.5, 1);
    world.addChild(pSprite);
    const pShadow = new Graphics().ellipse(0, 0, 11, 4.5).fill({ color: 0x000000, alpha: 0.32 });
    decals.addChild(pShadow);
    const pFoot = footOffset('player');

    // Placed quest items (Torn Pages) — once taken, gone for this hero.
    for (const pi of zone.placedItems) {
        if (hero.taken.includes(pi.key)) continue;
        const it = createItem(pi.baseId, { ilvl: 1 });
        items.add({ kind: 'item', item: it }, { x: pi.x * TILE, y: pi.y * TILE }, null, 0, pi.key);
    }
    items.layoutLabels();

    // --------------------------------------------------------------- bridge
    const unbind = bindWorld({
        spawnDrops(drops, origin) {
            let o: Pt;
            if (origin === 'player') o = { x: player.x, y: player.y };
            else if (origin === 'well') {
                const well = zone.props.find((p) => p.action === 'well');
                o = well ? { x: well.x * TILE, y: well.y * TILE - 20 } : { x: player.x, y: player.y };
            } else o = { x: origin.x, y: origin.y };
            items.spawn(drops, o);
        },
        floatText(text, color, at) {
            fx.floatText(text, color, at?.x ?? player.x, (at?.y ?? player.y) - 58);
        },
    });

    // ---------------------------------------------------------------- input
    const pointer = { x: 0, y: 0, down: false, holdMove: false, lastRepath: 0, over: false };
    const keys = new Set<string>();
    let hovered: Hotspot | GroundEntry | null = null;
    const isEntry = (h: Hotspot | GroundEntry | null): h is GroundEntry => !!h && 'drop' in h;

    const worldPointer = () => stage.screenToWorld(pointer.x, pointer.y);

    const pick = (p: Pt): Hotspot | GroundEntry | null => {
        const g = items.hit(p);
        if (g) return g;
        let best: Hotspot | null = null;
        for (const h of hotspots) {
            const r = h.rect;
            if (p.x < r.x0 || p.x > r.x1 || p.y < r.y0 || p.y > r.y1) continue;
            if (!best || h.sprite.zIndex > best.sprite.zIndex) best = h;
        }
        return best;
    };

    const setHover = (h: Hotspot | GroundEntry | null) => {
        if (h === hovered) return;
        if (hovered && !isEntry(hovered)) hovered.highlight.visible = false;
        hovered = h;
        items.setHovered(isEntry(h) ? h : null);
        if (h && !isEntry(h) && h.range >= 0) h.highlight.visible = true;
        if (!h) store.patch({ hoverName: null });
        else if (isEntry(h)) store.patch({ hoverName: null });
        else if (h.target.kind === 'npc') store.patch({ hoverName: { text: h.target.name, color: h.color, sub: getNpc(h.target.id)?.title } });
        else if (h.target.kind === 'critter') store.patch({ hoverName: { text: 'The Goose', color: '#ffffff', sub: 'Unbothered. Moisturized. Watching.' } });
        else store.patch({ hoverName: { text: h.target.name, color: h.color } });
    };

    const walkTo = (to: Pt) => {
        const path = nav.findPath({ x: player.x, y: player.y }, to);
        player.path = path ?? [];
    };

    const onDown = (e: FederatedPointerEvent) => {
        if (e.button !== 0) return;
        pointer.down = true;
        pointer.x = e.global.x;
        pointer.y = e.global.y;
        const wp = worldPointer();
        const target = pick(wp);
        if (session.hero.cursor && !target) {
            if (cb.onDropCursor()) return;
        }
        if (target && (isEntry(target) || target.range >= 0)) {
            player.pending = target;
            pointer.holdMove = false;
            const dest = isEntry(target) ? { x: target.x, y: target.y } : target.approach;
            walkTo(dest);
            return;
        }
        player.pending = null;
        pointer.holdMove = true;
        pointer.lastRepath = 0;
        walkTo(wp);
    };
    const onMove = (e: FederatedPointerEvent) => {
        pointer.x = e.global.x;
        pointer.y = e.global.y;
        pointer.over = true;
    };
    const onUp = () => {
        pointer.down = false;
        pointer.holdMove = false;
    };
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerdown', onDown);
    app.stage.on('pointermove', onMove);
    app.stage.on('pointerup', onUp);
    app.stage.on('pointerupoutside', onUp);
    const onLeave = () => {
        pointer.over = false;
        setHover(null);
    };
    app.canvas.addEventListener('pointerleave', onLeave);
    const noMenu = (e: Event) => e.preventDefault();
    app.canvas.addEventListener('contextmenu', noMenu);

    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    const onKeyDown = (e: KeyboardEvent) => {
        if (isTyping(e.target)) return;
        const k = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
            keys.add(k);
            e.preventDefault();
        }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const keyDir = () => {
        let x = 0;
        let y = 0;
        if (keys.has('w') || keys.has('arrowup')) y -= 1;
        if (keys.has('s') || keys.has('arrowdown')) y += 1;
        if (keys.has('a') || keys.has('arrowleft')) x -= 1;
        if (keys.has('d') || keys.has('arrowright')) x += 1;
        const l = Math.hypot(x, y);
        return l ? { x: x / l, y: y / l } : null;
    };

    // ------------------------------------------------------------- update
    const tryInteract = () => {
        const t = player.pending;
        if (!t) return;
        if (isEntry(t)) {
            if (Math.hypot(t.x - player.x, t.y - player.y) <= 26) {
                player.pending = null;
                player.path = [];
                if (!items.entries.includes(t)) return;
                if (cb.onPickup(t)) {
                    if (t.placedKey) session.hero.taken.push(t.placedKey);
                    items.remove(t);
                }
            }
            return;
        }
        const d = Math.hypot(t.approach.x - player.x, t.approach.y - player.y);
        if (d <= t.range || (player.path.length === 0 && d <= t.range * 2.2)) {
            player.pending = null;
            player.path = [];
            if (t.target.kind === 'npc') {
                const n = npcs.find((x) => x.id === (t.target as { id: string }).id);
                if (n) n.facing = dirFromVector(player.x - n.x, player.y - n.y);
            }
            player.dir = dirFromVector((t.rect.x0 + t.rect.x1) / 2 - player.x, (t.rect.y1 - 8) - player.y);
            cb.onInteract(t.target);
            if (t.target.kind === 'critter' && goose) {
                // The goose has had enough of you. For now.
                goose.flee = 1.2;
                goose.wait = 0;
                const a = goose.area;
                const fx2 = goose.pos.x + Math.sign(goose.pos.x - player.x || 1) * 90;
                const fy2 = goose.pos.y + Math.sign(goose.pos.y - player.y || 1) * 50;
                goose.target = {
                    x: Math.min(Math.max(fx2, a.x0 * TILE), a.x1 * TILE),
                    y: Math.min(Math.max(fy2, a.y0 * TILE), a.y1 * TILE),
                };
            }
        }
    };

    const speedMul = () => 1 + (session.sheet().moveSpeed ?? 0) / 100;

    const update = (dt: number) => {
        dt = Math.min(dt, 0.05);
        // Hold-to-walk: steer toward the pointer, re-pathing a few times a second.
        if (pointer.down && pointer.holdMove) {
            pointer.lastRepath -= dt;
            if (pointer.lastRepath <= 0) {
                pointer.lastRepath = 0.15;
                walkTo(worldPointer());
            }
        }

        const kd = keyDir();
        const speed = PLAYER_SPEED * speedMul();
        let mvx = 0;
        let mvy = 0;
        if (kd) {
            player.path = [];
            player.pending = null;
            mvx = kd.x * speed * dt;
            mvy = kd.y * speed * dt;
        } else if (player.path.length) {
            const wp = player.path[0];
            const dx = wp.x - player.x;
            const dy = wp.y - player.y;
            const dist = Math.hypot(dx, dy);
            const step = speed * dt;
            if (dist <= step) {
                mvx = dx;
                mvy = dy;
                player.path.shift();
            } else {
                mvx = (dx / dist) * step;
                mvy = (dy / dist) * step;
            }
        }
        const moving = Math.abs(mvx) + Math.abs(mvy) > 0.01;
        if (moving) {
            if (nav.walkable(player.x + mvx, player.y)) player.x += mvx;
            if (nav.walkable(player.x, player.y + mvy)) player.y += mvy;
            player.dir = dirFromVector(mvx, mvy);
        }
        player.moving = moving;
        tryInteract();

        // Auto-pickup gold you walk over.
        for (const e of items.entries) {
            if (e.landed && e.drop.kind === 'gold' && Math.hypot(e.x - player.x, e.y - player.y) < 16) {
                if (cb.onPickup(e)) items.remove(e);
                break;
            }
        }

        // Player animation
        player.animT += dt;
        const anim = moving ? 'walking' : 'breathing_idle';
        const frames = charFrames('player', anim, player.dir);
        const fps = moving ? 11 * speedMul() : 4;
        pSprite.texture = frames[Math.floor(player.animT * fps) % frames.length];
        const px = Math.round(player.x);
        const py = Math.round(player.y);
        pSprite.position.set(px, py + pFoot);
        pSprite.zIndex = py;
        pShadow.position.set(px, py - 1);

        // NPCs breathe; they face you while you talk to them.
        const talkingTo = store.get().dialog?.npcId ?? null;
        for (const n of npcs) {
            n.t += dt;
            if (n.facing && talkingTo === n.id) n.sprite.texture = charRotation(n.sheet, n.facing);
            else {
                n.facing = null;
                n.sprite.texture = n.frames[Math.floor(n.t * 3.5) % n.frames.length];
            }
        }

        // The goose wanders. The goose flees. The goose returns.
        if (goose) {
            goose.t += dt;
            goose.wait -= dt;
            if (goose.flee > 0) goose.flee -= dt;
            const gx = goose.target.x - goose.pos.x;
            const gy = goose.target.y - goose.pos.y;
            const gd = Math.hypot(gx, gy);
            const gs = (goose.flee > 0 ? 110 : 26) * dt;
            if (gd > 2 && goose.wait <= 0) {
                const nx = goose.pos.x + (gx / gd) * Math.min(gs, gd);
                const ny = goose.pos.y + (gy / gd) * Math.min(gs, gd);
                if (nav.walkable(nx, ny, 5)) {
                    goose.pos.x = nx;
                    goose.pos.y = ny;
                } else goose.wait = 0.5;
                goose.s.scale.x = gx < 0 ? 1 : -1;
            } else if (goose.wait <= 0) {
                goose.wait = 1.5 + Math.random() * 3;
                const a = goose.area;
                goose.target = { x: (a.x0 + Math.random() * (a.x1 - a.x0)) * TILE, y: (a.y0 + Math.random() * (a.y1 - a.y0)) * TILE };
            }
            const bob = gd > 2 && goose.wait <= 0 ? Math.round(Math.abs(Math.sin(goose.t * 12))) : 0;
            goose.s.position.set(Math.round(goose.pos.x), Math.round(goose.pos.y) - bob);
            goose.s.zIndex = goose.pos.y;
            goose.hl.position.copyFrom(goose.s.position);
            goose.hl.scale.copyFrom(goose.s.scale);
            goose.hl.zIndex = goose.s.zIndex + 0.5;
            goose.hs.rect = { x0: goose.pos.x - 12, y0: goose.pos.y - 26, x1: goose.pos.x + 12, y1: goose.pos.y + 2 };
            goose.hs.approach = { x: goose.pos.x, y: goose.pos.y + 10 };
        }

        items.update(dt);
        fx.update(dt);
        // D2-style: with a side panel open, keep the hero centred in the visible half.
        const ui = store.get();
        const v = ui.view;
        const panelHalf = (172 * v.ui) / v.zoom;
        const wantShift = (ui.left && !ui.overlay ? -panelHalf : 0) + (ui.right && !ui.overlay ? panelHalf : 0);
        camShift += (wantShift - camShift) * Math.min(1, dt * 10);
        stage.lookAt(player.x + camShift, player.y - 16);

        if (pointer.over) setHover(pick(worldPointer()));
    };

    let camShift = 0;
    const tick = (t: { deltaMS: number }) => update(t.deltaMS / 1000);
    app.ticker.add(tick);
    stage.lookAt(player.x, player.y - 16);

    return {
        destroy() {
            app.ticker.remove(tick);
            unbind();
            app.stage.off('pointerdown', onDown);
            app.stage.off('pointermove', onMove);
            app.stage.off('pointerup', onUp);
            app.stage.off('pointerupoutside', onUp);
            app.canvas.removeEventListener('pointerleave', onLeave);
            app.canvas.removeEventListener('contextmenu', noMenu);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            store.patch({ hoverName: null });
            fx.destroy();
            items.destroy();
            world.destroy({ children: true });
            overlay.destroy({ children: true });
            decals.destroy({ children: true });
            ground.destroy({ children: true });
        },
    };
}
