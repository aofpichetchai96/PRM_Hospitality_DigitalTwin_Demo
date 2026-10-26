# PRM Hospitality Digital Twin — แผนพัฒนา (React + Three.js)

> สถานะ: **v4 — ผ่าน Gate 0 แล้ว** (Next.js หน้าเดียว · รันบน localhost / pm2) — พร้อมเริ่ม Phase 0 · อัปเดต 2026-10-26
> ต้นแบบ: `PRM_Hospitality_DigitalTwin_example.html` (single file 1.1 MB, 453 บรรทัด)

---

## 1. เป้าหมาย

| # | เป้าหมาย | ผลลัพธ์ที่ต้องได้ |
|---|---|---|
| 1 | แยกไฟล์ตัวอย่างเป็นโปรเจ็คที่มีโครงสร้างชัดเจน | **Next.js** + TypeScript + Three.js (ผ่าน React Three Fiber) — หน้าเดียว สลับ view ด้วย state (ข้อ 12.1) |
| 2 | ข้อมูล Hard-code ทั้งหมด | ไม่มี Backend / API — ข้อมูลอยู่ใน `src/data/*.ts` แก้ได้ที่เดียว |
| 3 | 3D และสัดส่วนข้อมูลชัดเจน **สวยกว่าต้นแบบ** | ฉาก 3D แยกเป็น component ตามส่วนอาคาร, "Core look" (ข้อ 6.5) เป็นงานหลักไม่ใช่ stretch, layout/UI ใช้ design token เดียวกัน |

**ใช้สำหรับ:** Demo ขายงาน → ให้ความสำคัญกับ *ความลื่น, ความสวย, Guided tour, เปิดได้ทันทีโดยไม่ต้องตั้งค่า*

### สิ่งที่ไม่อยู่ในขอบเขต (Out of scope)
- เชื่อมต่อ BMS / PMS / CCTV / LLM จริง
- Authentication, Database, Multi-user
- โมเดล 3D จาก CAD/BIM จริง (ยังใช้ massing แบบ procedural เหมือนต้นแบบ)
- มือถือ (< 768 px) — ใช้งานได้พื้นฐานเท่านั้น (รอยืนยันข้อ 13.12)

---

## 2. สิ่งที่พบจากไฟล์ต้นแบบ (สรุป)

| หัวข้อ | สิ่งที่พบ | ผลต่อการ Port |
|---|---|---|
| 3D Engine | **ไม่ได้ใช้ three.js** — เขียน WebGL1 + shader + matrix math เอง (class `PRMHospitalityScene`, ~240 บรรทัด) | ต้อง **เขียนใหม่** ด้วย three.js แต่ geometry เป็น procedural ทั้งหมด (box/quad/rounded shape) จึง map ได้ตรง |
| Rebuild | ทุกครั้งที่สลับ layer / mode / floor / สถานะห้อง → สร้าง geometry ใหม่ทั้งฉาก | three.js: สร้างครั้งเดียว แล้ว toggle `visible` / เปลี่ยน material แทน |
| Picking | Ray vs กล่อง 2 ใบ (tower, podium) → ได้แค่ระดับชั้น | ใช้ raycast ของ R3F → เลือกได้ถึง **ห้อง / อุปกรณ์** |
| UI | `innerHTML` template + `onAction` switch ~50 actions | แปลงเป็น React components + Zustand actions |
| State | `window.appState` global, scene อ่าน state ตรง | Zustand store กลาง, scene รับผ่าน selector |
| รูปภาพ | base64 JPEG 4 ไฟล์ (~968 KB) ใน `const ASSETS` | แตกออกเป็นไฟล์ใน `public/images/` และแปลงเป็น WebP |
| Chart | SVG sparkline เขียนเอง + CSS bar | ทำเป็น component `<Sparkline>`, `<SegmentBar>` (ไม่ต้องใช้ chart lib) |
| Font | ไม่ได้โหลด Inter, ภาษาไทยตกไปใช้ Tahoma | self-host Inter + IBM Plex Sans Thai (`next/font` หรือ `@fontsource`) |
| CSS | 2 ชั้นของ CSS ขัดกันเอง (L2–7 vs L11–36), sidebar ถูกบังคับเป็น icon-only ทุกขนาดจอ | รวม token เดียว, ออกแบบ breakpoint ใหม่ |
| หน้า Overview | เนื้อหาเหมือนหน้า Twin ทุกอย่าง ต่างแค่หัวข้อ | ออกแบบหน้า Overview ใหม่ให้เป็น executive dashboard จริง |
| Data bug | slider occupancy สุ่มห้องใหม่ทับการแก้ไขสถานะห้อง, `footfallFactor` ไม่เคยเปลี่ยน | แก้ใน data model ใหม่ |

---

## 3. Tech Stack

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Framework | **Next.js (รุ่นปัจจุบัน)** + TypeScript, Node 24 (เครื่องนี้ v24.22) | ตัดสินใจแล้ว (ข้อ 12.1) — pin version ทั้งชุด (React 19 / R3F v9 / drei / postprocessing) + commit lockfile |
| 3D | **three.js** + **@react-three/fiber** + **@react-three/drei** | เขียน 3D เป็น component, มี CameraControls / Html label / Instances / Environment พร้อมใช้ |
| 3D effects | **@react-three/postprocessing**: Bloom, SMAA, **N8AO** (ambient occlusion, ครึ่งความละเอียด), Vignette เล็กน้อย | AO + bloom ตอน dusk คือสิ่งที่ทำให้ massing ดูพรีเมียม — ปิดได้ในโหมด Low quality |
| Environment / แสง | ไฟล์ HDR เก็บใน `public/env/` หรือ `<Environment>` + `<Lightformer>` (ไม่ใช้ไฟล์) | **ห้ามใช้ `preset="city"` ฯลฯ ของ drei** เพราะโหลดจาก CDN → ออฟไลน์แล้วกระจกดำ (R10) |
| Camera tween | `camera-controls` (ผ่าน drei `<CameraControls>`) | บินกล้องไป preset แบบนุ่มนวล (แทน easing เขียนเอง) |
| State | **Zustand** | เบา, scene และ UI ใช้ store เดียวกันได้ |
| Styling | **Tailwind CSS v4** + CSS variables (design tokens) | เร็ว, คุม spacing/สีได้เป็นระบบ |
| Animation UI | **motion** (`motion/react`, ชื่อใหม่ของ Framer Motion) | เปลี่ยน view / panel / modal / tour — ใช้ motion tokens ร่วมกับกล้อง (ข้อ 6.5) |
| Chart | SVG component เขียนเอง (sparkline, segment bar, gauge) | ไม่ต้องเพิ่ม lib, คุมหน้าตาได้เต็มที่ |
| Icons | **lucide-react** + custom SVG เฉพาะ icon เฉพาะทาง (chiller, AHU) จากต้นแบบ | ดูข้อ 13.4 |
| Font | self-host: Inter + IBM Plex Sans Thai + JetBrains Mono; ไฟล์ `.woff`/`.ttf` ภาษาไทยใน `public/fonts/` สำหรับข้อความใน 3D | รองรับไทยสวย, ไม่มี external request |
| Deploy | **`next build` + `next start` บน localhost** (port 3000); บน server ใช้ **pm2** (`ecosystem.config.js`) | ไม่ต้องใช้ static export / `file://` — ดูข้อ 12.2 |

