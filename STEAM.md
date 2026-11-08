# Shipping Dungeon of Rhune on Steam

The game is a web app (Pixi.js + React) wrapped in an **Electron** desktop shell
(`desktop/`) for Steam. The same `dist/` also runs as a plain website.

## 1. Steamworks setup (once)

1. Join Steamworks, pay the app fee, create the app → note the **App ID**.
2. Create depots: **Windows x64** and **Linux x64** (Linux also covers the Steam Deck).
   macOS is optional (`npm run dist:mac` on a Mac; Apple notarization recommended).
3. Launch options (Installation → General):
   - Windows: `Dungeon of Rhune.exe`
   - Linux: `dungeon-of-rhune`
4. Put the App ID in `desktop/steam.config.json` → `"appId"`. With `0` the game runs
   without Steam (handy for local builds). For local testing you can use `480`
   (Valve's "Spacewar" test app) while the Steam client is running.
   `"requireLaunchThroughSteam": true` makes release builds relaunch through Steam
   when started directly (light DRM) — off by default.

## 2. Build the depots

```bash
npm run dist:win      # on Windows → release/win-unpacked/
npm run dist:linux    # on Linux   → release/linux-unpacked/
```

These are plain app folders; Steam handles installs and updates (no installer, no
auto-updater). Cross-building Windows from Linux works but needs Wine to brand the
.exe, so build each OS on that OS (or in CI).

## 3. Upload with SteamPipe

Edit the IDs in `steam/app_build.vdf`, `steam/depot_windows.vdf`, `steam/depot_linux.vdf`, then:

```bash
steamcmd +login <builder_account> +run_app_build "$(pwd)/steam/app_build.vdf" +quit
```

Then set the build live on a branch in the Steamworks site (or set `"SetLive"`).

## 4. Steam Cloud (saves)

Saves are plain files, so use **Auto-Cloud** (no code). Steamworks → Cloud:

| OS | Root | Subdirectory | Pattern |
|---|---|---|---|
| Windows | `WinAppDataRoaming` | `Dungeon of Rhune/saves` | `*.json` |
| Linux | `LinuxXdgConfigHome` | `Dungeon of Rhune/saves` | `*.json` |
| macOS | `MacAppSupport` | `Dungeon of Rhune/saves` | `*.json` |

The shell writes saves atomically and keeps a `.bak` of the previous one.

## 5. Achievements

Create these API names under Stats & Achievements (names/descriptions are in
`src/content/achievements.ts`; they unlock automatically from save state, so old
saves unlock retroactively):

`FIRST_UNIQUE`, `CODEX_10`, `FIRST_RHUNEWORD`, `TWO_PATHS`, `GOOSE`, `LOCAL_KNOWLEDGE`,
`BOTTOMLESS`, `ODDS_ARE`

Each needs a 64×64 icon (locked + unlocked).

## 6. Steam Deck

The Linux depot runs on the Deck. At 1280×800 the UI auto-scales to 1.5× (text ≈ 15px).
Still needed for **Deck Verified**: full controller support (movement on the stick,
cursor-free menus, on-screen glyphs) — planned with combat.

## 7. Store page checklist

- Capsules: header 920×430, small 462×174, main 1232×706, vertical 748×896,
  library capsule 600×900, library hero 3840×1240, library logo, community icon 184×184.
- 5+ screenshots (1920×1080), a trailer, description, tags, content survey, pricing.
- Publish a **Coming Soon** page early — wishlists drive launch visibility.

## Desktop shell notes

- `npm run desktop` — build and run the desktop app; `npm run desktop:dev` — hot reload.
- Dev tools (Chromium devtools + the Loot Lab, `~`): unpackaged runs, or launch with
  `RHUNE_DEVTOOLS=1`. Release builds have neither.
- `--no-steam` skips Steam init. F11 / Alt+Enter toggle fullscreen (remembered).
