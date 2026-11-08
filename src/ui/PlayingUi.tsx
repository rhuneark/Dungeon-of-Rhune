import { useEffect } from 'react';
import { session } from '../state/session.ts';
import { store, useStore } from '../state/store.ts';
import Hud, { toggleInventory, toggleLeft, toggleOverlay } from './Hud.tsx';
import { CursorItem, CursorMode, TooltipHost } from './kit/Overlays.tsx';
import { tooltip } from './kit/tooltip.ts';
import CharacterPanel from './panels/CharacterPanel.tsx';
import DialogBox from './panels/DialogBox.tsx';
import InventoryPanel from './panels/InventoryPanel.tsx';
import { CodexPanel, QuestsPanel } from './panels/JournalPanels.tsx';
import LabPanel from './panels/LabPanel.tsx';
import { GamblePanel, SmithPanel, StashPanel, VendorPanel, WellPanel } from './panels/ServicePanels.tsx';
import SkillsOverlay from './panels/SkillsOverlay.tsx';

function useHotkeys() {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            const k = e.key.toLowerCase();
            if (k === 'escape') {
                tooltip.hide();
                if (!store.closeAll()) {
                    // Nothing open: Esc returns you to the menu (progress is saved).
                    void session.flush();
                    store.patch({ phase: 'menu' });
                }
                return;
            }
            if (e.repeat) return;
            if (k === 'i' || k === 'b') toggleInventory();
            else if (k === 'c') toggleLeft('character');
            else if (k === 'k' || k === 't') toggleOverlay('skills');
            else if (k === 'q') toggleLeft('quests');
            else if (k === 'l') toggleLeft('codex');
            else if (k === '`' || k === '~') {
                const on = !store.get().devTools;
                store.patch({ devTools: on, left: on ? 'lab' : store.get().left === 'lab' ? null : store.get().left });
            } else if (k === ' ') {
                tooltip.hide();
                store.closeAll();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
}

export default function PlayingUi() {
    useHotkeys();
    const left = useStore((s) => s.left);
    const right = useStore((s) => s.right);
    const overlay = useStore((s) => s.overlay);
    const dialog = useStore((s) => s.dialog);
    // A panel that unmounts under the pointer never fires pointerleave.
    useEffect(() => tooltip.hide(), [left, right, overlay, dialog]);
    return (
        <>
            <Hud />
            {left === 'character' && <CharacterPanel />}
            {left === 'stash' && <StashPanel />}
            {(left === 'vendor' || left === 'herbs') && <VendorPanel />}
            {left === 'gamble' && <GamblePanel />}
            {left === 'smith' && <SmithPanel />}
            {left === 'well' && <WellPanel />}
            {left === 'quests' && <QuestsPanel />}
            {left === 'codex' && <CodexPanel />}
            {left === 'lab' && <LabPanel />}
            {right === 'inventory' && <InventoryPanel />}
            {overlay === 'skills' && <SkillsOverlay />}
            <DialogBox />
            <CursorMode />
            <TooltipHost />
            <CursorItem />
        </>
    );
}
