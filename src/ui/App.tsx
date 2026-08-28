/**
 * Screen router. One phase visible at a time; the 'playing' phase stacks the
 * React HUD + panel overlays above the Pixi canvas.
 *
 * #app-frame (styled in styles/app.css) is the device frame: a fixed 16:9
 * box, centered in the viewport, letterboxed on any other aspect ratio.
 * Everything — canvas and DOM UI — lives inside it, so they always align.
 */
import { useStore } from '../state/store.ts';
import LoadingScreen from './LoadingScreen.tsx';
import MainMenu from './MainMenu.tsx';
import Hud from './Hud.tsx';
import Panels from './Panels.tsx';
import Toasts from './Toasts.tsx';
import GameCanvas from '../game/GameCanvas.tsx';

export default function App() {
    const phase = useStore((s) => s.phase);
    return (
        <div id="app-frame" className="bg-surface text-white">
            {phase === 'loading' && <LoadingScreen />}
            {phase === 'menu' && <MainMenu />}
            {phase === 'playing' && (
                <div className="absolute inset-0">
                    <GameCanvas />
                    <Hud />
                    <Toasts />
                    <Panels />
                </div>
            )}
        </div>
    );
}
