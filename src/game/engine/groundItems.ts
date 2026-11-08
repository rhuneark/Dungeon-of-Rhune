/**
 * Loot on the ground — the D2 moment. Items arc out of their source, land
 * with a bounce, and sit under a coloured label. Uniques get a light beam,
 * rhunes a sparkle. Labels are clickable and de-overlapped.
 */
import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { getBase } from '../../content/items/bases.ts';
import type { ItemInstance } from '../../content/items/types.ts';
import { itemArt, itemColor, itemName } from '../../systems/itemText.ts';
import type { Drop } from '../../systems/loot.ts';
import { iconTexture } from './art.ts';
import { Fx, pixelText } from './fx.ts';
import type { NavGrid, Pt } from './nav.ts';

export interface GroundEntry {
    id: number;
    drop: Drop;
    x: number;
    y: number;
    node: Container;
    icon: Sprite;
    label: Container;
    labelRect: { x: number; y: number; w: number; h: number };
    landed: boolean;
    /** Placed quest items carry their key. */
    placedKey?: string;
    anim?: { from: Pt; t: number; dur: number; h: number };
}

const LABEL_PAD_X = 3;
const LABEL_H = 11;

export class GroundItems {
    readonly layer = new Container();
    readonly labelLayer = new Container();
    entries: GroundEntry[] = [];
    private seq = 0;
    private hovered: GroundEntry | null = null;

    constructor(
        private nav: NavGrid,
        private fx: Fx
    ) {}

    private labelFor(drop: Drop): { text: string; color: string } {
        if (drop.kind === 'gold') return { text: `${drop.amount} Gold`, color: '#f3d34a' };
        return { text: itemName(drop.item), color: itemColor(drop.item) };
    }

    /** Find a free landing spot near a point. */
    private landingSpot(origin: Pt, i: number): Pt {
        for (let tries = 0; tries < 24; tries++) {
            const a = Math.random() * Math.PI * 2;
            const r = 18 + Math.random() * (26 + i * 4);
            const p = { x: origin.x + Math.cos(a) * r, y: origin.y + Math.sin(a) * r * 0.7 + 8 };
            if (!this.nav.walkable(p.x, p.y, 4)) continue;
            if (this.entries.some((e) => Math.hypot(e.x - p.x, e.y - p.y) < 14)) continue;
            return p;
        }
        return { x: origin.x + (Math.random() - 0.5) * 30, y: origin.y + 12 };
    }

    spawn(drops: Drop[], origin: Pt): void {
        drops.forEach((drop, i) => {
            const at = this.landingSpot(origin, i);
            this.add(drop, at, origin, i * 0.08);
        });
        this.layoutLabels();
    }

    add(drop: Drop, at: Pt, from: Pt | null = null, delay = 0, placedKey?: string): GroundEntry {
        const node = new Container();
        const art = drop.kind === 'gold' ? 'gold' : itemArt(drop.item);
        const icon = new Sprite(iconTexture(art));
        icon.anchor.set(0.5, 1);
        // Inventory art is 32px per cell; on the ground it's drawn at half size (still integer-crisp).
        icon.scale.set(0.5);
        node.addChild(icon);
        node.position.set(Math.round(at.x), Math.round(at.y));
        this.layer.addChild(node);

        const { text, color } = this.labelFor(drop);
        const label = new Container();
        const t: Text = pixelText(text, color, 10);
        t.style.stroke = { color: '#000000', width: 0 };
        const w = Math.ceil(t.width) + LABEL_PAD_X * 2;
        const bg = new Graphics().rect(0, 0, w, LABEL_H).fill({ color: 0x000000, alpha: 0.72 });
        t.position.set(LABEL_PAD_X, -1);
        label.addChild(bg, t);
        label.visible = false;
        this.labelLayer.addChild(label);

        const e: GroundEntry = {
            id: ++this.seq,
            drop,
            x: at.x,
            y: at.y,
            node,
            icon,
            label,
            labelRect: { x: 0, y: 0, w, h: LABEL_H },
            landed: !from,
            placedKey,
            anim: from ? { from, t: -delay, dur: 0.5, h: 26 + Math.random() * 10 } : undefined,
        };
        if (!from) label.visible = true;
        this.entries.push(e);
        return e;
    }

    remove(e: GroundEntry): void {
        this.entries = this.entries.filter((x) => x !== e);
        e.node.destroy({ children: true });
        e.label.destroy({ children: true });
        if (this.hovered === e) this.hovered = null;
        this.layoutLabels();
    }

    /** Stack labels upward so none overlap (sorted bottom-up). */
    layoutLabels(): void {
        const placed: { x: number; y: number; w: number; h: number }[] = [];
        const sorted = [...this.entries].sort((a, b) => b.y - a.y);
        for (const e of sorted) {
            const w = e.labelRect.w;
            let x = Math.round(e.x - w / 2);
            let y = Math.round(e.y - 20 - LABEL_H);
            for (let guard = 0; guard < 30; guard++) {
                const hit = placed.find((p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + LABEL_H > p.y);
                if (!hit) break;
                y = hit.y - LABEL_H - 1;
            }
            e.labelRect = { x, y, w, h: LABEL_H };
            e.label.position.set(x, y);
            placed.push(e.labelRect);
        }
    }

    /** Entry whose label (or icon) is under a world point. */
    hit(p: Pt): GroundEntry | null {
        for (const e of [...this.entries].reverse()) {
            if (!e.landed) continue;
            const r = e.labelRect;
            if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return e;
            if (Math.abs(p.x - e.x) < 9 && p.y <= e.y + 2 && p.y >= e.y - 18) return e;
        }
        return null;
    }

    setHovered(e: GroundEntry | null): void {
        if (this.hovered === e) return;
        if (this.hovered) (this.hovered.label.children[0] as Graphics).tint = 0xffffff;
        this.hovered = e;
        if (e) (e.label.children[0] as Graphics).tint = 0x5a4a7a;
    }

    update(dt: number): void {
        for (const e of this.entries) {
            if (!e.anim) continue;
            const a = e.anim;
            a.t += dt;
            if (a.t < 0) {
                e.node.visible = false;
                continue;
            }
            e.node.visible = true;
            const k = Math.min(1, a.t / a.dur);
            const x = a.from.x + (e.x - a.from.x) * k;
            const y = a.from.y + (e.y - a.from.y) * k - Math.sin(k * Math.PI) * a.h;
            e.node.position.set(Math.round(x), Math.round(y));
            e.icon.rotation = k < 1 ? (1 - k) * 6 * (e.id % 2 ? 1 : -1) : 0;
            if (k >= 1) {
                e.anim = undefined;
                e.landed = true;
                e.label.visible = true;
                e.icon.rotation = 0;
                this.onLand(e);
            }
        }
    }

    private onLand(e: GroundEntry): void {
        if (e.drop.kind !== 'item') return;
        const item: ItemInstance = e.drop.item;
        const base = getBase(item.baseId);
        if (item.quality === 'unique' || item.quality === 'rhuneword') this.fx.beam(e.x, e.y, 0xc9a46b, 6);
        else if (base.category === 'rhune') {
            this.fx.beam(e.x, e.y, 0xff9b3d, 3);
            this.fx.sparkle(e.x, e.y, 0xffb060);
        } else if (item.quality === 'rare') this.fx.sparkle(e.x, e.y, 0xf3d34a);
    }

    destroy(): void {
        this.layer.destroy({ children: true });
        this.labelLayer.destroy({ children: true });
        this.entries = [];
    }
}
