# Stremio Dev Build

A modified Stremio Web UI with smart skip features (intro / recap / preview / credits),
auto "Next Episode" binge playing, colored seek bar segments, episode badges on
Continue Watching cards, and a one-double-click launcher.

## Features

### Skip segments (intro / recap / preview / credits)
- Skip buttons appear while the corresponding segment plays, with an exit-fade animation.
- Timestamps come from three community APIs, fetched in parallel:
  - [TheIntroDB](https://theintrodb.org) (`api.theintrodb.org`)
  - [SkipDB.tv](https://skipdb.tv) (`skipdb.tv`)
  - [IntroDB.app](https://introdb.app) (`api.introdb.app`, via local proxy)
- Results are cached for **7 days** per episode in `localStorage`.

### Version-aware timestamps
Every torrent link is a different cut of an episode (producer logo at the head,
French vs English release, BluRay vs WEB vs TV...). The player:
1. Parses the release info from each stream name/description
   (source, streaming service, resolution, **language**, release group).
2. Sends the **exact video duration** to TheIntroDB (`duration_ms`), which selects
   the closest matching release version.
3. Caches segments per **episode + version + duration bucket**, so a producer-logo
   link and a clean link never share timestamps.
4. Validates returned segments against your actual video duration and drops anything
   that cannot fit it — no jumping over real scenes.
5. If duration-matched queries return nothing, it retries without the duration hint.

Version keys look like: `bluray-1080p`, `web-nf-1080p-french`, `hdtv-720p-german`.

### Colored seek bar
While playing an episode that has DB data, the progress bar shows colored ranges:
- 🟡 yellow — intro
- 🟠 orange — recap
- 🔵 blue — credits
- 🟢 green — preview

### Next Episode with provider continuity (binge fallback)
Clicking Next Episode (popup, button, keyboard shortcut, or auto-next at the end):
1. Fast path — if the core engine can carry over the current provider
   (matching `behaviorHints.bingeGroup`), it plays immediately.
2. Fallback — otherwise the app fetches the next episode's streams from the
   **same addon** as the current link and auto-plays the best match, scored by
   similarity to the current stream:
   - same release group (+5), resolution (+3), source (+2), service / language (+1)
3. Only if that fails do you get the classic list of links.

### Continue Watching episode labels
Series cards on the board show a gradient overlay badge with
`S4:E4` plus the episode name (fetched lazily from Cinemeta, cached per series).

## Repository layout

| Path | What it is |
|---|---|
| `stremio-web/` | the modified web app: source AND a prebuilt production bundle in `build\`, so NO install/build is needed to run. The local server (`http_server.js`) is dependency-free — nothing but Node.js itself. |
| `StremioDev.exe` | one-double-click launcher (starts server + opens Stremio); carries the Stremio icon, no console window |
| `StremioDev.bat` | fallback launcher doing the same thing in a console window |

## Requirements

1. [Node.js LTS](https://nodejs.org) — only needed to RUN the server; no `npm install` required.
2. [Stremio desktop app](https://www.stremio.com) — install with default settings.
   The launcher expects `%LOCALAPPDATA%\Programs\Stremio\stremio-shell-ng.exe`.

## Setup (one time)

1. Get this repository onto the PC:
   - `git clone https://github.com/xOdis/stremio-dev-features-opened.git`
   - or GitHub → Code → Download ZIP → extract

   Keep `StremioDev.exe` directly next to the `stremio-web` folder (already the case if you clone/download without moving things).
2. Install Node.js and Stremio (see requirements above).
3. Optional — desktop icon: right-click `StremioDev.exe` → Show more options → Send to → Desktop (create shortcut). The exe already carries the Stremio icon.

## Daily use

Double-click `StremioDev.exe`. It will:

1. start the local server hidden (only if not already running)
2. wait until it answers on `http://127.0.0.1:8082/`
3. launch Stremio pointed at the local build

Errors (missing folder / missing Node.js / missing Stremio) are shown as popup messages instead of failing silently.

> **Rule:** if Stremio is already open WITHOUT the launcher, close it completely first (system tray too), then run the exe again. A running Stremio instance ignores the launch arguments otherwise.

## Rebuilding the UI (only if you change source code)

Open a terminal inside `stremio-web\` and run:

```
npm install
node_modules\.bin\webpack.cmd --mode production
```

The build output lands in `stremio-web\build\` which the server serves.

## Troubleshooting

- **Black window flashes then nothing / server error**
  - Is Node.js installed? Open cmd and type `node -v`
  - Check the log: `stremio-web\server.log`
- **No skip buttons for a show** — the community databases may not have data for that IMDb ID yet.
- **Wrong/stale segments** — timestamps are cached under localStorage keys starting with `skip_segments_v4_`. Clearing site data for `127.0.0.1:8082` forces a refetch.
- **Port conflict (something else uses 8082)** — stop that program, or change both occurrences of `8082` in `StremioDev.cs` (recompile) or `StremioDev.bat` AND `http_server.js`.
- **Antivirus flags StremioDev.exe** — it is a tiny open launcher compiled from `StremioDev.cs` (source included). You can review it, delete the exe and use `StremioDev.bat` instead — identical behavior.

## What was modified vs official stremio-web

### New files
| File | Purpose |
|---|---|
| `src/initShellComm.js` | shell bridge init (WebView2/Qt) |
| `src/routes/Player/useSkipSegments.js` | multi-provider segment fetch, version-aware caching, duration sanitizing |
| `src/routes/Player/releaseVersion.js` | release-name parser (source/service/resolution/language/group) |
| `src/routes/Player/bingeFallback.js` | next-episode same-provider stream matching |
| `src/routes/Player/autoNextEpisodeSetting.js` | auto-next setting persistence |
| `src/routes/Player/NextEpisodeButton/` | countdown pill component |

### Modified files
| File | Changes |
|---|---|
| `http_server.js` | rewritten dependency-free; port 8082 + streaming-server proxy + IntroDB CORS proxy + SW block |
| `src/index.js`, `src/index.html` | boot wiring |
| `src/common/Platform/shell/useShell.ts` | IPC capture tweak |
| `src/routes/Player/Player.js` | skip UI wiring, auto-next logic, NaN guards, overlap-safe skipping, binge fallback navigation |
| `src/routes/Player/ControlBar/*`, `SeekBar/*` | colored segment overlays on the seek bar |
| `src/components/ContinueWatchingItem/`, `MetaItem/*` | S:E + episode-name badges on cards |
| `src/routes/Player/OptionsMenu/OptionsMenu.js` | auto-next toggle |
| `src/routes/Player/SkipIntroButton/*` | button stack + exit animation |

### Deleted
- `src/routes/Player/useIntroTimestamps.js` — replaced by `useSkipSegments.js`
