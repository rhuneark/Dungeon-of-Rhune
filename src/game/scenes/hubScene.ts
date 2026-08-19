/**
 * The hub: a free-roam room (Diablo-camp style) — walk anywhere with
 * WASD/arrows or by holding the pointer, camera follows you. Six stations
 * are laid out per the reference room plan, spread around open floor space:
 * Tier Statue (top-left), Dungeon Entrance (top-center), Chest + Armor Rack
 * (grouped top-right), Multiplayer Portal (bottom-left), Blacksmith
 * (bottom-right). Stations are always tappable (reliable on PC/mobile
 * alike); walking close to one glows it, echoing "go to it to interact".
 */
import { Container, Graphics, Text, type Application, type Ticker } from 'pixi.js';
import type { Stage, Scene } from '../stage.ts';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../world.ts';
import { createCamera } from '../camera.ts';
import { createInputTracker, pointerMoveDirection } from '../input.ts';

export interface HubSceneOptions {
    onOpenChest(): void;
    onOpenRack(): void;
    onOpenStatue(): void;
    onOpenPortal(): void;
    onOpenBlacksmith(): void;
    onEnterDungeon(): void;
}

type StationKind = 'statue' | 'dungeon' | 'chest' | 'rack' | 'portal' | 'blacksmith';

interface StationDef {
    kind: StationKind;
    label: string;
    x: number;
    y: number;
    radius: number;
    color: number;
    onInteract: () => void;
}

const HUB_MOVE_SPEED = 320;
const INTERACT_GLOW_PAD = 55;

function drawStationIcon(kind: StationKind, color: number): Graphics {
    const g = new Graphics();
    switch (kind) {
        case 'statue': {
            // Cross/shrine silhouette.
            g.roundRect(-16, -60, 32, 100, 4).fill(color);
            g.roundRect(-38, -34, 76, 44, 4).fill(color);
            break;
        }
        case 'dungeon': {
            // Arch/dome doorway.
            const r = 68;
            g.moveTo(-r, 30)
                .arc(0, 30, r, Math.PI, 0, false)
                .lineTo(r, 30)
                .closePath()
                .fill(color);
            break;
        }
        case 'chest': {
            g.roundRect(-50, -24, 100, 48, 8).fill(color);
            break;
        }
        case 'rack': {
            g.moveTo(-42, -34).lineTo(42, -34).lineTo(0, 40).closePath().fill(color);
            break;
        }
        case 'portal': {
            g.ellipse(0, 0, 48, 62).fill(color);
            break;
        }
        case 'blacksmith': {
            g.roundRect(-52, -8, 76, 36, 4).fill(color);
            g.roundRect(14, -34, 34, 62, 4).fill(color);
            break;
        }
    }
    return g;
}

