import { useRef, useState } from 'react';
import type { ItemInstance } from '../../content/items/types.ts';
import { useSession } from '../../state/session.ts';
import { overlapping, sizeOf } from '../../systems/inventory.ts';
import { CELL, ItemIcon, qualityBg } from './ItemIcon.tsx';
import { tooltip, type TipContext } from './tooltip.ts';
import { uiPoint } from './uiPoint.ts';

export interface GridViewProps {
    w: number;
    h: number;
    items: ItemInstance[];
    /** cx/cy = where the held item's top-left would go; uid = item under the pointer. */
    onClick(cx: number, cy: number, uid: string | null): void;
    onRightClick?(uid: string): void;
    tipCtx?: TipContext;
    price?: (item: ItemInstance) => number | undefined;
    /** Items whose requirements aren't met get a red cell. */
    unusable?: (item: ItemInstance) => boolean;
}

/** A D2-style item grid with placement preview for the item on the cursor. */
export function GridView({ w, h, items, onClick, onRightClick, tipCtx = 'none', price, unusable }: GridViewProps) {
    const s = useSession();
    const held = s.hasHero ? s.hero.cursor : null;
    const ref = useRef<HTMLDivElement>(null);
    const [hoverPx, setHoverPx] = useState<{ x: number; y: number } | null>(null);

    const local = (e: React.PointerEvent | React.MouseEvent) => {
        const r = ref.current!.getBoundingClientRect();
        const k = (w * CELL) / r.width;
        return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
    };
    const placement = (p: { x: number; y: number }) => {
        if (!held) return null;
        const sz = sizeOf(held);
        const cx = Math.min(Math.max(0, Math.round(p.x / CELL - sz.w / 2)), w - sz.w);
        const cy = Math.min(Math.max(0, Math.round(p.y / CELL - sz.h / 2)), h - sz.h);
        const hits = overlapping({ w, h, items }, cx, cy, sz.w, sz.h, held.uid);
        return { cx, cy, w: sz.w, h: sz.h, ok: hits.length <= 1 };
    };
    const itemUnder = (p: { x: number; y: number }) => overlapping({ w, h, items }, Math.floor(p.x / CELL), Math.floor(p.y / CELL), 1, 1)[0];

    const place = hoverPx ? placement(hoverPx) : null;
    const under = hoverPx ? itemUnder(hoverPx) : undefined;

    return (
        <div
            ref={ref}
            className="frame-inset pe relative"
            style={{
                width: w * CELL,
                height: h * CELL,
                boxSizing: 'content-box',
                backgroundImage:
                    'linear-gradient(to right, #2a2018 1px, transparent 1px), linear-gradient(to bottom, #2a2018 1px, transparent 1px)',
                backgroundSize: `${CELL}px ${CELL}px`,
            }}
            onPointerMove={(e) => {
                const p = local(e);
                setHoverPx(p);
                const it = itemUnder(p);
                const ui = uiPoint(e.clientX, e.clientY);
                if (it && !held) tooltip.show({ kind: 'item', item: it, ctx: tipCtx, price: price?.(it) }, ui.x, ui.y);
                else tooltip.hide();
            }}
            onPointerLeave={() => {
                setHoverPx(null);
                tooltip.hide();
            }}
            onPointerDown={(e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                const p = local(e);
                const it = itemUnder(p);
                const pl = placement(p);
                tooltip.hide();
                onClick(pl?.cx ?? 0, pl?.cy ?? 0, it?.uid ?? null);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                const it = itemUnder(local(e));
                if (it && onRightClick) {
                    tooltip.hide();
                    onRightClick(it.uid);
                }
            }}
        >
            {items.map((it) => {
                const sz = sizeOf(it);
                const bad = unusable?.(it);
                return (
                    <div
                        key={it.uid}
                        className="pointer-events-none absolute"
                        style={{
                            left: it.x! * CELL,
                            top: it.y! * CELL,
                            width: sz.w * CELL,
                            height: sz.h * CELL,
                            background: bad ? 'rgba(200,40,40,0.28)' : qualityBg(it),
                            outline: under === it && !held ? '1px solid #8a6a42' : undefined,
                        }}
                    >
                        <ItemIcon item={it} />
                    </div>
                );
            })}
            {place && (
                <div
                    className="pointer-events-none absolute"
                    style={{
                        left: place.cx * CELL,
                        top: place.cy * CELL,
                        width: place.w * CELL,
                        height: place.h * CELL,
                        background: place.ok ? 'rgba(90,200,90,0.18)' : 'rgba(220,60,60,0.22)',
                    }}
                />
            )}
        </div>
    );
}
