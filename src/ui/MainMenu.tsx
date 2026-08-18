import { store } from '../state/store.ts';

export default function MainMenu() {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-10">
            <h1 className="text-center text-4xl font-bold tracking-wide text-primary">
                DUNGEON <span className="text-white">OF</span> RHUNE
            </h1>
            <p className="mb-8 max-w-xs text-center text-sm text-white/50">
                You're an idiot with a legendary hammer. Everything else is a problem that solves itself.
            </p>
            <button
                type="button"
                className="rounded-2xl bg-primary px-12 py-4 text-xl font-bold text-black shadow-lg transition-transform active:scale-95"
                onClick={() => store.patch({ phase: 'playing', location: 'hub' })}
            >
                Play
            </button>
        </div>
    );
}
