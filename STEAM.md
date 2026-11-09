# Shipping Dungeon of Rhune on Steam

The game is a **Godot 4.7** project. Steam builds are plain Godot exports
(Windows, Linux/Steam Deck, optionally macOS) with the **GodotSteam** GDExtension
for achievements. The same project also exports to the web.

## 1. Steamworks setup (once)

1. Join Steamworks, pay the app fee, create the app → note the **App ID**.
2. Create depots: **Windows x64** and **Linux x64** (Linux also covers the Steam Deck).
   macOS is optional (export on any OS; notarize on a Mac).
3. Launch options (Installation → General):
   - Windows: `DungeonOfRhune.exe`
   - Linux: `DungeonOfRhune.x86_64`
4. Put the App ID in **Project Settings → rhune/steam/app_id** (in `project.godot`:
   `[rhune] steam/app_id=...`). With `0` the game runs without Steam. For local testing
   you can use `480` (Valve's "Spacewar" test app) while the Steam client is running.
   `rhune/steam/require_launch_through_steam=true` makes release builds relaunch
   through Steam when started directly (light DRM), off by default.

## 2. Install GodotSteam (once)

In the editor: **AssetLib → search "GodotSteam GDExtension" → Download → Install**
(it lands in `addons/godotsteam/`; commit it). Restart the editor. Nothing else to wire:
`scripts/autoload/platform.gd` finds the `Steam` singleton if it exists and otherwise plays
without Steam. It handles both `steamInitEx` signatures (older and newer GodotSteam).

The GodotSteam `.gdextension` file lists the Steam API libraries (`steam_api64.dll`,
`libsteam_api.so`), so exports copy them next to the game binary. Check they are in
`builds/<os>/` after exporting.

## 3. Export the depots

Install export templates once: **Editor → Manage Export Templates → Download and Install**
(4.7.2). The presets are in `export_presets.cfg`. Export from **Project → Export**, or:

```bash
godot --headless --export-release "Windows Desktop" builds/windows/DungeonOfRhune.exe
godot --headless --export-release "Linux" builds/linux/DungeonOfRhune.x86_64
godot --headless --export-release "macOS" builds/macos/DungeonOfRhune.zip
```

The output is plain folders; Steam handles installs and updates. `tools/` and `tests/` are
excluded from exports. Windows exports can be made on any OS (the icon comes from
`assets/icon.png`).

## 4. Upload with SteamPipe

Edit the IDs in `steam/app_build.vdf`, `steam/depot_windows.vdf` and `steam/depot_linux.vdf`
(content roots are `builds/windows/` and `builds/linux/`), then:

```bash
steamcmd +login <builder_account> +run_app_build "$(pwd)/steam/app_build.vdf" +quit
```

Then set the build live on a branch in the Steamworks site (or set `"SetLive"`).

## 5. Steam Cloud (saves)

Saves are plain JSON in Godot's user folder (`project.godot` sets a custom user dir named
`Dungeon of Rhune`), so use **Auto-Cloud** (no code). Steamworks → Cloud:

| OS | Root | Subdirectory | Pattern |
|---|---|---|---|
| Windows | `WinAppDataRoaming` | `Dungeon of Rhune/saves` | `*.json` |
| Linux | `LinuxXdgDataHome` | `Dungeon of Rhune/saves` | `*.json` |
| macOS | `MacAppSupport` | `Dungeon of Rhune/saves` | `*.json` |

The save is written atomically (`.tmp` then rename) and the previous one is kept as `.bak`.
Display settings (`view.cfg`, `settings.cfg`) sit in the folder above `saves/` and are
deliberately not synced.

## 6. Achievements

Create these API names under Stats & Achievements. Names and descriptions are in
`scripts/content/achievements.gd`. They unlock automatically from save state, so old saves
unlock them retroactively:

`FIRST_UNIQUE`, `CODEX_10`, `FIRST_RHUNEWORD`, `TWO_PATHS`, `GOOSE`, `LOCAL_KNOWLEDGE`,
`BOTTOMLESS`, `ODDS_ARE`

Each needs a 64×64 icon (locked + unlocked).

## 7. Steam Deck

The Linux depot runs on the Deck. At 1280×800 the UI auto-scales to 1.5×, and the left stick
already walks (input map `move_*`). Still needed for **Deck Verified**: full controller
support (a cursor-free way to use panels and on-screen glyphs), planned with combat.

## 8. Store page checklist

- Capsules: header 920×430, small 462×174, main 1232×706, vertical 748×896,
  library capsule 600×900, library hero 3840×1240, library logo, community icon 184×184.
- 5+ screenshots (1920×1080), a trailer, description, tags, content survey, pricing.
- Publish a **Coming Soon** page early. Wishlists drive launch visibility.

## Desktop notes

- Release builds start fullscreen; editor/debug runs start windowed. F11 / Alt+Enter toggles
  (remembered in `settings.cfg`).
- Dev tools (the Loot Lab, `` ` ``): any debug build (running from the editor, or
  `--export-debug`). In release builds pass `-- --dev-tools` or set `RHUNE_DEVTOOLS=1`.

## Web

Export the **Web** preset to `builds/web/` and upload the folder to any static host
(itch.io, GitHub Pages...). Thread support is off, so no special server headers are
needed. Saves go to the browser's storage (IndexedDB). Add `?dev` to the URL for the Loot Lab.
