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

**GitHub Pages:** `.github/workflows/pages.yml` deploys a static export after CI passes on `main`
(`PAGES_BASE_PATH=/<repo> next build` → `out/`; run it from PowerShell — Git Bash rewrites the leading `/` into a
Windows path). That build turns off `cacheComponents` / `partialPrefetching` (static export can't run PPR) and
prefixes the base path, so files under `public/` must go through `asset()` (`lib/asset.ts`), never a bare `/images/...`.

Before reporting work as done: lint, typecheck, test, format:check, build — and for UI changes drive the real build in
Edge (Playwright via `createRequire` on the project `package.json`, `channel: "msedge"`) and look at screenshots.

## Architecture

```
src/app          AppShell (single page), useShellEffects (URL sync, keyboard, attract mode, projector tokens)
src/components   layout/ panels/ modals/ floorplan/ viewport/ cctv/ tour/ charts/ ui/   (2D UI)
src/three        Viewport (Canvas), SceneRoot, CameraRig, Atmosphere, Effects, look.ts, materials.ts,
                 geometry/ (GeometryBuilder, exterior, site, city, schematic, interiors, layers), picking/, effects/
src/data         all hard-coded data: property (floor schedule), rooms, events, assets, energy, views, showcase,
                 aiScript, floorPlans, kpis, nav
src/store        one Zustand store = twinSlice (view / scene / UI) + simSlice (clock, rooms, incidents…);
                 selectors.ts (derived values), hooks.ts (narrow subscriptions), useSimTicker
src/types        shared domain types
```

- **One page, store is the single source of truth.** Views switch via `setView(id)`, which applies the hero shot from
  `data/views.ts` (camera, mode, layers, time of day). The URL `?view=` only mirrors the store. Never set camera / mode
  from a component's mount.
- **Camera requests** are `{ shot, n }` in the store (`flyTo`, `selectFloor`, `pickAsset`…); `n` increments so the same
  shot can fly twice. Shots: `{preset}` · `{floor}` · `{focus, distance}` · `{azimuth}` (compass).
- **Derived values live in `store/selectors.ts`** (KPIs, energy, asset card). Components subscribe narrowly
  (`useShallow`, `store/hooks.ts`) — never select a fresh object without `useShallow` (infinite re-render).
- **Floor schedule** (`data/property.ts`) drives everything 3D and 2D: H01–07, H10–15, H18–23 = 28 rooms; H08–09,
  H16–17, H24–25 = sky courts; H26–29 = 17 rooms (narrow, centred at x 19 / z −7); H30 roof; podium G, L1–L4.
  600 keys total. Room ids `H12-07`. Seeded generator → t0 is 504 occupied / 62 ready / 28 cleaning / 6 maintenance.
- **t0 KPIs must stay 84 % · 2,616 kW · 27,840 · 3 (1 high)** — tested. `footfallFactor = footfall / 27,840`.
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
- **Demo showcase** ("ชมเดโม" menu, `data/showcase.ts`): two paths — **Executive** (6 chapters, business outcomes with
  assumed figures from `data/value.ts`) and **Technical deep-dive** (16 chapters, one per feature). Each chapter is a
  list of timed beats that drive the real store actions; beat 0 always sets its own view so any chapter can be jumped
  to. Plays on its own (`useShowcasePlayer`); a click or wheel outside the card pauses it; ending it restores the sim
  data it changed. Attract mode loops the executive path. **Wording rule:** say only what the demo does now, then
  "ระบบจริงจะ…" — never claim more than the disclaimers (real-time, real building, auto-notify, live AI).
- **Sales pages:** Value / ROI and Roadmap 3 เฟส are modals (`modals/ProposalModals.tsx`) opened by the demo's closing chapters
  and from each other — no menu entry (removed at the owner's request). Every
  figure there is labelled ค่าสมมติ; the energy figure comes from the energy model at 25 °C, not a hand-typed number.
- **Naming:** page title = menu label; the assistant is "AI Assistant" everywhere. 3D pins are filtered per view
  (`VIEW_SPOTS` in `three/HotspotSet.tsx`). KPI labels say what they cover (Hotel / Mall / whole building) and show
  ▲▼ vs. yesterday (`KPI_YESTERDAY`, assumed) from 1440 px.
- **Incoming alert:** `simulateIncident` → `raiseAlert` (alert card `viewport/IncomingAlert.tsx`, viewport edge flash,
  camera flies to it, the 3D marker shows in any view). Auto-response steps come from `autoResponse()` in
  `data/events.ts`. The card goes when the incident is opened / verified or dismissed.
- Keyboard: `→/←/PageUp/PageDown` showcase chapters, `P` presentation, `R` reset, `[ ]` floors, `Home`, `Esc` (closes
  innermost: modal → showcase → floor plan → picked floor → slice → presentation; works even from inside inputs for modals).
- Reset Demo restores the seeded state but keeps presenter preferences (sidebar, quality, attract) and never replays
  the intro.
- Windows dev machine: Bash is Git Bash; `TaskStop` leaves the `next start` node process holding the port — free it
  with PowerShell `Get-NetTCPConnection -LocalPort <p> | Stop-Process` before restarting, or a stale build is served.
  `git checkout` writes CRLF; run Prettier afterwards. Port 3000 may be taken by an unrelated node process — don't kill it.
- The demo machine has two GPUs; Edge defaults to the Radeon 780M. Windows Graphics → High performance (RTX 4060).

## Testing

- Unit (`src/**/*.test.ts`): energy model, rooms, floor schedule, data validation, assistant rules, store actions
  (views, showcase, incidents, picking, floor plan), schematic / layer geometry.
- E2E (`e2e/smoke.spec.ts`): fails on any console error or **any request leaving localhost** (offline guarantee).
  The WebGL canvas is `canvas:not([role=img])` (CCTV feeds are canvases too). Press a key first to skip the intro.
  CI runs it on Chromium with SwiftShader (`CI=1` switches the launch flags in `playwright.config.ts`).
