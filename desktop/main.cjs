/**
 * Dungeon of Rhune — desktop shell (Electron) for the Steam release.
 *
 * - Serves the built game (dist/) over a private app:// protocol (fetch, ES
 *   modules and workers behave like the web build; no file:// quirks).
 * - Saves are JSON files in the OS user-data folder, written atomically with
 *   a .bak of the previous version. Point Steam Auto-Cloud at that folder.
 * - Native fullscreen (F11 / Alt+Enter / in-game Options), remembered.
 * - Closing the window asks the game to flush its save first.
 * - Steam (steamworks.js): overlay + achievements when an App ID is set and
 *   the Steam client is running; the game runs fine without it.
 */
const { app, BrowserWindow, ipcMain, net, protocol, shell, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.RHUNE_DEV_URL || '';
const DIST = path.join(__dirname, '..', 'dist');
const APP_ORIGIN = 'app://rhune';
const VERSION = app.getVersion();
/** Dev tools (Chromium devtools + the in-game Loot Lab): unpackaged runs, or RHUNE_DEVTOOLS=1. */
const DEV_TOOLS = !app.isPackaged || process.env.RHUNE_DEVTOOLS === '1';

// ------------------------------------------------------------------- Steam
const steamConfig = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'steam.config.json'), 'utf8'));
    } catch {
        return {};
    }
})();
const steamAppId = Number(process.env.RHUNE_STEAM_APP_ID || process.env.SteamAppId || steamConfig.appId || 0);
const steamWanted = steamAppId > 0 && !process.argv.includes('--no-steam');
let steamworks = null;
let steam = null;

if (steamWanted) {
    try {
        steamworks = require('steamworks.js');
        if (steamConfig.requireLaunchThroughSteam && app.isPackaged && steamworks.restartAppIfNecessary(steamAppId)) {
            // Steam will relaunch us through the client (DRM-lite). Off by default.
            app.exit(0);
        }
        // Must happen before any window exists.
        steamworks.electronEnableSteamOverlay();
    } catch (err) {
        console.warn('[steam] steamworks.js unavailable:', err && err.message);
        steamworks = null;
    }
}

function initSteam() {
    if (!steamworks) return;
    try {
        steam = steamworks.init(steamAppId);
        console.log('[steam] ready as', steam.localplayer.getName());
    } catch (err) {
        // Steam client not running, or the App ID isn't owned by this account.
        console.warn('[steam] init failed — running without Steam:', err && err.message);
        steam = null;
    }
}

// ---------------------------------------------------------------- settings
const userDir = () => app.getPath('userData');
const SAVE_DIR = () => path.join(userDir(), 'saves');
const SETTINGS_FILE = () => path.join(userDir(), 'settings.json');

function readSettings() {
    try {
        return { fullscreen: true, ...JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8')) };
    } catch {
        return { fullscreen: true };
    }
}
function writeSettings(s) {
    try {
        fs.mkdirSync(userDir(), { recursive: true });
        fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(s, null, 2));
    } catch (err) {
        console.warn('[settings] write failed', err);
    }
}

// ------------------------------------------------------------------- saves
const KEY_RE = /^[a-z0-9_-]{1,64}$/i;
function saveFile(key) {
    if (typeof key !== 'string' || !KEY_RE.test(key)) throw new Error('bad save key');
    return path.join(SAVE_DIR(), `${key}.json`);
}

ipcMain.handle('save:read', (_e, key) => {
    const file = saveFile(key);
    for (const f of [file, `${file}.bak`]) {
        try {
            return fs.readFileSync(f, 'utf8');
        } catch {
            /* try the backup */
        }
    }
    return null;
});

ipcMain.handle('save:write', (_e, key, data) => {
    if (typeof data !== 'string' || data.length > 32 * 1024 * 1024) throw new Error('bad save data');
    const file = saveFile(key);
    fs.mkdirSync(SAVE_DIR(), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, data);
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
    fs.renameSync(tmp, file);
});

ipcMain.handle('save:remove', (_e, key) => {
    const file = saveFile(key);
    for (const f of [file, `${file}.bak`]) fs.rmSync(f, { force: true });
});

