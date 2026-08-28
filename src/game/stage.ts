/**
 * Design-resolution stage: scene code works in fixed DESIGN UNITS, and this
 * module maps them to real pixels — so anything sized at 1/4 of the design
 * height takes up 1/4 of the screen height on EVERY device.
 *
 * How it works (height-fit — the landscape counterpart of the portrait
 * width-fit pattern; see #app-frame in styles/app.css, which is locked to
 * exactly 16:9, so in practice this ratio never varies):
 *   - The stage root container is scaled by screenHeight / DESIGN_HEIGHT.
 *   - Vertical space is therefore always exactly DESIGN_HEIGHT units tall.
 *   - Horizontal space is reported by designWidth() — at the frame's fixed
 *     16:9, that's always DESIGN_HEIGHT * 16/9 units, but read it live
 *     rather than hardcoding the ratio in case the frame ratio ever changes.
 */
import { Container, type Application } from 'pixi.js';

/** The scene contract: every createXxxScene(app, stage) returns one of these. */
export interface Scene {
    destroy(): void;
}

/**
 * ADAPT: the game's design height, in units. 405 pairs with the 16:9 frame
 * to put design width at 720 (405 * 16/9) — the same art scale the template
 * shipped with, just measured off height instead of width now that the
 * frame is landscape-primary.
 */
export const DESIGN_HEIGHT = 405;

/** What createStage returns — the surface scenes build against. */
export interface Stage {
    /** Add all scene content here (NOT app.stage), positioned in design units. */
    root: Container;
    /** Constant: the design-space height (= DESIGN_HEIGHT). */
    height: number;
    /** Current screen width in design units — re-read after resizes. */
    designWidth(): number;
    /** Current design-unit → pixel factor (rarely needed directly). */
    scale(): number;
    /** Subscribe to resizes (re-anchor left/right/center content). Returns unsubscribe. */
    onResize(cb: () => void): () => void;
    destroy(): void;
}

/**
 * Create the stage on a Pixi app. Add all scene content to `stage.root`
 * (NOT app.stage) and position/size it in design units.
 */
export function createStage(app: Application): Stage {
    const root = new Container();
    app.stage.addChild(root);

    const resizeCbs = new Set<() => void>();
    let _designWidth = 0;

    const layout = () => {
        const s = app.screen.height / DESIGN_HEIGHT;
        root.scale.set(s);
        _designWidth = app.screen.width / s;
        for (const cb of resizeCbs) cb();
    };

    // app.screen is in CSS pixels regardless of resolution/autoDensity, so
    // the design mapping is unaffected by devicePixelRatio.
    app.renderer.on('resize', layout);
    layout();

    return {
        root,
        height: DESIGN_HEIGHT,
        designWidth: () => _designWidth,
        scale: () => root.scale.x,
        onResize(cb) {
            resizeCbs.add(cb);
            return () => resizeCbs.delete(cb);
        },
        destroy() {
            app.renderer.off('resize', layout);
            resizeCbs.clear();
            root.destroy({ children: true });
        },
    };
}
