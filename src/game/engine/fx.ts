/**
 * Small world effects: floating text, unique-drop light beams, sparkles.
 * All in world pixels; text renders at resolution 1 so the pixel font stays
 * pixel-exact when the world is zoomed.
 */
import { Container, Graphics, Text } from 'pixi.js';
import { FONT_BODY } from '../../assets/preload.ts';

export function pixelText(text: string, color: string, size = 10): Text {
    const t = new Text({
        text,
        style: { fontFamily: FONT_BODY, fontSize: size, fill: color, stroke: { color: '#000000', width: 2 }, align: 'center' },
        resolution: 1,
    });
    t.roundPixels = true;
    return t;
}

interface Effect {
    update(dt: number): boolean; // false = done
    node: Container;
}

export class Fx {
    readonly layer = new Container();
    private effects: Effect[] = [];

    floatText(text: string, color: string, x: number, y: number): void {
        const t = pixelText(text, color, 10);
        t.anchor.set(0.5, 1);
        t.position.set(Math.round(x), Math.round(y));
        this.layer.addChild(t);
        let age = 0;
        this.effects.push({
            node: t,
            update: (dt) => {
                age += dt;
                t.y = Math.round(y - age * 22);
                t.alpha = age < 0.9 ? 1 : Math.max(0, 1 - (age - 0.9) / 0.5);
                return age < 1.4;
            },
        });
    }

    /** Column of light over a unique/rhuneword drop. */
    beam(x: number, y: number, color: number, life = 4): void {
        const g = new Graphics();
        const h = 140;
        for (let i = 0; i < 8; i++) {
            const w = 10 - i;
            g.rect(-w / 2, -h + i * 4, w, h - i * 4).fill({ color, alpha: 0.06 + i * 0.015 });
        }
        g.position.set(Math.round(x), Math.round(y));
        g.blendMode = 'add';
        this.layer.addChild(g);
        let age = 0;
        this.effects.push({
            node: g,
            update: (dt) => {
                age += dt;
                g.alpha = age < life - 1 ? 0.75 + Math.sin(age * 6) * 0.25 : Math.max(0, life - age);
                return age < life;
            },
        });
    }

    sparkle(x: number, y: number, color: number): void {
        const g = new Graphics();
        g.blendMode = 'add';
        this.layer.addChild(g);
        const parts = Array.from({ length: 10 }, () => ({ a: Math.random() * Math.PI * 2, s: 20 + Math.random() * 30 }));
        let age = 0;
        this.effects.push({
            node: g,
            update: (dt) => {
                age += dt;
                g.clear();
                for (const p of parts) {
                    const d = p.s * age;
                    g.rect(Math.round(x + Math.cos(p.a) * d), Math.round(y - 6 + Math.sin(p.a) * d * 0.6 - age * 10), 1, 1).fill({ color, alpha: Math.max(0, 1 - age * 1.4) });
                }
                return age < 0.8;
            },
        });
    }

    update(dt: number): void {
        this.effects = this.effects.filter((e) => {
            const alive = e.update(dt);
            if (!alive) e.node.destroy();
            return alive;
        });
    }

    destroy(): void {
        this.layer.destroy({ children: true });
        this.effects = [];
    }
}