---

## 4. โครงสร้างโปรเจ็ค

```
prm-hospitality-twin/
├─ public/
│  ├─ images/                 # reference.webp, hero.webp, residence-plan.webp, social-plan.webp
│  ├─ env/                    # HDR ของ day / dusk (ถ้าไม่ใช้ Lightformer)
│  └─ fonts/                  # ฟอนต์ไทยสำหรับ drei <Text> / canvas texture ใน 3D
├─ src/
│  ├─ app/                    # Next.js App Router — หน้าเดียว (ข้อ 12.1)
│  │  ├─ layout.tsx           # fonts, metadata
│  │  ├─ page.tsx             # <AppShell /> (client component) — view อยู่ใน store, sync กับ ?view=
│  │  ├─ AppShell.tsx         # Header + Sidebar + KPI + <Viewport> — Canvas mount ครั้งเดียว ไม่ remount ตอนสลับ view
│  │  ├─ views/               # OverviewView, TwinView, IocView, EnergyView, HotelView, AiView (UI 2D ของแต่ละ view)
│  │  └─ globals.css          # design tokens (dark + projector)
│  │
│  ├─ components/
│  │  ├─ layout/              # Header (รวม PageHead), Sidebar, KpiStrip, KpiCard, RightPanel, BottomPanel, FooterBar(Timeline)
│  │  ├─ panels/              # AgentPanel, LayersPanel, AssetCard, EventList, WorkOrderList,
│  │  │                       # RoomGrid, DemandBreakdown, ScenarioLab, IncidentWorkflow, DataLineage
│  │  ├─ modals/              # Modal (base), Help, About, Reference, Methodology, Event, Room, AllRooms, AssetDetail, CctvFeed
│  │  ├─ charts/              # Sparkline, AreaChart, SegmentBar, ProgressBar, Gauge, StatTile
│  │  ├─ floorplan/           # FloorPlanExplorer, PlanStage (pan/zoom/pinch), PlanMarker, PlanDetails
│  │  ├─ tour/                # GuidedTour, TourStep, AttractMode
│  │  ├─ cctv/                # SyntheticFeed (canvas 2D)
│  │  └─ ui/                  # Button, Badge, Tabs, Segmented, Slider, Toast, Tooltip, Icon, StatusChip (สี + icon)
│  │
│  ├─ three/
│  │  ├─ Viewport.tsx         # <Canvas>, overlay UI (toolbar, floor selector, compass, hotspots), error boundary + fallback
│  │  ├─ SceneRoot.tsx        # รวมทุกส่วน, lights, environment, postprocessing
│  │  ├─ CameraRig.tsx        # CameraControls + presets (all/hotel/mall/plant/arrival/roof/floor)
│  │  ├─ look.ts              # tone mapping, exposure, day/dusk settings, สี 3D ที่ปรับหลัง tone mapping
│  │  ├─ materials.ts         # material palette กลาง (ivory, terracotta, facadeGlass, ...)
│  │  ├─ textures.ts          # canvas textures (sign, LED screen, road) — วาดหลัง document.fonts.ready
│  │  ├─ geometry/            # GeometryBuilder (port helper จากต้นแบบ) + exterior.ts, schematic.ts, site.ts — ดู docs/3D_PLAN.md ข้อ 2
│  │  ├─ site/                # Site (merged), Traffic (รถ + คน)
│  │  ├─ building/
│  │  │  ├─ ExteriorShell.tsx      # อาคารโหมด exterior (podium, หอคอยแบบ band, sky courts, crown)
│  │  │  ├─ SchematicBuilding.tsx  # podium 5 + tower ตาม floor schedule (x-ray / slice / explode)
│  │  │  ├─ FloorGroup.tsx         # slab, เสา, ห้อง (instanced, semantic zoom), เส้นกรอบเลือก
│  │  │  ├─ CentralPlant.tsx       # chillers (+ พัดลมหมุนเมื่อเปิด ambient)
│  │  │  └─ Fixed.tsx              # ArrivalCanopy, Skywalk, มุมขอบเขต site
│  │  ├─ picking/             # PickProxies (กล่องล่องหน ชั้น / ห้อง / อุปกรณ์), useSceneSelection
│  │  ├─ anim/                # useDamped (damp + invalidate จนนิ่ง)
│  │  ├─ layers/              # EnergyLayer (pipes + heat), SecurityLayer (cameras + cone), PeopleLayer (heatmap CanvasTexture), AssetLayer
│  │  ├─ hotspots/            # Hotspot (drei <Html>), HotspotSet
│  │  └─ hooks/               # useSceneMode, usePicking, useCapture
│  │
│  ├─ data/                   # *** Hard-code ทั้งหมดอยู่ที่นี่ ***
│  │  ├─ property.ts          # zones, floors, ขนาดอาคาร, ตำแหน่ง (หน่วยเมตร)
│  │  ├─ rooms.ts             # generator 600 ห้อง (seeded) ตาม floor schedule ใน property.ts
│  │  ├─ events.ts            # INC-001..003 + templates สำหรับ simulate
│  │  ├─ workOrders.ts
│  │  ├─ assets.ts            # site, hotel, plant, AHU-H12, chiller ... + metrics
│  │  ├─ energy.ts            # สูตร energy model + profile 24 ชม.
│  │  ├─ kpis.ts              # ค่าเริ่มต้น + sparkline series
│  │  ├─ views.ts             # ViewConfig ต่อ view: hero shot (camera, time of day, mode, layers, floor)
│  │  ├─ floorPlans.ts        # PLANS: residence / social + zones
│  │  ├─ tour.ts              # ขั้นของ tour (data-driven) + ชุด MVP / ชุดเต็ม / attract loop
│  │  ├─ aiScript.ts          # quick chips + rule-based answers + fallback (ไทย/อังกฤษ)
│  │  ├─ nav.ts               # NAV + TITLES
│  │  └─ copy.ts              # ข้อความ UI / disclaimer (รูปแบบ L10n)
│  │
│  ├─ store/
│  │  ├─ useAppStore.ts       # store เดียว รวม slices ด้านล่าง (selector derived ข้าม slice ได้ง่าย)
│  │  ├─ twinSlice.ts         # view, zone, mode, floor, layers, selection, night, explode, tour
│  │  ├─ simSlice.ts          # time, paused, occupancy, setpoint, outdoor, tariff, footfall, rooms, events, workOrders
│  │  ├─ useSimTicker.ts      # เจ้าของ tick (6 วิ), pause เมื่อ modal เปิด / แท็บซ่อน / paused
│  │  └─ selectors.ts         # counts(), energy(), openEvents() — derived values
│  │
│  ├─ lib/                    # format (fmt, timeStr), seededRandom, exportSnapshot, capturePng, motion.ts (motion tokens)
│  └─ types/                  # Room, FloorId, Zone, Asset, Incident, WorkOrder, EnergyResult, PlanZone, ViewId, ViewConfig, TourStep, L10n
└─ docs/PLAN.md
```

