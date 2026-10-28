# CLAUDE.md — PRM Hospitality Digital Twin

Sales demo of a mixed-use building (600-key hotel + retail podium) as a 3D digital twin. Ported from the single-file
WebGL prototype `reference/PRM_Hospitality_DigitalTwin_example.html` (line numbers like "L321" in comments refer to it).
All data is simulated and hard-coded — no backend, no network at runtime. Runs on localhost (`npm start`) or pm2.

- Plan and decisions: `docs/PLAN.md` (phases, risks R1–R16, open questions) · 3D: `docs/3D_PLAN.md`
- Demo talk track: `docs/DEMO_SCRIPT.md` · pre-show checklist: `docs/DEMO_CHECKLIST.md`
- Owner / design approver speaks Thai; reply in Thai. Commit to `main` only when asked; end commits with the
  `Co-Authored-By` line given in the session.

## Stack (versions pinned, `save-exact`)

Next.js 16 (App Router, `cacheComponents`, Turbopack) · React 19 + React Compiler lint · three 0.186 / React Three
Fiber 9 / drei 10 / postprocessing · Zustand 5 · Tailwind 4 · motion · lucide-react · Vitest · Playwright (Edge).
**Next 16 differs from training data — read `node_modules/next/dist/docs/` before Next-specific code (see `AGENTS.md`).**

## Commands

```bash
npm run dev                      # dev server
npm run build && npm start       # production on :3000 (port busy → npx next start -p 3100)
npm run lint                     # ESLint incl. React Compiler rules (zero errors expected)
npm run typecheck                # next typegen && tsc --noEmit
npm test                         # Vitest unit tests (src/**/*.test.ts)
npm run test:e2e                 # Playwright smoke suite, needs a build; uses port 3123
npm run benchmark                # fps of the heaviest shot + GPU name, needs a build; port 3125
npm run format / format:check    # Prettier (printWidth 120); docs/ is ignored
```