export function createHubScene(app: Application, stage: Stage, opts: HubSceneOptions): Scene {
    const world = new Container();
    stage.root.addChild(world);

    const bg = new Graphics();
    world.addChild(bg);
    bg.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0x0b1020);
    bg.roundRect(20, 20, WORLD_WIDTH - 40, WORLD_HEIGHT - 40, 32).fill(0x141a30);

    const title = new Text({
        text: 'DUNGEON OF RHUNE',
        style: { fill: 0xfbbf24, fontSize: 34, fontWeight: 'bold', letterSpacing: 3 },
    });
    title.anchor.set(0.5, 0);
    title.position.set(WORLD_WIDTH / 2, 40);
    world.addChild(title);

    const stationLayer = new Container();
    world.addChild(stationLayer);

    const stations: StationDef[] = [
        { kind: 'statue', label: 'Tier Statue', x: 340, y: 300, radius: 70, color: 0x818cf8, onInteract: opts.onOpenStatue },
        { kind: 'dungeon', label: 'Enter Dungeon', x: WORLD_WIDTH / 2, y: 220, radius: 80, color: 0xef4444, onInteract: opts.onEnterDungeon },
        { kind: 'chest', label: 'Chest', x: 1500, y: 260, radius: 65, color: 0xd97706, onInteract: opts.onOpenChest },
        { kind: 'rack', label: 'Armor Rack', x: 1720, y: 340, radius: 65, color: 0x64748b, onInteract: opts.onOpenRack },
        { kind: 'portal', label: 'Multiplayer Portal', x: 260, y: 820, radius: 75, color: 0x475569, onInteract: opts.onOpenPortal },
        { kind: 'blacksmith', label: 'Blacksmith', x: 1580, y: 830, radius: 70, color: 0x7c3aed, onInteract: opts.onOpenBlacksmith },
    ];

    const stationNodes = stations.map((station) => {
        const container = new Container();
        container.position.set(station.x, station.y);
        container.eventMode = 'static';
        container.cursor = 'pointer';

        const glow = new Graphics().circle(0, 0, station.radius + INTERACT_GLOW_PAD).fill({ color: station.color, alpha: 0.18 });
        glow.visible = false;

        const shadow = new Graphics().ellipse(0, station.radius * 0.7, station.radius * 0.85, station.radius * 0.28).fill({ color: 0x000000, alpha: 0.35 });
        const icon = drawStationIcon(station.kind, station.color);
        const label = new Text({ text: station.label, style: { fill: 0xffffff, fontSize: 20, fontWeight: 'bold' } });
        label.anchor.set(0.5, 0);
        label.position.set(0, station.radius + 14);

        container.addChild(glow, shadow, icon, label);
        container.on('pointertap', station.onInteract);
        container.on('pointerover', () => icon.scale.set(1.06));
        container.on('pointerout', () => icon.scale.set(1));

        stationLayer.addChild(container);
        return { station, container, glow };
    });

    // --- player avatar ---
    const playerLayer = new Container();
    world.addChild(playerLayer);
    const playerG = new Graphics().circle(0, 0, 18).fill(0xf5f5f4).circle(6, -6, 5).fill(0x1c1917);
    const hammerG = new Graphics().roundRect(-4, -34, 8, 26, 3).fill(0xd97706);
    playerLayer.addChild(hammerG, playerG);

    const player = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT * 0.65 };
    playerLayer.position.set(player.x, player.y);

    // --- input + camera ---
    const input = createInputTracker(app);
    const camera = createCamera(stage, WORLD_WIDTH, WORLD_HEIGHT);

    const margin = 60;
    const boundsMinX = margin;
    const boundsMaxX = WORLD_WIDTH - margin;
    const boundsMinY = margin + 60;
    const boundsMaxY = WORLD_HEIGHT - margin;

    const tick = (ticker: Ticker) => {
        const dt = ticker.deltaMS / 1000;

        const playerScreen = camera.worldToScreen(player.x, player.y);
        const pointerDir = pointerMoveDirection(input.pointer, playerScreen);
        const kbDir = input.keyboardDir();
        const dirX = pointerDir ? pointerDir.x : kbDir.x;
        const dirY = pointerDir ? pointerDir.y : kbDir.y;

        player.x = Math.min(Math.max(player.x + dirX * HUB_MOVE_SPEED * dt, boundsMinX), boundsMaxX);
        player.y = Math.min(Math.max(player.y + dirY * HUB_MOVE_SPEED * dt, boundsMinY), boundsMaxY);
        playerLayer.position.set(player.x, player.y);
        if (dirX !== 0 || dirY !== 0) hammerG.rotation = Math.atan2(dirY, dirX) + Math.PI / 2;

        for (const node of stationNodes) {
            const dist = Math.hypot(player.x - node.station.x, player.y - node.station.y);
            node.glow.visible = dist <= node.station.radius + INTERACT_GLOW_PAD;
        }

        camera.update(player.x, player.y, dt);
    };
    app.ticker.add(tick);
    camera.update(player.x, player.y, 1); // snap camera to start position, no initial pan-in

    return {
        destroy() {
            app.ticker.remove(tick);
            input.destroy();
            camera.destroy();
            world.destroy({ children: true });
        },
    };
}