**หลักการแยก:**
- `data/` = ข้อมูลล้วน (ไม่มี React) → วันหนึ่งเปลี่ยนเป็น API ได้โดยแก้แค่ชั้นนี้
- `store/` = state + action ที่เปลี่ยนข้อมูล
- `three/` = แสดงผล 3D เท่านั้น อ่านจาก store ไม่เขียน DOM เอง — ค่าที่เปลี่ยนบ่อยอ่านแบบ transient (`getState()` ใน `useFrame` / `subscribe`) ไม่ใช่ผ่าน re-render
- `components/` = UI 2D — subscribe ด้วย selector แคบ + `useShallow`
- **Store คือ source of truth เดียว** ของ view / กล้อง / mode / floor: เปลี่ยนผ่าน action `setView(viewId, overrides?)` เท่านั้น ซึ่งอ่านค่าเริ่มต้นจาก `data/views.ts`; URL (ถ้ามี) แค่สะท้อน state → Tour, ปุ่ม Back และการ mount ไม่แย่งกันคุมกล้อง (R2)
- ไฟล์ต้นแบบย้ายไป `reference/PRM_Hospitality_DigitalTwin_example.html` ใน Phase 0; โปรเจ็ค Next.js อยู่ที่ root ของ repo นี้ (ข้อ 13.9)

---

## 5. หน้าและเนื้อหา (Information Architecture)

Layout ร่วม: **Header (รวม PageHead) → Sidebar → KPI strip → [Viewport 3D | Right Panel] → Bottom Panel → Footer timeline**

| View (`ViewId`) | ชื่อ | Viewport (hero shot ใน `views.ts`) | Right panel | Bottom panel |
|---|---|---|---|---|
| `overview` | Executive Intelligence | 3D exterior, **dusk**, auto-rotate | **ใหม่:** สรุปธุรกิจ 2 ฝั่ง (Hotel / Mall), Priority events top 3, Intelligence brief | **ใหม่:** Energy profile 24h + Occupancy trend + Footfall by zone |
| `twin` | Digital Twin Command Center | 3D เต็มรูปแบบ, day | Tabs: AI Agent / Layers & Asset inspector | (ซ่อน, เปิดด้วย "แสดงกราฟ") |
| `ioc` | Integrated Operations Center | 3D + CCTV overlay 2 จอ | Incident workspace, Work orders | Incident workflow (**แสดง step ตามเหตุการณ์ที่เลือก**) |
| `energy` | Energy Optimization Lab | 3D exterior + Energy layer, focus plant | Demand breakdown, nudge setpoint 25°C | What-if Scenario Lab (sliders + ผลต่าง % / ฿) |
| `hotel` | Hotel Operations · 600 Keys | 3D slice ไปที่ชั้นที่เลือก (ค่าเริ่มต้น H12) | Room stats + Room grid ตามชั้น (28 หรือ 17 ห้อง; ชั้น sky court / roof แสดง amenity) | Inventory 600 ห้อง (stacked bar) |
| `ai` | Ask the Building | 3D | AI Agent (chat + quick chips) | Data lineage |

**หน้าแรก (landing):** `overview` ตอน dusk + auto-rotate — ให้ภาพแรกที่ผู้บริหารเห็นสวยที่สุด (รอยืนยันข้อ 13.16)

**Spatial switch:** "อาคาร 3D" ↔ "Floor Plan" (Interior Atlas: Residences / Social floor) — ใช้ได้ทุก view

**Modals:** Help, Model notes, Reference, Methodology, Event detail, Room detail, All 600 rooms, Asset detail, CCTV feed

**Guided Tour ("เริ่มสาธิต"):** data-driven (`data/tour.ts`) — แต่ละขั้นมี `view`, camera, `actions[]`, `highlight`
- **ชุด MVP (4 ขั้น):** twin → twin (x-ray) → energy → hotel (H12)
- **ชุดเต็ม (6 ขั้น):** twin → twin (x-ray) → ioc → energy → hotel (H12) → ai
- ไม่มีขั้นที่เป็น placeholder ระหว่าง Demo — เพิ่มขั้นเมื่อ view นั้นเสร็จจริงเท่านั้น

**Attract mode:** ไม่มีการใช้งานเกิน N นาที (ค่าเริ่มต้น 2) → เล่น tour วนเองแบบ auto-rotate, แตะ/กดปุ่มใดก็ได้เพื่อออก (สำหรับบูธ / งาน event)

**AI Assistant:** ตอบจาก rule-based script; ถ้าไม่ตรงกฎข้อใด → คำตอบ fallback ที่ชวนกลับไปใช้ quick chips; ใน presentation mode แสดงเฉพาะ chips (ไม่ให้พิมพ์เอง)

---

## 6. แผนฉาก 3D

> รายละเอียดการสร้าง (อ้างอิงโค้ดต้นแบบรายบรรทัด), การคลิก / การแสดงผล และการเคลื่อนไหวของกล้อง / โหมด อยู่ใน **`docs/3D_PLAN.md`** — ข้อนี้เป็นภาพรวม

### 6.1 ระบบพิกัดและสัดส่วน
- ใช้ **1 unit = 1 เมตร** (ต้นแบบใช้หน่วยลอยๆ) และเก็บขนาดทั้งหมดใน `data/property.ts`

| ส่วน | ขนาดโดยประมาณ (ปรับจากต้นแบบ) |
|---|---|
| Site plinth | 220 × 150 m |
| Retail podium | 85 × 49 m, 5 ชั้น (G, L1–L4) × 5.2 m |
| Hotel tower | 44 × 28 m, ชั้นละ 4.15 m เริ่มที่ y 29; exterior: ชั้นห้องพัก 19 ชั้น + ชั้นแคบ 23 × 25 m อีก 4 ชั้น, **sky court สูง 2 ชั้น** ที่ชั้น 8–9 / 16–17 / 24–25, ชั้น 30 เป็น roof terrace — ข้อมูลห้องใช้ **floor schedule ตามรูปนี้**: 19 ชั้น × 28 ห้อง + 4 ชั้นแคบ × 17 ห้อง = 600 (3D_PLAN ข้อ 8) |
| Crown / roof terrace | สูงประมาณ 153–161 m |
| Central plant | ที่ (56, -20), chiller 3 ตัว |
| Skywalk | x ≈ -83 |

