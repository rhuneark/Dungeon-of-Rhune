import { useStore } from '../state/store.ts';

export default function Toasts() {
    const toasts = useStore((s) => s.toasts);
    if (toasts.length === 0) return null;
    return (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex flex-col items-center gap-2 px-4">
            {toasts.map((t) => (
                <div key={t.id} className="rounded-xl bg-black/80 px-4 py-2 text-center text-sm font-bold text-white shadow-lg">
                    {t.text}
                </div>
            ))}
        </div>
    );
}
