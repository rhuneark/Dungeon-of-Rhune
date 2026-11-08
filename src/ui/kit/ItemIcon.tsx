import { iconUrl } from '../../assets/manifest.ts';
import { getBase } from '../../content/items/bases.ts';
import type { ItemInstance } from '../../content/items/types.ts';
import { itemArt } from '../../systems/itemText.ts';

export const CELL = 32;

/** The item's art at 32px per cell, with socket rings drawn on top. */
export function ItemIcon({ item, showSockets = true }: { item: ItemInstance; showSockets?: boolean }) {
    const base = getBase(item.baseId);
    const w = base.w * CELL;
    const h = base.h * CELL;
    const sockets = showSockets ? socketLayout(item.sockets, base.w, base.h) : [];
    return (
        <div className="relative" style={{ width: w, height: h }}>
            <img src={iconUrl(itemArt(item))} width={w} height={h} draggable={false} className="pointer-events-none block" alt="" />
            {sockets.map((p, i) => {
                const filled = item.socketed[i];
                return (
                    <div
                        key={i}
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            left: p.x - 8,
                            top: p.y - 8,
                            width: 16,
                            height: 16,
                            background: filled ? '#0008' : '#0007',
                            boxShadow: 'inset 0 0 0 1px #8a6a42',
                        }}
                    >
                        {filled && <img src={iconUrl(itemArt(filled))} width={16} height={16} draggable={false} alt="" />}
                    </div>
                );
            })}
            {item.qty && item.qty > 1 && <span className="t10 absolute bottom-0 right-[2px] text-parch">{item.qty}</span>}
        </div>
    );
}

function socketLayout(n: number, cw: number, ch: number): { x: number; y: number }[] {
    if (n <= 0) return [];
    const w = cw * CELL;
    const h = ch * CELL;
    const pts: { x: number; y: number }[] = [];
    if (cw === 1 || n <= 3) {
        for (let i = 0; i < n; i++) pts.push({ x: w / 2, y: (h * (i + 1)) / (n + 1) });
    } else {
        const rows = Math.ceil(n / 2);
        for (let i = 0; i < n; i++) {
            const r = Math.floor(i / 2);
            const lone = n % 2 === 1 && i === n - 1;
            pts.push({ x: lone ? w / 2 : i % 2 === 0 ? w / 4 + 2 : (3 * w) / 4 - 2, y: (h * (r + 1)) / (rows + 1) });
        }
    }
    return pts;
}

/** Faint quality tint behind items in grids. */
export function qualityBg(item: ItemInstance): string {
    const base = getBase(item.baseId);
    if (base.category === 'rhune') return 'rgba(255,155,61,0.16)';
    switch (item.quality) {
        case 'magic':
            return 'rgba(120,150,255,0.13)';
        case 'rare':
            return 'rgba(243,211,74,0.13)';
        case 'unique':
        case 'rhuneword':
            return 'rgba(201,164,107,0.20)';
        default:
            return 'rgba(255,255,255,0.04)';
    }
}