### 6.2 Scene graph
ต้นแบบมี **อาคาร 2 ชุด**: ชุด exterior (envelope โค้งมน + sky court + crown) และชุด schematic (กล่องตรงต่อชั้น) ที่ใช้ใน x-ray / slice / explode → แยกเป็น 2 component แต่สร้างจาก floor schedule เดียวกัน

```
<SceneRoot>  (canvas ทึบ — background + fog อยู่ในฉาก)
 ├ <Look>               ไฟ + static shadow map + Environment (day / dusk — ไฟล์ใน public/env หรือ Lightformer) + fog
 ├ <Site>               merged: plinth, ถนน, ต้นไม้ (instanced), ตึกบริบท | <Traffic> รถ + คน
 ├ <ExteriorShell>      merged ก้อนเดียวต่อ material — โหมด exterior, fade ออกเมื่อเปลี่ยนโหมด
 ├ <SchematicBuilding>  podium 5 ชั้น + tower ตาม floor schedule
 │   └ <FloorGroup>     slab, เสา, ห้อง (InstancedMesh, สีตามสถานะ, semantic zoom) — ขยับเมื่อ explode
 ├ <Fixed>              ArrivalCanopy, Skywalk, CentralPlant
 ├ <Layers>             Energy | Security | People | Assets  (toggle visible)
 ├ <PickProxies>        กล่องล่องหน ชั้น / ห้อง / อุปกรณ์ (ใช้ raycast แทน geometry จริง)
 ├ <Hotspots>           drei <Html> 6 จุด (occlude กับ proxy)
 ├ <CameraRig>          CameraControls + presets + auto-rotate
 └ <Effects>            N8AO, Bloom (เฉพาะ emissive), SMAA
```

### 6.3 โหมดการแสดงผล
| โหมด | พฤติกรรม |
|---|---|
| Exterior | facade ทึบ, กระจกสะท้อน environment, sky garden |
| X-ray | crossfade จาก ExteriorShell ไปอาคาร schematic (shell โปร่ง + slab + ห้อง + ท่อ) แบบต้นแบบ |
| Slice | ชั้นเหนือชั้นที่เลือกลอยขึ้นและจางหาย, กล้องบินไปมุมเฉียงด้านบน |
| Explode | แยกชั้นออก (tower 1.55 m/ชั้น, podium 2.0 m/ชั้น ตามต้นแบบ; damp + stagger, ไม่ rebuild) |
| Day / Dusk | lerp 1.2 วินาที: environment, แสง, fog, ไฟหน้าต่าง emissive + bloom |

### 6.4 การโต้ตอบ (ปรับปรุงจากต้นแบบ)
- ตารางการโต้ตอบเต็ม (ตามโหมด, เมาส์ / touch / คีย์บอร์ด) อยู่ใน 3D_PLAN ข้อ 5.1
- Hover → highlight ชั้น หรือห้อง (เส้นกรอบเรืองแสง / emissive — ไม่ใช้ postprocessing `<Outline>` เพราะแพงและไม่เข้ากับ `frameloop="demand"`) + tooltip
- Click ชั้น → เลือกชั้น (sync กับ floor selector + right panel); **double-click / แตะซ้ำ** → เข้า slice ชั้นนั้น
- Drag แล้วปล่อยไม่นับเป็น click (`event.delta > 4 px`)
- **ใหม่:** Click ห้อง (ในโหมด slice) → เปิด Room modal
- **ใหม่:** Click อุปกรณ์ (chiller, AHU, กล้อง) → Asset card
- Event "Locate in 3D" → บินกล้องไปจุดเกิดเหตุ + pulse marker สีแดง
- Toolbar: home, auto-rotate, explode, day/dusk, zoom ±, presentation mode, capture PNG
- Capture PNG: สั่ง render ใหม่ก่อน `toDataURL` (หรือ `preserveDrawingBuffer`) ไม่งั้นได้ภาพดำ

### 6.5 ความสวยงาม

**Core look — งานหลัก ห้ามตัด (Phase 1 + 5)**
- **Tone mapping + color grade** (AgX หรือ ACES) + exposure ต่อ day/dusk กำหนดใน `three/look.ts`
- **Environment ที่เก็บในเครื่อง** (ข้อ 3) — กระจกสะท้อนท้องฟ้าจริง
- **Material palette:** `MeshStandardMaterial` / `MeshPhysicalMaterial` (กระจก) โทนสี ivory + terracotta + glass เดิม
- **Ambient Occlusion:** N8AO ครึ่งความละเอียด (ปิดได้ใน Low quality) — หรือ bake AO ลง vertex color ตอนโหลดครั้งเดียว เพราะ geometry ไม่เปลี่ยน
- **เงา:** directional shadow map แบบ static (`shadowMap.autoUpdate = false`, update เมื่อโหมด / explode เปลี่ยน) — หอคอยสูง 161 m ต้องทอดเงาข้ามลาน ซึ่ง `ContactShadows` ทำไม่ได้; ไม่ใช้ `AccumulativeShadows`
- **Dusk:** ไฟหน้าต่าง emissive (seeded ตาม occupancy) + bloom — ใช้เป็นภาพหลักของ Overview
- **Hero shot ต่อ view:** camera, เวลา, layer ใน `data/views.ts` — screenshot ของ hero shot คือเกณฑ์อนุมัติดีไซน์ (ต้อง *สวยกว่า* baseline ของต้นแบบ ไม่ใช่แค่เหมือน)
- **Motion tokens** (`lib/motion.ts`): duration / easing ชุดเดียว ใช้ทั้ง CameraControls และ `motion` — panel เลื่อนเข้าพร้อมกับกล้องที่บินถึงจุด
- **สี 3D:** สีสถานะห้องใน 3D ปรับหลัง tone mapping ให้ *ดู* ตรงกับ token 2D (กำหนดแยกใน `look.ts`) และใช้ความสว่างต่างกันด้วย ไม่ใช่แค่ hue

**Effects — stretch ตัดได้ทีละรายการ (Phase 9)**
- Energy layer: ท่อเรืองแสงไหล (dashed line animate offset) + heat gradient ต่อชั้น
- People layer: heatmap จาก canvas 2D (gaussian blob) → `CanvasTexture` บน plane ต่อชั้น
- Security layer: กล้อง + กรวยมุมมองโปร่งแสง
- Intro animation: อาคาร "ก่อตัว" ทีละชั้น (CONSTRUCTING SPATIAL TWIN) — **กดข้ามได้**, ปิดอัตโนมัติเมื่อ `prefers-reduced-motion`

