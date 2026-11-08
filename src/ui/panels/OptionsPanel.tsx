/**
 * Display options: UI scale and world zoom. Auto picks crisp integer scales
 * (1.5x for mid-size windows); players on unusual screens can override.
 */
import { store, useStore } from '../../state/store.ts';
import { autoUiScale, autoZoom, computeViewMetrics, getViewPrefs, setViewPrefs, UI_SCALE_CHOICES, ZOOM_CHOICES, type ScalePref } from '../../view/viewport.ts';
import { Panel } from '../kit/Panel.tsx';

function Choice({ label, active, onClick, note }: { label: string; active: boolean; onClick(): void; note?: string }) {
    return (
        <button className={`pbtn ${active ? '!text-gold' : ''}`} onClick={onClick} title={note}>
            {label}
        </button>
    );
}

export default function OptionsPanel({ onClose }: { onClose(): void }) {
    const v = useStore((s) => s.view);
    const prefs = getViewPrefs();
    const apply = (p: { ui?: ScalePref; zoom?: ScalePref }) => {
        setViewPrefs(p);
        store.patch({ view: computeViewMetrics() });
    };
    const uiOpts = UI_SCALE_CHOICES.filter((s) => v.devH / s >= 330 && v.devW / s >= 560);
    const zoomOpts = ZOOM_CHOICES.filter((z) => v.devH / z >= 220);
    const fmt = (n: number) => `${n}x`;
    return (
        <Panel title="Options" onClose={onClose} style={{ left: 6, top: 6, width: 340 }}>
            <div className="s8 mb-[2px] text-dim">UI SCALE</div>
            <div className="mb-[2px] flex flex-wrap gap-[3px]">
                <Choice label={`Auto (${fmt(autoUiScale(v.devW, v.devH))})`} active={prefs.ui === 'auto'} onClick={() => apply({ ui: 'auto' })} />
                {uiOpts.map((s) => (
                    <Choice key={s} label={fmt(s)} active={prefs.ui === s} onClick={() => apply({ ui: s })} note={Number.isInteger(s) ? 'Pixel-perfect' : 'Near-crisp'} />
                ))}
            </div>
            <div className="t10 mb-[6px] text-dim">
                Whole numbers are pixel-perfect. 1.5x is slightly soft but readable on mid-size screens. Panels are designed for at least 690x430 UI px.
            </div>
            <div className="s8 mb-[2px] text-dim">WORLD ZOOM</div>
            <div className="mb-[2px] flex flex-wrap gap-[3px]">
                <Choice label={`Auto (${fmt(autoZoom(v.devH))})`} active={prefs.zoom === 'auto'} onClick={() => apply({ zoom: 'auto' })} />
                {zoomOpts.map((z) => (
                    <Choice key={z} label={fmt(z)} active={prefs.zoom === z} onClick={() => apply({ zoom: z })} />
                ))}
            </div>
            <div className="t10 mb-[6px] text-dim">Higher zoom = bigger sprites, less of the world on screen.</div>
            <div className="frame-inset t10 p-[4px] text-parch">
                <div>
                    Screen: {v.devW}x{v.devH} device px (DPR {v.dpr})
                </div>
                <div>
                    UI: {v.uiW}x{v.uiH} at {fmt(v.ui)}
                    {v.uiH < 430 && <span className="text-bad"> — smaller than the layouts expect</span>}
                </div>
                <div>
                    World view: {Math.round(v.devW / v.zoom)}x{Math.round(v.devH / v.zoom)} world px at {fmt(v.zoom)}
                </div>
            </div>
        </Panel>
    );
}