**GitHub Pages:** `.github/workflows/pages.yml` deploys a static export on every push to `main` (gated by lint,
typecheck and unit tests; the CI e2e job does not block it)
(`PAGES_BASE_PATH=/<repo> next build` → `out/`; run it from PowerShell — Git Bash rewrites the leading `/` into a
Windows path). That build turns off `cacheComponents` / `partialPrefetching` (static export can't run PPR) and
prefixes the base path, so files under `public/` must go through `asset()` (`lib/asset.ts`), never a bare `/images/...`.

Before reporting work as done: lint, typecheck, test, format:check, build — and for UI changes drive the real build in
Edge (Playwright via `createRequire` on the project `package.json`, `channel: "msedge"`) and look at screenshots.

## Architecture

```
src/app          AppShell (single page), useShellEffects (URL sync, keyboard, projector tokens)
src/components   layout/ panels/ modals/ floorplan/ viewport/ cctv/ charts/ ui/   (2D UI)
src/three        Viewport (Canvas), SceneRoot, CameraRig, Atmosphere, Effects, look.ts, materials.ts,
                 geometry/ (GeometryBuilder, exterior, site, city, schematic, interiors, layers), picking/, effects/
src/data         all hard-coded data: property (floor schedule), rooms, events, sop, assets, energy, airQuality,
                 publicZones, views (the 5 scenes), aiScript, floorPlans, kpis, value, nav
src/store        one Zustand store = twinSlice (view / scene / UI) + simSlice (clock, rooms, incidents…);
                 selectors.ts (derived values), hooks.ts (narrow subscriptions), useSimTicker
src/types        shared domain types
```

- **One page, five scenes, store is the single source of truth.** The PROPERTY EXPLORER menu lists the scenes
  `overview · rooms · public · boh · ai` (`ViewId`, `data/views.ts`, keys `1`–`5`). `setView(id)` applies a scene's
  hero shot (camera, mode, floor, layers) — Guest Room slices H12 in a plan view (`{floor, top}` shot, distance
  fitted to the viewport by `planDistance`; each room's kW from `roomPowers` on its window side, `three/RoomPower.tsx`),
  Public Area G in a plan view too (whole podium, `PLAN_MARGIN.podium`; the chilled-water riser is left out on a
  sliced podium floor), Back of House the central plant (no floor cut; a rooftop alarm in focus slices H30, a
  chiller alarm brings the whole building back — `showAlarmUnit` in twinSlice). Lobby zones each follow their own daily rhythm (`atT0`, `rhythm` in
  `data/publicZones.ts`): at t0 Reception is High (check-in), Entrance Low. The two CCTV feeds (Public Area, IOC)
  are sample people-detection GIFs in `public/gifs` (`components/cctv/CctvFeed.tsx`), labelled SAMPLE / NOT LIVE. The right panel,
  bottom panel, KPI strip (`KPI_SETS` in `data/kpis.ts`), 3D pins and assistant chips all follow the scene.
  The URL `?scene=` only mirrors the store (`?view=` still read). Never set camera / mode from a component's mount.
  Above it the WORKSPACE menu (`WORKSPACE` in `data/nav.ts`) keeps the original pages `executive · twin · ioc ·
  energy` plus `ai` (same view as scene 5). Executive overview shows the Overview charts (incl. AQI); IOC uses the Alarm panel
  and keeps an injected alarm on the page instead of switching scene. Keys and ← / → step through scenes only.
  The folded sidebar (icon rail) shows only the workspace; the scenes appear when it is open.
- **Camera requests** are `{ shot, n }` in the store (`flyTo`, `selectFloor`, `pickAsset`…); `n` increments so the same
  shot can fly twice. Shots: `{preset}` · `{floor}` · `{focus, distance}` · `{azimuth}` (compass).
- **Derived values live in `store/selectors.ts`** (KPIs, energy, asset card). Components subscribe narrowly
  (`useShallow`, `store/hooks.ts`) — never select a fresh object without `useShallow` (infinite re-render).
- **Floor schedule** (`data/property.ts`) drives everything 3D and 2D: H01–07, H10–15, H18–23 = 28 rooms; H08–09,
  H16–17, H24–25 = sky courts; H26–29 = 17 rooms (narrow, centred at x 19 / z −7); H30 roof; podium G, L1–L4.
  600 keys total. Room ids `H12-07`. Room status is three-way: **occupied (red) · reserved (yellow) · available
  (green)**, the same colours in 3D (`ROOM_COLOR`, `three/RoomTint.tsx`) and 2D. Seeded generator → t0 is
  504 / 34 / 62. Stays (guests, check-in / out), room kW (`roomPowers`, sums exactly to the energy model's hotel load)
  and GRMS state are derived from the room id in `data/rooms.ts`.
- **t0 KPIs must stay 84 % · 2,616 kW · 27,840 · 3 (1 high)** — tested. `footfallFactor = footfall / 27,840`.
  Air quality (`data/airQuality.ts`) and lobby counts (`data/publicZones.ts`) are pure functions of the clock, so
  t0 is fixed too: outdoor AQI 92 / indoor 44, 202 people on G. Every number comes from one selector so KPI cards,
  panels and the assistant agree (`selectAir`, `selectPublic`, `selectCases`, `floorPower`, `selectGuests`).
- **Geometry:** `GeometryBuilder` (port of the prototype helpers) merges everything into one mesh per material.
  Display meshes never raycast; picking uses invisible proxies in `three/picking/`. Building (exterior or schematic
  for X-ray / Slice / Explode) uses a second material set clipped by `REVEAL_PLANE` for the rise-up transition.
- **Floor fit-out** (`geometry/interiors.ts`): guest rooms (bath, bed, desk, FCU, door status light), tower core
  (lifts, stairs, AHU, linen, electrical room with the riser at x 21 / z −6), sky courts H08 pool · H09 library ·
  H16 gym · H17 spa · H24 restaurant · H25 sky bar (odd = mezzanine), H30 roof plant, podium G lobby · L1 retail ·
  L2 F&B · L3 ballroom · L4 co-working (`FLOOR_PROGRAM` in `data/property.ts`). Cut at 2.9 m section height.
  Detail "full" on the sliced / top floor, "lite" for the exploded stack (keeps it < 1.5 M vertices, tested).
- **Rendering:** `frameloop="demand"` — anything animated must call `invalidate()` each frame *only while visible*
  (auto-rotate switches to `always`). Static shadow map, re-rendered when the building changes.
  **Ambient life** (`three/AmbientLife.tsx`; lanes, signals and walking routes in `geometry/traffic.ts`, models in
  `geometry/ambientModels.ts`): 8 vehicle kinds (sedan … bus, tuk-tuk, motorbike) on the city grid, left-hand traffic,
  car-following with stops at red lights and at the avenue zebra while people cross; traffic lights cycle; people
  with swinging limbs walk into the arrival hall, along the plaza, over the zebra and the skywalk, some stand in pairs.
  Lamps glow at dusk. It invalidates every frame, so it is off on Low quality and with reduced motion.
  **Lobby (Public Area, G sliced):** walls / glazed street front with three doors (`LOBBY_DOORS`) and decor in
  `podiumG`; `geometry/lobbyLife.ts` draws one figure per 4 people of each zone count (reception queue and staff,
  rows at the lifts, luggage by the doors, lounge pairs, walkers) through the shared `Crowd` (`AmbientLife.tsx`);
  `three/LobbyZones.tsx` heats the floor from the figures' positions twice a second, clipped to the zone rectangles
  (indoors only). Reduced motion freezes the figures and the heatmap.
  Look: Khronos Neutral tone mapping, Lightformer environment (no HDR / CDN), N8AO + Bloom on High.

## Conventions and gotchas

- **React Compiler lint:** don't mutate hook return values or props (e.g. `useThree` camera, a ref passed as prop,
  a `useMemo` object) in effects. Read mutable three objects via `useThree(s => s.get)()` inside the effect, mutate
  inside `useFrame` callbacks, or look DOM nodes up by id (see `three/Compass.tsx`). No `setState` directly in effects.
- **drei `<Html>` needs a fixed `portal`** (see `HotspotSet`) — otherwise the first label mounts empty.
- **Zero-length normals** (degenerate polygons) produce NaN and Bloom turns the frame black — the builder skips them;
  `schematic.test.ts` / `builder.test.ts` check every normal is unit length. Keep that test passing for new geometry.
- **Thai text never below 13 px**, line-height 1.6; don't put Thai in `font-mono` (no Thai glyphs).
- **Room status in 2D is always colour + icon** (`components/ui/StatusChip.tsx`) for colour-blind viewers.
- **No sparkle (✨ `Sparkles`) icons** — removed at the owner's request. KPI cards keep the prototype layout
  (label + icon, big value, note + `SOURCE · DEMO`, corner sparkline). Ask before broad visual restyles.
- **No placeholder buttons in the demo** — hide a control until its feature exists.
- **No guided tour:** the "ชมเดโม" showcase and attract mode were removed at the owner's request; the presenter
  drives the five scenes (`docs/DEMO_SCRIPT.md`). **Wording rule:** say only what the demo does now, then
  "ระบบจริงจะ…" — never claim more than the disclaimers (real-time, real building, auto-notify, live AI).
- **Header:** the clock is the real time in Thailand (`Asia/Bangkok`, date like "28 Oct 26"); the simulation clock is
  the footer slider. Export, Model notes and the `?` help button are commented out at the owner's request, so the
  help modal (quality setting) and the sales pages below are not reachable from the UI right now.
- **Sales pages:** Value / ROI and Roadmap 3 เฟส are modals (`modals/ProposalModals.tsx`) opened from the Help modal
  and from each other — no menu entry (removed at the owner's request). Every
  figure there is labelled ค่าสมมติ; the energy figure comes from the energy model at 25 °C, not a hand-typed number.
- **Naming:** page title = menu label; the assistant is "AI Assistant" everywhere. 3D pins are filtered per view
  (`VIEW_SPOTS` in `three/HotspotSet.tsx`). KPI labels say what they cover (Hotel / Mall / whole building) and show
  ▲▼ vs. yesterday (`KPI_YESTERDAY`, assumed) from 1440 px.
- **Alarms = incidents:** one list feeds Case Management (Open = New, Pending = Acknowledged + In progress), Alarm &
  Events and the assistant. Severity Critical / Major / Minor (= high / medium / low), status New → Acknowledged →
  In progress → Closed (0–3; In progress creates the work order). Equipment alarms carry `device`, `reading`
  (value vs. limit) and `sop` (`data/sop.ts`, checklist ticks in `sopChecks`). Rooftop units are assets `CT-*`, `P-*`,
  `T-*`, `EF-*` (`ROOF_EQUIPMENT`, pickable when H30 is sliced); the chiller CH-01 is on the ground plant.
- **Incoming alert:** `simulateIncident(scenario?)` (Shift+1–5 or the injector menu; `SCENARIOS` in `data/events.ts`)
  → opens the scene that shows it (roof → Back of House, crowd → Public Area) → `raiseAlert` (alert card, edge flash,
  camera flies to it). Open alarms blink by severity in Back of House (`three/EquipmentAlarms.tsx`).
  Back of House opens over the central plant (`chillers` preset; picking H30 shows the roof north up, tilted
  `ROOF_TILT`), focused on `plantAlarm()` (the focused or most urgent open alarm on a rooftop unit or CH-01, the
  southern chiller): `three/AlarmCallout.tsx` turns that unit red (a pulsing red copy of its shape) and pins a card with the reading, the SOP's
  `cause`, its steps and "ถาม AI: ทำอะไรต่อ" (asks about that INC id; `alarmAsked` in `aiScript.ts`).
  **Central plant** (`three/ChillerPlant.tsx`, `CHILLERS` in `data/assets.ts`): three centrifugal chillers as their own
  meshes (shells, compressor, panel, CHW / CW headers, pumps); CH-01 turns red for its alarm. Double-click a chiller
  (pick proxy) → `openChiller(i)`: shells go see-through to show tube bundles, impeller, refrigerant loop and labels;
  the camera may come to `insideDistance`; Esc or the banner closes it. No trees over the plant pad.
  A plant house (`PlantHouse`) encloses them: closed with a roof and louvres elsewhere, cut open as a section (no roof,
  2.4 m walls) in Back of House, which opens framed on it (`chillers` preset) with the CH-01 alarm card. A dismissed
  alarm card comes back on the next camera shot (Home, reopening the scene).
- **AI Assistant** (`data/aiScript.ts`, offline rules engine): `routeIntent` sends a question to one of six topics
  (building · energy · rooms · public · alarms · recommend; a generic question takes the scene's topic); every answer
  is `{data, analysis, recommendation, source, period, sopFor?}`, shown as three coloured parts. Answers are stamped
  with the scene and clock; ones from another scene are dimmed. Chips per scene (`QUICK_CHIPS`).
- Keyboard: `1`–`5` scenes, `→/←/PageUp/PageDown` next / previous scene, `Shift+1`–`5` inject a scenario, `P`
  presentation, `R` reset, `[ ]` floors, `Home`, `Esc` (closes innermost: modal → floor plan → picked floor → slice →
  presentation; works even from inside inputs for modals).
- Reset Demo restores the seeded state but keeps presenter preferences (sidebar, quality) and never replays
  the intro.
- Windows dev machine: Bash is Git Bash; `TaskStop` leaves the `next start` node process holding the port — free it
  with PowerShell `Get-NetTCPConnection -LocalPort <p> | Stop-Process` before restarting, or a stale build is served.
  `git checkout` writes CRLF; run Prettier afterwards. Port 3000 may be taken by an unrelated node process — don't kill it.
- The demo machine has two GPUs; Edge defaults to the Radeon 780M. Windows Graphics → High performance (RTX 4060).

## Testing

- Unit (`src/**/*.test.ts`): energy model, rooms / stays / room kW, air quality, lobby zones, floor schedule, data
  validation, assistant router and answers, store actions (scenes, alarms, SOP, incidents, picking, floor plan),
  schematic / layer geometry.
- E2E (`e2e/smoke.spec.ts`): fails on any console error or **any request leaving localhost** (offline guarantee).
  The WebGL canvas is `canvas:not([role=img])` (CCTV feeds are canvases too). Press a key first to skip the intro.
  CI runs it on Chromium with SwiftShader (`CI=1` switches the launch flags in `playwright.config.ts`).