### 6.6 Performance
- `InstancedMesh` / `<Instances>` สำหรับ fins, panels, ต้นไม้, รถ, คน, ห้อง (600)
- Merge geometry ที่ไม่เปลี่ยน (site, context towers) ด้วย `BufferGeometryUtils.mergeGeometries`
- `frameloop="demand"` + `invalidate()` เมื่อ state เปลี่ยน (ยกเว้นตอน auto-rotate / animation)
- DPR `[1, 1.75]`, `PerformanceMonitor` ลดคุณภาพอัตโนมัติ (ลำดับการตัด: N8AO → shadow → bloom → DPR)
- Canvas mount ครั้งเดียวใน `AppShell` → ไม่ remount เมื่อสลับ view
- โหลด 3D แบบ lazy (`dynamic(..., { ssr: false })`)
- `<Canvas gl={{ powerPreference: 'high-performance' }}>` + ตั้ง Windows Graphics settings ให้ browser ใช้ GPU แยก (R16)
- Error boundary รอบ Canvas + จับ `webglcontextlost` → แสดงภาพนิ่ง `hero.webp` + ปุ่ม "โหลดฉากใหม่" (Demo ห้ามจอดำ)
- **Budget:** draw calls ≤ 300, triangles ≤ 1M, texture memory ≤ 150 MB — ตรวจด้วย `renderer.info` / r3f-perf ระหว่างพัฒนา
- เป้า: **≥ 50 fps บนเครื่อง Demo (ข้อ 13.14: Ryzen 7 7840HS + RTX 4060 Laptop) โดยเปิด Core look ครบ, โหลดแรก < 3 วินาที** — วัดตั้งแต่ Phase 1 ทั้งบน RTX 4060 และบน Radeon 780M (กรณีเลวร้าย: browser เลือก GPU ในตัว)

---

## 7. Data Model (Hard-code)

```ts
type L10n = { th: string; en?: string };                          // ใช้รูปแบบเดียวทุกข้อความ (copy, incident, tour, ai)

type FloorId = 'G' | 'L1' | 'L2' | 'L3' | 'L4' | `H${string}`;   // H01–H30 — id ชั้นแบบเดียวทั้งระบบ
type RoomStatus = 'occupied' | 'ready' | 'cleaning' | 'maintenance';
type FloorType = 'retail' | 'guest' | 'guestNarrow' | 'skyCourt' | 'roof';
interface FloorSpec { id: FloorId; type: FloorType; y: number; height: number; footprint: { x: number; z: number; w: number; d: number }; rooms: number; }
interface Room { id: string; floor: FloorId; index: number; status: RoomStatus; type: 'Deluxe' | 'Premier' | 'Suite'; }   // id เช่น 'H12-07'

type IncidentType = 'security' | 'ahu' | 'plant' | 'leak' | 'people';
interface Incident {
  id: string; title: L10n; location: string; floor?: FloorId;
  position: [number, number, number];          // ใหม่: พิกัด 3D สำหรับ Locate
  priority: 'high' | 'medium' | 'low'; type: IncidentType;
  status: 0 | 1 | 2 | 3;                         // Detected → Verified → Dispatched → Resolved
  time: string; owner: string; assetCode: string;
}
interface WorkOrder { id: string; assetCode: string; owner: string; status: 'Assigned' | 'Completed'; incidentId?: string; time: string; }

interface Asset { id: 'site' | 'hotel' | 'plant' | 'ahu' | string; name: string; code: string;
  metrics: { label: string; value: string | number; unit?: string; status?: 'ok' | 'warn' | 'alert' }[]; health: number; position: [number, number, number]; }

interface EnergyInput  { occupancy: number; setpoint: number; outdoor: number; tariff: number; footfallFactor: number; operatingHours: number; }
interface EnergyResult { base: number; current: number; saved: number; hotel: number; mall: number; savingPct: number; dayKwh: number; dayCost: number; }

type ViewId = 'overview' | 'twin' | 'ioc' | 'energy' | 'hotel' | 'ai';
interface ViewConfig { id: ViewId; title: L10n; camera: CameraPreset; timeOfDay: 'day' | 'dusk'; mode: SceneMode; layers: LayerId[]; floor?: FloorId; autoRotate?: boolean; }

interface PlanZone { id: string; name: string; sub: string; x: number; y: number; desc: string; ideas: string[]; }
interface TourStep { view: ViewId; title: L10n; body: L10n; camera?: CameraPreset; mode?: SceneMode; floor?: FloorId; actions?: TourAction[]; highlight?: string; }
```

**ค่าเริ่มต้น (คงตามต้นแบบ):** Occupancy 84% (504/600), Demand 2,616 kW, Footfall 27,840, Open incidents 3 (high 1), เวลา 14:30, setpoint 24°C, outdoor 32°C, tariff 4.5 ฿/kWh

**แก้ไขจากต้นแบบ:**
- **Floor schedule** (`FloorSpec[]` ใน `property.ts`) ตามรูปอาคารจริง: H01–07, H10–15, H18–23 = `guest` 28 ห้อง; H08–09, H16–17, H24–25 = `skyCourt`; H26–29 = `guestNarrow` 17 ห้อง; H30 = `roof` → รวม 600 ห้อง (ต้นแบบใช้ 30 × 20 ซึ่งไม่ตรงกับรูป) — 3D, pick proxy, room grid และ hotspot อ่านจากตารางนี้ทั้งหมด
- slider occupancy → ปรับเฉพาะส่วนต่าง ไม่สุ่ม 600 ห้องใหม่ (การแก้สถานะห้องไม่หาย)
- footfall จาก timeline → มีผลกับ mall cooling load จริง โดย `footfallFactor = footfall / 27,840` (ค่าเริ่มต้น = 1.0 → Demand ที่ t0 = 1,140 + 900×0.84 + 720 = **2,616 kW** พอดี; มี unit test ยืนยัน) — หมายเหตุ: Demand จะขยับตาม tick (+23 คน / 6 วิ) ซึ่งเป็นพฤติกรรมที่ตั้งใจ
- KPI ทุกตัว derive จาก store เดียว (ไม่คำนวณซ้ำ 2 ที่)
- Seeded random ทั้งหมด → เปิดกี่ครั้งก็ได้ภาพ/ตัวเลขเหมือนเดิม (สำคัญสำหรับ Demo)
- Data validation: ใช้ type เข้ม + `satisfies` ใน `data/*.ts` และ test ว่า id ไม่ซ้ำ, `position` อยู่ในขอบเขต site

---

## 8. Design System

