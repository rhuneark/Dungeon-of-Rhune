import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { store } from '../../state/store.ts';

/**
 * `fullScreen` is for menus with too much content to live in the small
 * bottom-sheet card (the skill tree, mainly) — header pinned at top, and
 * does NOT scroll its content area itself (unlike the default card): a
 * fullScreen panel manages its own internal scroll regions (e.g. a fixed
 * sidebar + a scrolling main pane).
 *
 * It's also the one thing in the app allowed to escape #app-frame's locked
 * 9:16 letterbox (see styles/app.css) — portaled straight to <body> so it
 * genuinely fills the browser window on a wide desktop screen instead of
 * being squeezed into the portrait game frame. The frame itself (and every
 * other panel) stays fixed-aspect; this is a menu-only exception.
 */
export default function Modal({
    title,
    subtitle,
    children,
    fullScreen,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
    fullScreen?: boolean;
}) {
    if (fullScreen) {
        return createPortal(
            <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-[#0b1020]">
                <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4 pt-safe-top">
                    <div>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-white active:scale-95"
                        onClick={() => store.patch({ panel: null })}
                    >
                        Close
                    </button>
                </div>
                <div className="min-h-0 flex-1 pb-safe-bottom">{children}</div>
            </div>,
            document.body
        );
    }

    return (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center bg-black/60 pb-safe-bottom sm:items-center">
            <div className="flex max-h-[82%] w-full max-w-md flex-col rounded-t-3xl bg-[#141a30] shadow-2xl ring-1 ring-white/10 sm:rounded-3xl">
                <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-white active:scale-95"
                        onClick={() => store.patch({ panel: null })}
                    >
                        Close
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
            </div>
        </div>
    );
}
