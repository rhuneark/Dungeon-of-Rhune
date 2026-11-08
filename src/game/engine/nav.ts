/**
 * Walkability grid + A* pathfinding for click-to-move (8-way, no corner
 * cutting, string-pulled so paths don't zigzag).
 */
export const TILE = 32;

export interface Pt {
    x: number;
    y: number;
}

export class NavGrid {
    readonly blocked: Uint8Array;
    constructor(
        readonly w: number,
        readonly h: number
    ) {
        this.blocked = new Uint8Array(w * h);
    }

    inside(cx: number, cy: number): boolean {
        return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h;
    }
    isBlocked(cx: number, cy: number): boolean {
        return !this.inside(cx, cy) || this.blocked[cy * this.w + cx] === 1;
    }
    block(cx: number, cy: number, w = 1, h = 1): void {
        for (let y = cy; y < cy + h; y++) for (let x = cx; x < cx + w; x++) if (this.inside(x, y)) this.blocked[y * this.w + x] = 1;
    }
    unblock(cx: number, cy: number): void {
        if (this.inside(cx, cy)) this.blocked[cy * this.w + cx] = 0;
    }
    /** Is a world-space point standing room (with a small body radius)? */
    walkable(x: number, y: number, r = 7): boolean {
        for (const [dx, dy] of [
            [-r, -r / 2],
            [r, -r / 2],
            [-r, r / 2],
            [r, r / 2],
        ]) {
            if (this.isBlocked(Math.floor((x + dx) / TILE), Math.floor((y + dy) / TILE))) return false;
        }
        return true;
    }

    lineOfSight(a: Pt, b: Pt): boolean {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.ceil(dist / 6);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            if (!this.walkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
        }
        return true;
    }

    /** Nearest walkable cell to (cx, cy), searching outward in rings. */
    nearestOpen(cx: number, cy: number, maxR = 6): Pt | null {
        if (!this.isBlocked(cx, cy)) return { x: cx, y: cy };
        for (let r = 1; r <= maxR; r++) {
            let best: Pt | null = null;
            let bestD = Infinity;
            for (let y = cy - r; y <= cy + r; y++) {
                for (let x = cx - r; x <= cx + r; x++) {
                    if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || this.isBlocked(x, y)) continue;
                    const d = (x - cx) ** 2 + (y - cy) ** 2;
                    if (d < bestD) {
                        bestD = d;
                        best = { x, y };
                    }
                }
            }
            if (best) return best;
        }
        return null;
    }

    /** World-space path from a to b (excluding a). Null if unreachable. */
    findPath(a: Pt, b: Pt): Pt[] | null {
        const sx = Math.floor(a.x / TILE);
        const sy = Math.floor(a.y / TILE);
        const goal = this.nearestOpen(Math.floor(b.x / TILE), Math.floor(b.y / TILE));
        if (!goal) return null;
        const exactGoal = goal.x === Math.floor(b.x / TILE) && goal.y === Math.floor(b.y / TILE);
        const finalPt: Pt = exactGoal ? { x: b.x, y: b.y } : { x: goal.x * TILE + TILE / 2, y: goal.y * TILE + TILE / 2 };
        if (this.lineOfSight(a, finalPt)) return [finalPt];

        const W = this.w;
        const start = sy * W + sx;
        const target = goal.y * W + goal.x;
        const g = new Float32Array(W * this.h).fill(Infinity);
        const came = new Int32Array(W * this.h).fill(-1);
        const closed = new Uint8Array(W * this.h);
        const heap: [number, number][] = [];
        const push = (f: number, i: number) => {
            heap.push([f, i]);
            let c = heap.length - 1;
            while (c > 0) {
                const p = (c - 1) >> 1;
                if (heap[p][0] <= heap[c][0]) break;
                [heap[p], heap[c]] = [heap[c], heap[p]];
                c = p;
            }
        };
        const pop = () => {
            const top = heap[0];
            const last = heap.pop()!;
            if (heap.length) {
                heap[0] = last;
                let c = 0;
                for (;;) {
                    const l = c * 2 + 1;
                    const r = l + 1;
                    let m = c;
                    if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                    if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                    if (m === c) break;
                    [heap[m], heap[c]] = [heap[c], heap[m]];
                    c = m;
                }
            }
            return top;
        };
        const h = (i: number) => {
            const dx = Math.abs((i % W) - goal.x);
            const dy = Math.abs(Math.floor(i / W) - goal.y);
            return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
        };
        g[start] = 0;
        push(h(start), start);
        let found = false;
        let guard = 0;
        while (heap.length && guard++ < 20000) {
            const [, cur] = pop();
            if (cur === target) {
                found = true;
                break;
            }
            if (closed[cur]) continue;
            closed[cur] = 1;
            const x = cur % W;
            const y = Math.floor(cur / W);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (this.isBlocked(nx, ny)) continue;
                    if (dx && dy && (this.isBlocked(x + dx, y) || this.isBlocked(x, y + dy))) continue;
                    const ni = ny * W + nx;
                    const ng = g[cur] + (dx && dy ? 1.414 : 1);
                    if (ng < g[ni]) {
                        g[ni] = ng;
                        came[ni] = cur;
                        push(ng + h(ni), ni);
                    }
                }
            }
        }
        if (!found) return null;
        const cells: Pt[] = [];
        for (let i = target; i !== start && i >= 0; i = came[i]) cells.push({ x: (i % W) * TILE + TILE / 2, y: Math.floor(i / W) * TILE + TILE / 2 });
        cells.reverse();
        cells[cells.length - 1] = finalPt;
        // String-pull: skip waypoints we can see past.
        const out: Pt[] = [];
        let from = a;
        let i = 0;
        while (i < cells.length) {
            let j = cells.length - 1;
            while (j > i && !this.lineOfSight(from, cells[j])) j--;
            out.push(cells[j]);
            from = cells[j];
            i = j + 1;
        }
        return out;
    }
}