| Token | ค่า |
|---|---|
| `--bg` | `#070d16` |
| `--panel` / `--panel-2` | `#0d1725` / `#111e2d` |
| `--line` | `#203247` |
| `--text` / `--muted` | `#eaf1f8` / `#8295ac` |
| `--accent` (cyan) | `#6ce4df` |
| `--blue` / `--gold` / `--red` / `--green` | `#7eb7ff` / `#dfbd7e` / `#ff7c81` / `#69d7a8` |
| Room status | occupied=green, ready=blue, cleaning=gold, maintenance=red — **ทุกที่ใน 2D แสดงคู่กับ icon** (`StatusChip`) เพื่อคนตาบอดสีแดง-เขียว; สีใน 3D ดูข้อ 6.5 |
| Radius | 6 (ปุ่ม) / 10 (card) / 14 (modal) |
| Type scale | 12 (เฉพาะตัวเลข / label อังกฤษ) / **14 (base)** / 16 / 22 (H1) / 30 (KPI) — ข้อความไทยไม่ต่ำกว่า 13 px, line-height ไทย 1.6 |
| Spacing | ระบบ 4px |
| Font | Inter (ละติน), IBM Plex Sans Thai (ไทย), JetBrains Mono (รหัส asset) |
| Theme | Dark navy (หลัก) + Floor plan ใช้ธีม "paper" สีอ่อน |
| **Projector tokens** | ใช้ใน presentation mode: `--line` / `--muted` / `--panel` สว่างขึ้น (contrast สูงขึ้น) เพราะส่วนมืดบนโปรเจคเตอร์กลายเป็นเทาหม่น และ type scale × 1.15 |

**สัดส่วน Layout (Desktop ≥ 1440px):**
```
┌──────────── Header + PageHead 64px ─────────────────────────┐
│Side│ KPI strip ×4 (สูง ~72px)                                │
│bar │ ┌──────────── Viewport 3D (flex 1) ──────────┐┌Right───┐│
│ 72 │ │                                            ││ 340px  ││
│ /  │ │                                            ││        ││
│220 │ └────────────────────────────────────────────┘└────────┘│
│    │ Bottom panel (collapsible, ~180px)                      │
│    │ Footer timeline 40px                                    │
└────┴─────────────────────────────────────────────────────────┘
```
- **Viewport 3D ต้องได้ ≥ 60% ของความสูงจอเสมอ** — จุดขายของ Demo
- จอสูง < 900 px (เช่น 1280×720): Bottom panel พับเป็นค่าเริ่มต้น และ KPI strip กลายเป็นแถบลอยโปร่งบนขอบบนของ viewport
- Sidebar: ≥1440 แบบเต็ม 220px (แสดง Property Explorer ที่ต้นแบบซ่อนไว้), ≥1024 แบบ icon 72px
- < 1024: Right panel เป็น drawer, < 768: sidebar เป็น bottom tab bar, KPI 2 คอลัมน์ — *ไม่อยู่ใน MVP*
- ต้องทดสอบที่ **1920×1200** (จอ laptop Demo), **1920×1080** (จอนอก / โปรเจคเตอร์) และ **1280×720**
- Presentation mode: ซ่อน chrome ทั้งหมด เหลือ 3D + hotspot + projector tokens
- Badge "SIMULATED DEMO": เล็ก มุมบน ไม่ซ่อน แต่ไม่แย่งสายตาจากภาพ

### 8.1 Demo controls
- **Reset Demo** (ปุ่ม + คีย์ `R`): คืน state ทั้งหมดกลับค่าเริ่มต้น (seeded) ใน 1 คลิก — ใช้หลังลูกค้าลองเล่นเอง
- **Keyboard / wireless clicker:** `←` / `→` (และ PageUp/PageDown ของ clicker) เลื่อน tour, `P` presentation mode, `Esc` ปิด modal/tour
- **Attract mode** (ข้อ 5) เปิด/ปิดได้ในเมนู Help
- `prefers-reduced-motion` + a11y ขั้นต่ำ (focus ring, focus trap ใน modal) ทำตั้งแต่ UI kit

---

## 9. ขั้นตอนการทำงาน (Phases)

ทำ **ส่วนที่เสี่ยงที่สุดก่อน** (การรันแบบไม่ใช้เน็ต, 3D + look) แล้วทำทีละ view ให้จบทั้ง 3D และ UI (vertical slice) — แต่ละ view ที่เสร็จ demo ได้ทันที

**Gate 0 — ✅ ผ่านแล้ว (2026-10-26):** localhost / pm2 · root ของ repo นี้ · Next.js + three.js · เครื่องที่รันโปรเจ็ค · ผู้อนุมัติดีไซน์คือเจ้าของโปรเจ็ค (ข้อ 13)

