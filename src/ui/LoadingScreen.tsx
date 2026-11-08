/**
 * Loading screen shown while warmAssets() runs. Driven by store.loadProgress.
 */
import { useStore } from '../state/store.ts';

export default function LoadingScreen() {
    const progress = useStore((s) => s.loadProgress);
    const pct = Math.round(progress * 100);
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] bg-ink">
            <div className="title36 text-gold">Dungeon of Rhune</div>
            <div className="frame-inset h-[8px] w-[220px]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
            <div className="t10 text-dim">Carving rhunes… {pct}%</div>
        </div>
    );
}
