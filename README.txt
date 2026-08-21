STREMIO DEV BUILD - SETUP GUIDE
===============================

What this is
------------
A modified Stremio Web UI with skip-intro / skip-recap / skip-preview buttons,
an auto "Next Episode" countdown button (with cancel), and a settings toggle
("Auto play next episode") in the player options menu.

Segment timestamps come from three community APIs, fetched in parallel:
  - TheIntroDB      (api.theintrodb.org)
  - SkipDB.tv       (skipdb.tv)
  - IntroDB.app     (api.introdb.app, via local proxy)
Results are cached for 7 days per episode in the browser's localStorage.

Repository layout:
  stremio-web\       - the modified web app: source AND a prebuilt production
                       bundle in build\, so NO install/build is needed to run.
                       The local server (http_server.js) is dependency-free —
                       it needs nothing but Node.js itself.
  StremioDev.exe     - one-double-click launcher (starts server + opens
                       Stremio); carries the Stremio icon, no console window
  StremioDev.bat     - fallback launcher doing the same thing in a console
                       window (use if the exe gives you trouble)
  README.txt         - this file


REQUIREMENTS (second PC)
------------------------
1. Node.js LTS          https://nodejs.org   (only needed to RUN the server;
                                             no npm install required)
2. Stremio desktop app  https://www.stremio.com
                        Install it with default settings. The launcher expects:
                        %LOCALAPPDATA%\Programs\Stremio\stremio-shell-ng.exe


SETUP (one time)
----------------
1. Get this repository onto the PC, either:
      - git clone https://github.com/<you>/<repo>.git
      - or GitHub -> Code -> Download ZIP -> extract
    IMPORTANT: keep StremioDev.exe directly next to the stremio-web folder
    (that is already the case if you clone/download without moving things).
2. Install Node.js and Stremio (see requirements above).
3. Optional - desktop icon:
   Right-click StremioDev.exe -> Show more options -> Send to ->
   Desktop (create shortcut).
   The exe already carries the Stremio icon, so the shortcut looks right.


DAILY USE
---------
Double-click StremioDev.exe (or its desktop shortcut). It will:
  1. start the local server hidden (only if it is not already running)
  2. wait until it answers on http://127.0.0.1:8082/
  3. launch Stremio pointed at the local build
Errors (missing folder / missing Node.js / missing Stremio) are shown as
popup messages instead of failing silently.

RULE: if Stremio is already open WITHOUT the launcher, close it completely
first (system tray too), then run the exe again. A running Stremio instance
ignores the launch arguments otherwise.


REBUILDING THE UI (only if you change source code)
--------------------------------------------------
Open a terminal inside stremio-web\ and run:
      npm install
      node_modules\.bin\webpack.cmd --mode production
The build output lands in stremio-web\build\ which the server serves.


TROUBLESHOOTING
---------------
- Black window flashes then nothing / server error:
    * Is Node.js installed? Open cmd and type: node -v
    * Check the log: stremio-web\server.log
- No skip buttons for a show:
    * The community databases simply may not have data for that IMDb ID yet.
- Wrong/stale segments:
    * Timestamps are cached 7 days under localStorage keys starting with
      "skip_segments_v3_". Clearing site data for 127.0.0.1:8082 forces a
      refetch.
- Port conflict (something else uses 8082):
    * Stop that program, or change both occurrences of 8082 in
      StremioDev.cs (recompile) or StremioDev.bat AND http_server.js.
- Antivirus flags StremioDev.exe:
    * It is a tiny open launcher compiled from StremioDev.cs (source
      included). You can review it, delete the exe and use
      StremioDev.bat instead - identical behavior.


WHAT WAS MODIFIED VS OFFICIAL STREMIO-WEB (for reference)
---------------------------------------------------------
New files:
  src/initShellComm.js                       shell bridge init (WebView2/Qt)
  src/routes/Player/useSkipSegments.js       multi-provider segment fetch/cache
  src/routes/Player/autoNextEpisodeSetting.js auto-next setting
  src/routes/Player/NextEpisodeButton\       countdown pill component
Modified files:
  http_server.js                             rewritten dependency-free; port
                                             8082 + streaming-server proxy
                                             + IntroDB CORS proxy + SW block
  src/index.js, src/index.html               boot wiring
  src/common/Platform/shell/useShell.ts      IPC capture tweak
  src/routes/Player/Player.js                skip UI wiring, auto-next logic,
                                             NaN guards, overlap-safe skipping,
                                             cancel keeps manual button alive
  src/routes/Player/OptionsMenu\OptionsMenu.js  auto-next toggle
  src/routes/Player/SkipIntroButton\*        button stack + exit animation
Deleted:
  src/routes/Player/useIntroTimestamps.js    replaced by useSkipSegments.js
