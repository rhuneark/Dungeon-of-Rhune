/**
 * Screen router + pixel-perfect frame. #app-frame is positioned from the
 * device-aligned view metrics; the UI renders into a fixed-size "UI canvas"
 * (uiW x uiH UI px) scaled by an integer number of device pixels, so pixel
 * fonts and art stay crisp at every resolution.
 */
import { useEffect, type ReactNode } from 'react';
import { useStore } from '../state/store.ts';
import LoadingScreen from './LoadingScreen.tsx';
import MainMenu from './MainMenu.tsx';
import GameCanvas from '../game/GameCanvas.tsx';
import PlayingUi from './PlayingUi.tsx';

function UiRoot({ children }: { children: ReactNode }) {
    const v = useStore((s) => s.view);
    return (
        <div className="ui-root" style={{ width: v.uiW, height: v.uiH, transform: `scale(${v.ui / v.dpr})` }}>
            {children}
        </div>
    );
}

export default function App() {
    const phase = useStore((s) => s.phase);
    const v = useStore((s) => s.view);
    useEffect(() => {
        const block = (e: Event) => e.preventDefault();
        window.addEventListener('contextmenu', block);
        return () => window.removeEventListener('contextmenu', block);
    }, []);
    return (
        <div id="app-frame" style={{ left: v.left, top: v.top, width: v.cssW, height: v.cssH }}>
            {phase === 'playing' && <GameCanvas />}
            <UiRoot>
                {phase === 'loading' && <LoadingScreen />}
                {phase === 'menu' && <MainMenu />}
                {phase === 'playing' && <PlayingUi />}
            </UiRoot>
        </div>
    );
}
