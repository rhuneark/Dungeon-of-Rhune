/**
 * The only bridge between the game (sandboxed renderer) and the desktop
 * shell. Exposes a small, typed surface on window.rhuneHost — see
 * src/platform/index.ts for the matching TypeScript interface.
 */
const { contextBridge, ipcRenderer } = require('electron');

const versionArg = process.argv.find((a) => a.startsWith('--rhune-version='));

contextBridge.exposeInMainWorld('rhuneHost', {
    kind: 'desktop',
    version: versionArg ? versionArg.split('=')[1] : '',
    devTools: process.argv.includes('--rhune-dev'),
    saveRead: (key) => ipcRenderer.invoke('save:read', key),
    saveWrite: (key, data) => ipcRenderer.invoke('save:write', key, data),
    saveRemove: (key) => ipcRenderer.invoke('save:remove', key),
    getFullscreen: () => ipcRenderer.invoke('window:getFullscreen'),
    setFullscreen: (on) => ipcRenderer.invoke('window:setFullscreen', !!on),
    quit: () => ipcRenderer.send('app:quit'),
    onFlushRequest: (cb) => {
        ipcRenderer.removeAllListeners('host:flush');
        ipcRenderer.on('host:flush', async () => {
            try {
                await cb();
            } finally {
                ipcRenderer.send('host:flushed');
            }
        });
    },
    steamStatus: () => ipcRenderer.invoke('steam:status'),
    unlockAchievement: (id) => ipcRenderer.invoke('steam:achievement', id),
});