// ------------------------------------------------------------------ window
let win = null;
let allowClose = false;
let closing = false;

function setFullscreen(on) {
    if (!win) return;
    win.setFullScreen(!!on);
}

function createWindow() {
    const settings = readSettings();
    win = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 960,
        minHeight: 600,
        show: false,
        fullscreen: !!settings.fullscreen,
        backgroundColor: '#0d0b09',
        title: 'Dungeon of Rhune',
        autoHideMenuBar: true,
        icon: path.join(__dirname, '..', 'build', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            spellcheck: false,
            backgroundThrottling: false,
            devTools: DEV_TOOLS,
            additionalArguments: [`--rhune-version=${VERSION}`, ...(DEV_TOOLS ? ['--rhune-dev'] : [])],
        },
    });
    win.once('ready-to-show', () => win.show());
    win.on('enter-full-screen', () => writeSettings({ ...readSettings(), fullscreen: true }));
    win.on('leave-full-screen', () => writeSettings({ ...readSettings(), fullscreen: false }));

    const wc = win.webContents;
    wc.setVisualZoomLevelLimits(1, 1);
    wc.on('before-input-event', (e, input) => {
        if (input.type !== 'keyDown') return;
        const key = input.key.toLowerCase();
        if (key === 'f11' || (input.alt && key === 'enter')) {
            setFullscreen(!win.isFullScreen());
            e.preventDefault();
        } else if ((input.control || input.meta) && ['+', '-', '=', '0'].includes(key)) {
            e.preventDefault(); // the game owns scaling — no browser zoom
        } else if (app.isPackaged && (key === 'f5' || ((input.control || input.meta) && key === 'r'))) {
            e.preventDefault(); // no accidental reloads in release builds
        }
    });
    // Never navigate away from the game; open real links in the browser.
    const startOrigin = DEV_URL ? new URL(DEV_URL).origin : APP_ORIGIN;
    wc.on('will-navigate', (e, url) => {
        if (!url.startsWith(startOrigin)) e.preventDefault();
    });
    wc.setWindowOpenHandler(({ url }) => {
        if (/^https:\/\//.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });

    // Let the game flush its save before the window goes away.
    win.on('close', (e) => {
        if (allowClose) return;
        e.preventDefault();
        if (closing) return;
        closing = true;
        const finish = () => {
            allowClose = true;
            if (win && !win.isDestroyed()) win.close();
        };
        const timer = setTimeout(finish, 2500);
        ipcMain.once('host:flushed', () => {
            clearTimeout(timer);
            finish();
        });
        wc.send('host:flush');
    });
    win.on('closed', () => {
        win = null;
    });

    win.loadURL(DEV_URL || `${APP_ORIGIN}/index.html`);
}

ipcMain.handle('window:getFullscreen', () => !!win && win.isFullScreen());
ipcMain.handle('window:setFullscreen', (_e, on) => setFullscreen(on));
ipcMain.on('app:quit', () => win && win.close());
ipcMain.handle('steam:status', () => ({ available: !!steam, name: steam ? steam.localplayer.getName() : undefined }));
ipcMain.handle('steam:achievement', (_e, id) => {
    if (!steam || typeof id !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(id)) return false;
    try {
        return steam.achievement.isActivated(id) || steam.achievement.activate(id);
    } catch {
        return false;
    }
});

// ---------------------------------------------------------------- app://
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
].join('; ');

function serveApp(request) {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString()).then((res) => {
        if (!rel.endsWith('.html')) return res;
        const headers = new Headers(res.headers);
        headers.set('Content-Security-Policy', CSP);
        return new Response(res.body, { status: res.status, headers });
    });
}

// -------------------------------------------------------------- lifecycle
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (!win) return;
        if (win.isMinimized()) win.restore();
        win.focus();
    });
    app.whenReady().then(() => {
        if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
        protocol.handle('app', serveApp);
        initSteam();
        createWindow();
    });
    app.on('window-all-closed', () => app.quit());
}