| Phase | งาน | Definition of Done | ประมาณ |
|---|---|---|---|
| **0. Setup** | ย้ายต้นแบบไป `reference/`, สร้าง Next.js ที่ root + pin version, ESLint/Prettier, fonts self-host, แตกรูป base64 → WebP, เตรียม environment ที่ไม่ต้องใช้เน็ต, `ecosystem.config.js` (pm2), **`next build && next start` แล้วเปิด localhost:3000 โดยปิด Wi-Fi**, ตั้งให้ browser ใช้ RTX 4060, เก็บ **screenshot baseline** ของต้นแบบไว้ที่ `reference/screens/`, CI | localhost เปิดได้โดยไม่มีเน็ต, font ไทยถูกต้อง, CI เขียว | 1 วัน |
| **1. 3D Spike + Look-dev** | Canvas, CameraControls + presets, RetailPodium + HotelTower (exterior), **Core look ครบ** (tone mapping, environment, material, AO, shadow, dusk + bloom) | วัด fps **จากภาพจริง** บนเครื่อง Demo ≥ 50; hero shot overview (dusk) + twin (day) **ผ่านการอนุมัติดีไซน์รอบ 1** | 2 วัน · ✅ เสร็จ · อนุมัติดีไซน์รอบ 1 แล้ว (2026-10-26) — ดู 3D_PLAN ข้อ 9 |
| **2. UI Mock** | mock 2 หน้าจอ (Twin, Overview) × 2 ขนาด (1920, 1280×720) — Figma หรือ HTML static ใช้ token จริง | **ผ่านการอนุมัติดีไซน์** ก่อนเริ่ม Phase 4 | 1 วัน · ✅ ทำแล้ว — HTML จริงที่ `/mock/twin`, `/mock/overview` (ใช้ token + ฉาก 3D จริง), ภาพที่ `docs/screens/phase2/` · อนุมัติดีไซน์แล้ว (2026-10-26) |
| **3. Data & Store** | ย้ายข้อมูลเข้า `data/` (รวม `views.ts`, `tour.ts`), types, store (slices), selectors, sim ticker + unit test | ค่า KPI ตรงกับต้นแบบ (84% / 2,616 kW / 27,840 / 3) | 1 วัน |
| **4. App Shell** | Header, Sidebar, KPI strip + Sparkline, RightPanel tabs, BottomPanel, Footer timeline, Modal, Toast, `setView` 6 view, motion tokens, Reset Demo + keyboard | สลับ view ได้ครบที่ 1920×1200 / 1920×1080 / 1280×720 ตาม mock, viewport ≥ 60% | 1.5 วัน |
| **5. Twin (vertical slice)** | Site ครบ, โหมด X-ray / Slice / Explode / Day-Dusk, เลือกชั้น / ห้อง / asset, hotspots, layers (แบบพื้นฐาน), toolbar + **presentation mode**, capture PNG, right panel + Room modal | view Twin demo ได้จริง; **อนุมัติดีไซน์รอบ 2** | 4 วัน |
| **6. Hotel → Energy → Tour MVP** | view Hotel (slice H12, room grid, inventory), Energy Lab (layer + scenario), **Tour ชุด MVP 4 ขั้น**, **ซ้อม Demo บนเครื่องจริง** (0.5 วัน) | **MVP:** Demo จบได้ในคลิกเดียว ไม่มี placeholder | 4 วัน |
| **7. IOC → AI → Overview** | IOC + CCTV SyntheticFeed + incident workflow + Locate in 3D, AI chat rule-based + fallback + data lineage, Overview ใหม่, modals ที่เหลือ, **Tour ชุดเต็ม 6 ขั้น** | ทุก flow ในต้นแบบทำงาน | 3.5 วัน |
| **8. Floor Plan** | Interior Atlas: pan/zoom/**pinch**, markers, zone details | ใช้ได้บน iPad | 1 วัน |
| **9. Effects & Polish (stretch)** | Effects ในข้อ 6.5, attract mode (0.5 วัน), transitions เพิ่มเติม, responsive < 1024 | ตัดได้ทีละรายการ | 2.5–3.5 วัน |
| **10. QA & Run** | ทดสอบ Chrome/Edge (+ Safari/iPad ถ้าเปิดผ่าน server) บน **เครื่อง Demo**, Playwright smoke test, performance budget, ทดสอบรันด้วย pm2 + เอกสารวิธีรัน (`README`) | `npm run build && npm start` และ pm2 รันได้, ผ่าน Demo checklist | 1.5 วัน |
| | | **รวมประมาณ** | **~23–24 วัน** (+ buffer 15% ≈ **26–28 วันทำงาน**) |

**MVP สำหรับ Demo แรก:** Phase 0 → 6 (≈ 14.5 วัน) — Twin + Hotel + Energy + Tour 4 ขั้น บนเครื่อง Demo (1920×1200 + จอนอก 1920×1080) พร้อม Core look ครบ, ไม่มี Effects / responsive

---

## 10. ความเสี่ยง

| # | ความเสี่ยง | การรับมือ |
|---|---|---|
| R1 | ~~Next static export เปิดผ่าน `file://` ไม่ได้~~ — **ปิดแล้ว:** รันด้วย `next start` บน localhost / pm2 ไม่ต้องเปิดผ่าน `file://` | ทดสอบรันโดยปิดเน็ตใน Phase 0 |
| R2 | การเปลี่ยน view แย่งกับ Tour + กล้อง (mount ตั้งกล้องเอง, ปุ่ม Back ทำให้ state เพี้ยน) | store เป็น source of truth เดียว ผ่าน `setView()` (ข้อ 4) |
| R3 | Port 3D จาก WebGL เขียนเองไป three.js ใช้เวลามากกว่าที่คิด | Spike + look-dev ใน Phase 1, ทำ exterior ก่อน, ใช้ขนาดจากต้นแบบตรงๆ, Effects เป็น stretch |
| R4 | ไม่มีเกณฑ์วัด "สวย / เหมือนต้นแบบ" | screenshot baseline (Phase 0) + hero shot + อนุมัติดีไซน์ 2 รอบ (Phase 1, 5) |
| R5 | Sim tick / ลาก slider ทำให้ทั้ง UI และฉาก re-render → fps ตก | selector แคบ + `useShallow`, ฝั่ง 3D อ่าน store แบบ transient |
| R6 | WebGL context lost / GPU ไม่รองรับ → จอดำต่อหน้าลูกค้า | Error boundary + fallback ภาพนิ่ง + ปุ่มโหลดฉากใหม่ (ข้อ 6.6) |
| R7 | แก้ footfall ให้มีผลแล้ว KPI เริ่มต้นไม่ตรงต้นแบบ | `footfallFactor = footfall / 27,840` + unit test ค่าที่ t0 (ข้อ 7) |
| R8 | เครื่องที่เปิดดูผ่าน server (pm2) ไม่มี GPU แยก | PerformanceMonitor + ลำดับการตัดคุณภาพ (ข้อ 6.6), วัดบน Radeon 780M ด้วยใน Phase 1 |
| R9 | Version ของ React 19 / R3F v9 / drei / postprocessing ไม่เข้าชุดกัน | pin version + lockfile ใน Phase 0 |
| R10 | Wi-Fi หน้างานไม่ดี — **drei `Environment preset` และ `<Text>` โหลด HDR / font จาก CDN โดยค่าเริ่มต้น**; `next/font/google` ต้องใช้เน็ตตอน build | environment + font ทุกไฟล์อยู่ใน `public/` (หรือ `@fontsource`), build ล่วงหน้าตอนมีเน็ต, ทดสอบรันโดยปิดเน็ตใน Phase 0 และ 10 |
| R11 | ลิขสิทธิ์รูป 4 รูปใน `ASSETS` ถ้าเปิดผ่าน server ให้คนภายนอกเข้าถึง | ยืนยันที่มา (ข้อ 13.15); server ภายในหรือมี password |
| R12 | ลูกค้าเข้าใจผิดว่าเป็นระบบจริง | badge "SIMULATED DEMO" ทุกหน้า (เล็กแต่ไม่ซ่อน) + disclaimer |
| R13 | ที่ 1280×720 chrome กินพื้นที่จน 3D เหลือ ~300 px | กฎ viewport ≥ 60%, Bottom panel พับ, KPI ลอย (ข้อ 8) |
| R14 | ลูกค้าพิมพ์คำถามเองใน AI แล้ว rule-based ตอบผิด → ดูไม่จริง | fallback ชวนกลับไปที่ quick chips, presentation mode ใช้ได้แค่ chips (ข้อ 5) |
| R15 | สีสถานะเพี้ยนใน 3D (tone mapping / bloom) และคนตาบอดสีแยกแดง-เขียวไม่ออก | สี 3D ปรับแยกใน `look.ts` + ใช้ความสว่างต่างกัน, 2D แสดงคู่กับ icon |
| R16 | เครื่อง Demo มี GPU 2 ตัว (Radeon 780M + RTX 4060) — browser อาจเลือก GPU ในตัว ทำให้ fps ตก; เสียบไฟ / ถอดไฟก็มีผล | `powerPreference: 'high-performance'`, ตั้ง Windows Settings → Graphics ให้ Chrome/Edge ใช้ High performance, ตรวจที่ `chrome://gpu` ใน Demo checklist, เสียบไฟตอน Demo |

---

## 11. การทดสอบและ Demo Readiness

- **Unit test (Vitest):** สูตร energy (ค่าที่ t0 = 2,616 kW), selectors, room generator (seed คงที่ → 504/600 occupied), data validation (id ไม่ซ้ำ, position ในขอบเขต), tour/views config อ้าง `ViewId` ที่มีจริง
- **Playwright smoke test:** เปิดครบ 6 view, เล่น tour จบ (ชุด MVP และชุดเต็ม), Reset Demo, เปิด/ปิด modal หลัก, เทียบ screenshot hero shot (tolerance สูงสำหรับ 3D)
- **CI (GitHub Actions):** lint + typecheck + test + build ทุก push
- **Demo checklist (ก่อนออกงานทุกครั้ง):** เสียบไฟ, `npm start` (หรือ pm2) แล้วเปิด localhost:3000 โดยปิดเน็ต, เช็คว่า browser ใช้ RTX 4060 (`chrome://gpu`), เช็ค fps, ทดสอบ clicker, ทดสอบ attract mode, Reset Demo
- **Demo script / talk track:** เอกสารว่าแต่ละขั้นของ tour พูดอะไร — ข้อความใน `data/tour.ts` ต้องสอดคล้อง

---

## 12. สถาปัตยกรรม (ตัดสินใจแล้วใน Gate 0)

### 12.1 Framework / Routing — ✅ Next.js หน้าเดียว
- **Next.js (App Router) + three.js / R3F** ตามที่กำหนด (ข้อ 13.10)
- **หน้าเดียว `/`** + `view` ใน store, sync ไป `?view=` ด้วย `history.replaceState` → Canvas ไม่ remount, Tour คุมง่าย, deep link ได้ (แก้ R2)
- ทางเลือกที่ไม่เลือก: Vite single-file (ไม่ใช่ Next.js), Next.js 6 routes (ต้องจัดการ R2 เพิ่ม และไม่ได้ประโยชน์เพิ่มเพราะไม่มี SEO / SSR)

### 12.2 การรัน — ✅ localhost / pm2
- **Demo บนเครื่องนี้:** `npm ci && npm run build` (ตอนมีเน็ต) → `npm start` → เปิด `http://localhost:3000` (ไม่ต้องใช้เน็ตตอนรัน)
- **บน server:** pm2 ผ่าน `ecosystem.config.js` (เช่น `pm2 start ecosystem.config.js` รัน `next start -p 3000`) + `pm2 save` / `pm2 startup` ให้รันใหม่อัตโนมัติ
- ไม่ใช้ static export / `file://` / portable server / Electron

### 12.3 ทางเลือกด้านภาพ (อนาคต)
- **ตัวอาคารเป็น GLB จาก Blender** (low-poly massing + bake AO / lightmap — ยังไม่ใช่ BIM): ภาพดีขึ้นมาก แต่ต้องมี 3D artist → พิจารณาสำหรับ Demo รอบถัดไป; รอบนี้ใช้ procedural + AO
- Theatre.js สำหรับ camera path แบบ authored: ไม่จำเป็นในรอบนี้

---

## 13. คำถาม / การตัดสินใจ

### ตัดสินใจแล้ว (2026-10-26)

| # | เรื่อง | คำตอบ |
|---|---|---|
| 8 | Deploy | รันบน **localhost**; ถ้ารันบน server ใช้ **pm2** |
| 9 | ตำแหน่งโปรเจ็ค | **root ของ repo นี้**; ย้ายไฟล์ต้นแบบไป `reference/` |
| 10 | Framework | **Next.js + three.js** (หน้าเดียว, ข้อ 12.1) |
| 14 | เครื่อง Demo | **เครื่องที่รันโปรเจ็ค:** AMD Ryzen 7 7840HS, RAM 16 GB, GPU คู่ Radeon 780M (ในตัว) + **NVIDIA RTX 4060 Laptop**, จอ 1920×1200 144 Hz + จอนอก 1920×1080, Windows 11, Node 24 — ดู R16 |
| 17 | ผู้อนุมัติดีไซน์ | **เจ้าของโปรเจ็ค** (ผู้ตอบคำถามนี้) — อนุมัติที่ Phase 1, 2, 5 |
| 19 | ตารางชั้น / X-ray / Slice / ambient | floor schedule ตามรูปอาคารจริง, X-ray แบบ crossfade, Slice แบบลอยขึ้น + จาง, ambient motion ไม่อยู่ใน Demo แรก (3D_PLAN ข้อ 8) |

### ยังเปิดอยู่ (ไม่บล็อกการเริ่มงาน — ใช้ค่าแนะนำไปก่อนจนกว่าจะได้คำตอบ)

1. **ภาษา UI:** คงแบบผสมไทย/อังกฤษเหมือนต้นแบบ หรือทำปุ่มสลับ TH / EN? (ค่าแนะนำ: ผสมเหมือนเดิม — type `L10n` รองรับการสลับภายหลังแล้ว)
2. **Overview:** ออกแบบใหม่เป็น executive dashboard (ตามข้อ 5) หรือคงเหมือนต้นแบบ? (ค่าแนะนำ: ออกแบบใหม่)
3. **Sidebar:** แสดงแบบเต็ม (มี Property Explorer) บนจอใหญ่ หรือคง icon-only ตามต้นแบบ? (ค่าแนะนำ: แบบเต็มที่ ≥ 1440)
4. **Icons:** lucide-react เป็นหลัก + custom SVG เฉพาะ icon เฉพาะทาง (chiller, AHU) — ตกลงไหม?
5. **ระดับรายละเอียด 3D:** Core look (ข้อ 6.5) ทำแน่นอน — Effects (heatmap, ท่อเรืองแสง, intro) ต้องการใน Demo แรกไหม? (ค่าแนะนำ: stretch)
6. **AI Assistant:** rule-based + fallback พอ หรืออยากให้มี typing effect / ตอบพร้อมสั่งกล้องบินไปจุดที่ถาม?
7. **Branding:** ต้องใช้โลโก้ / สีของ Piramid Solutions หรือของลูกค้า (PRM) หรือไม่ มีไฟล์ให้ไหม?
11. **วัน Demo แรก:** เมื่อไร? → ใช้กำหนดว่าจะตัด scope ที่ MVP (Phase 0–6) หรือทำเต็ม
12. **มือถือ:** ยืนยันว่ามือถือ (< 768 px) ไม่อยู่ในขอบเขต Demo ใช่ไหม? (ค่าแนะนำ: ไม่อยู่)
13. **Demo script:** ใครเป็นคนเขียน talk track ของแต่ละขั้นใน tour?
15. **รูปภาพ:** รูป 4 รูปใน `ASSETS` มาจากไหน — ถ้าเปิดผ่าน server ให้คนภายนอกเข้าถึง ใช้ได้ไหม?
16. **หน้าแรก:** เปิดมาที่ Overview (dusk, auto-rotate) ตามที่เสนอ หรือ Twin เหมือนต้นแบบ? (ค่าแนะนำ: Overview)
18. **Attract mode:** ต้องการไหม (ใช้ในบูธ / งาน event)? ถ้าต้องการ เริ่มหลังไม่มีการใช้งานกี่นาที? (ค่าแนะนำ: มี, 2 นาที — stretch)
