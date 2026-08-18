import type { ReactNode } from 'react';
import { store } from '../../state/store.ts';

export default function Modal({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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
