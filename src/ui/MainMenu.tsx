import { useState } from 'react';
import { comboTitle } from '../content/skills/disciplines.ts';
import { session } from '../state/session.ts';
import { store, useStore } from '../state/store.ts';
import { newHero } from '../systems/hero.ts';
import { startAutoQuests } from '../systems/quests.ts';
import { defaultSave } from '../systems/hero.ts';
import { wipeSave } from '../systems/save.ts';
import OptionsPanel from './panels/OptionsPanel.tsx';

export default function MainMenu() {
    useStore((s) => s.rev);
    const hero = session.save.hero;
    const [name, setName] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [creating, setCreating] = useState(!hero);
    const [options, setOptions] = useState(false);

    const start = () => {
        session.save.hero = newHero(name || 'Wanderer');
        startAutoQuests(session.save.hero);
        const h = session.save.hero;
        h.life = 1;
        session.commit();
        store.patch({ phase: 'playing', left: null, right: null, overlay: null, dialog: null });
        setTimeout(() => store.toast('Welcome to Thornwick. Talk to Old Varn (the tower, north-east of the square).', '#d9b26a'), 600);
    };
    const play = () => store.patch({ phase: 'playing', left: null, right: null, overlay: null, dialog: null });
    const wipe = async () => {
        await wipeSave();
        session.load(defaultSave());
        setConfirm(false);
        setCreating(true);
    };

    return (
        <div className="pe absolute inset-0 flex flex-col items-center justify-center gap-[8px]" style={{ background: 'radial-gradient(ellipse at center, #241a12 0%, #0d0b09 70%)' }}>
            <div className="title36 text-gold" style={{ textShadow: '2px 2px 0 #000' }}>
                Dungeon of Rhune
            </div>
            <div className="t10 mb-[10px] text-dim">Thornwick waits above the Sealed Stair.</div>
            {!creating && hero ? (
                <div className="frame flex w-[240px] flex-col items-center gap-[6px] p-[10px]">
                    <div className="t20 text-parch">{hero.name}</div>
                    <div className="t10 text-gold">
                        Level {hero.level} {comboTitle(hero.disciplines[0], hero.disciplines[1])}
                    </div>
                    <button className="pbtn w-full !py-[4px]" onClick={play}>
                        Continue
                    </button>
                    <button className="pbtn w-full" onClick={() => setCreating(true)}>
                        New hero (replaces this one)
                    </button>
                    {!confirm ? (
                        <button className="pbtn w-full" onClick={() => setConfirm(true)}>
                            Delete save
                        </button>
                    ) : (
                        <button className="pbtn w-full !text-bad" onClick={wipe}>
                            Really delete everything?
                        </button>
                    )}
                </div>
            ) : (
                <div className="frame flex w-[240px] flex-col items-center gap-[6px] p-[10px]">
                    <div className="t10 text-dim">Name your wanderer</div>
                    <input
                        autoFocus
                        maxLength={16}
                        className="t20 frame-inset w-full px-[4px] text-center text-parch outline-none"
                        value={name}
                        placeholder="Wanderer"
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && start()}
                    />
                    <button className="pbtn w-full !py-[4px]" onClick={start}>
                        Enter Thornwick
                    </button>
                    {hero && (
                        <button className="pbtn w-full" onClick={() => setCreating(false)}>
                            Back
                        </button>
                    )}
                    <div className="t10 text-center text-dim">No classes. Choose two Disciplines as you go; everything that makes sense, works.</div>
                </div>
            )}
            <button className="pbtn" onClick={() => setOptions(true)}>
                Options
            </button>
            {options && <OptionsPanel onClose={() => setOptions(false)} />}
            <div className="s8 absolute bottom-[8px] text-faint">CLICK TO MOVE · I C K Q L O · ~ LOOT LAB · ESC</div>
        </div>
    );
}
