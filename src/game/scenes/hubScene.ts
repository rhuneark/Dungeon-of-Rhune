/**
 * The hub: a static room with tappable props (chest, armor rack, tier
 * statue, portal, dungeon entrance). No walking simulation for v1 — props
 * are large tap targets, which keeps the hub fast to navigate on mobile.
 */
import { Container, Graphics, Text, type Application } from 'pixi.js';
import type { Stage, Scene } from '../stage.ts';

export interface HubSceneOptions {
    onOpenChest(): void;
    onOpenRack(): void;
    onOpenStatue(): void;
    onOpenPortal(): void;
    onEnterDungeon(): void;
}

interface Prop {
    container: Container;
    baseY: number;
}

function makeProp(label: string, color: number, w: number, h: number, onTap: () => void): Prop {
    const container = new Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const shadow = new Graphics().ellipse(0, h * 0.55, w * 0.45, w * 0.16).fill({ color: 0x000000, alpha: 0.35 });
    const body = new Graphics().roundRect(-w / 2, -h / 2, w, h, 10).fill(color).stroke({ width: 3, color: 0xffffff, alpha: 0.15 });
    const text = new Text({ text: label, style: { fill: 0xffffff, fontSize: 16, fontWeight: 'bold', align: 'center', wordWrap: true, wordWrapWidth: w + 20 } });
    text.anchor.set(0.5);
    text.position.set(0, h / 2 + 18);
    container.addChild(shadow, body, text);

    container.on('pointertap', onTap);
    container.on('pointerover', () => { body.scale.set(1.04); });
    container.on('pointerout', () => { body.scale.set(1); });

    return { container, baseY: 0 };
}

export function createHubScene(app: Application, stage: Stage, opts: HubSceneOptions): Scene {
    const world = new Container();
    stage.root.addChild(world);

    const bg = new Graphics();
    world.addChild(bg);
    const drawBg = () => {
        const h = stage.designHeight();
        bg.clear();
        bg.rect(0, 0, stage.width, h).fill(0x0b1020);
        bg.roundRect(24, 24, stage.width - 48, h - 48, 28).fill(0x141a30);
    };
    drawBg();
    const offResize = stage.onResize(drawBg);

    const title = new Text({
        text: 'DUNGEON OF RHUNE',
        style: { fill: 0xfbbf24, fontSize: 26, fontWeight: 'bold', letterSpacing: 2 },
    });
    title.anchor.set(0.5, 0);
    // Cleared below the React HUD chip (top-left currency/tier pill) that
    // overlays this scene — see Hud.tsx's pt-safe-top + p-4 top row.
    title.position.set(stage.width / 2, 130);
    world.addChild(title);

    const chest = makeProp('Chest\n(Inventory)', 0xd97706, 130, 90, opts.onOpenChest);
    const rack = makeProp('Armor Rack\n(Equipment)', 0x64748b, 130, 110, opts.onOpenRack);
    const statue = makeProp('Tier Statue\n(Difficulty)', 0x818cf8, 140, 130, opts.onOpenStatue);
    const portal = makeProp('Portal\n(Co-op — coming soon)', 0x475569, 130, 100, opts.onOpenPortal);
    const entrance = makeProp('Enter Dungeon', 0xef4444, 220, 90, opts.onEnterDungeon);

    world.addChild(chest.container, rack.container, statue.container, portal.container, entrance.container);

    const layout = () => {
        const w = stage.width;
        const h = stage.designHeight();
        statue.container.position.set(w / 2, h * 0.28);
        chest.container.position.set(w * 0.22, h * 0.46);
        rack.container.position.set(w * 0.78, h * 0.46);
        portal.container.position.set(w * 0.22, h * 0.66);
        entrance.container.position.set(w / 2, h * 0.85);
    };
    layout();
    const offResize2 = stage.onResize(layout);

    return {
        destroy() {
            offResize();
            offResize2();
            world.destroy({ children: true });
        },
    };
}
