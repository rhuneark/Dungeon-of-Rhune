import { useEffect, useRef } from 'react';
import { useSession } from '../../state/session.ts';
import { useStore } from '../../state/store.ts';
import { ItemIcon } from './ItemIcon.tsx';
import { ItemTooltip } from './ItemTooltip.tsx';
import { useTooltip } from './tooltip.ts';
import { uiPoint } from './uiPoint.ts';

/** The item stuck to your mouse (D2: pick up, carry, place). */
export function CursorItem() {
    const s = useSession();
    const held = s.hasHero ? s.hero.cursor : null;
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const move = (e: PointerEvent) => {
            if (!ref.current) return;
            const p = uiPoint(e.clientX, e.clientY);
            const el = ref.current;
            el.style.transform = `translate(${Math.round(p.x - el.offsetWidth / 2)}px, ${Math.round(p.y - el.offsetHeight / 2)}px)`;
        };
        window.addEventListener('pointermove', move);
        return () => window.removeEventListener('pointermove', move);
    }, []);
    return (
        <div ref={ref} className="pointer-events-none absolute left-0 top-0 z-50" style={{ opacity: held ? 0.92 : 0 }}>
            {held && <ItemIcon item={held} />}
        </div>
    );
}

/** Identify-scroll cursor hint. */
export function CursorMode() {
    const mode = useStore((s) => s.cursorMode);
    if (!mode) return null;
    return <div className="t10 frame pointer-events-none absolute left-1/2 top-[30px] -translate-x-1/2 px-[6px] py-[2px] text-gold">Click an unidentified item (Esc to cancel)</div>;
}

/** Renders the active tooltip next to the pointer, clamped on screen. */
export function TooltipHost() {
    const { tip, pos } = useTooltip();
    const uiW = useStore((s) => s.view.uiW);
    const uiH = useStore((s) => s.view.uiH);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el || !tip) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        let x = Math.round(pos.x - w / 2);
        let y = Math.round(pos.y - h - 14);
        if (y < 2) y = Math.round(pos.y + 18);
        x = Math.max(2, Math.min(uiW - w - 2, x));
        y = Math.max(2, Math.min(uiH - h - 2, y));
        el.style.transform = `translate(${x}px, ${y}px)`;
    });
    if (!tip) return null;
    return (
        <div ref={ref} className="pointer-events-none absolute left-0 top-0 z-40">
            {tip.kind === 'item' ? (
                <ItemTooltip item={tip.item} ctx={tip.ctx} price={tip.price} extra={tip.extra} />
            ) : (
                <div className="frame max-w-[260px] px-[8px] py-[5px] text-center" style={{ background: 'rgba(10,8,6,0.94)' }}>
                    {tip.title && (
                        <div className="t10" style={{ color: tip.color ?? '#d9b26a' }}>
                            {tip.title}
                        </div>
                    )}
                    {tip.lines.map((l, i) => (
                        <div key={i} className="t10 text-parch">
                            {l}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
