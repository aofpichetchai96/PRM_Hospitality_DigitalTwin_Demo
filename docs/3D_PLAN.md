# PRM Hospitality Digital Twin — แผนสร้างฉาก 3D

> สถานะ: **v1.1 — ตัดสินใจข้อ 8 แล้ว** · อัปเดต 2026-10-26 · เอกสารลูกของ `docs/PLAN.md` (ข้อ 6)
> อ้างอิงโค้ด: `PRM_Hospitality_DigitalTwin_example.html` class `PRMHospitalityScene` (บรรทัด 97–334) — ต่อไปนี้อ้างเป็น `Lxxx`

---

## 0. สรุปสั้น

| # | ข้อค้นพบ | ผลต่อแผน |
|---|---|---|
| 1 | ต้นแบบมี**อาคาร 2 ชุดที่ไม่เหมือนกัน**: โหมด Exterior ใช้ `hospitalityExterior()` (L173–206: envelope โค้งมน + sky court + crown) ส่วน X-ray / Slice / Explode ใช้อาคาร schematic อีกชุด (L232–297: กล่องตรง 44×28 ทุกชั้น) | ต้องสร้าง 2 ชุดแยกกัน แต่ใช้ **ตารางชั้น (floor schedule) ชุดเดียว** เป็นข้อมูลตั้งต้น |
| 2 | **ข้อมูลห้องไม่ตรงกับรูปอาคาร**: ฝั่ง exterior มีชั้นห้องพักเต็มแค่ 19 ชั้น + ชั้นแคบ 4 ชั้น + sky court 6 ชั้น + roof แต่ข้อมูลมี 30 ชั้น × 20 ห้องทุกชั้น → คลิกชั้น sky court แล้วเห็น 20 ห้อง | **ตัดสินใจแล้ว:** floor schedule ตามรูปอาคารจริง กระจาย 600 ห้องใหม่ (ข้อ 8) |
| 3 | โค้ด facade panel, LED screen, ครีบหอคอยใน schematic (L239–241, L250–258, L274–282, L293) **ไม่เคยถูกเรียกใช้** (dead code) เพราะเงื่อนไข `!xray && !cut && !explode` ไม่มีทางเป็นจริงใน branch นั้น | ไม่ต้อง port ส่วนนี้ — LED screen ใน PLAN ข้อ 6 เป็นของใหม่ ไม่ใช่ของเดิม |
| 4 | ต้นแบบรวม geometry เป็น **ก้อนเดียวต่อ material** อยู่แล้ว (`bucket()` L127, `upload()` L311) | port helper ทั้งชุดเป็น **GeometryBuilder** แบบ TS ล้วนได้เกือบ 1:1 → เร็วและ draw call น้อย (ข้อ 2) |
| 5 | สูตรตำแหน่งกล้องของต้นแบบ (L313) **ตรงกับ `Spherical` ของ three.js และ `CameraControls` ทุกตัวแปร** (θ = azimuth, φ = polar) | ค่า preset ทุกตัวใช้ตรงได้ทันที (ข้อ 4.1) |
| 6 | Bug การเคลื่อนไหวในต้นแบบ: (a) auto-rotate สะสมมุม θ ไม่จำกัด → กด preset แล้วกล้องหมุนย้อนหลายรอบ (b) pan เลื่อนตามแกน X/Y ของโลก ไม่ใช่ของจอ → หมุนกล้องแล้ว pan ผิดทิศ (c) smoothing คิดต่อเฟรม ไม่ใช่ต่อเวลา (d) pan ไม่มีขอบเขต | แก้ทั้งหมดใน CameraRig (ข้อ 6) |
| 7 | Picking ต้นแบบใช้กล่อง 2 ใบ (L331–333) → ได้แค่ "ชั้น" และพื้นที่ว่างข้างชั้นแคบก็คลิกโดน | ใช้ **pick proxy** (กล่องล่องหนต่อชั้น / ห้อง / อุปกรณ์) แทนการ raycast geometry จริง (ข้อ 5.2) |
| 8 | สีสถานะห้องในต้นแบบอยู่บนแถบผ้าห่มเล็กๆ ขนาด 2×1 m (L134) → มองจากไกลแทบไม่เห็น | ใช้ **semantic zoom** แสดงตามระยะ (ข้อ 5.4) |

---

## 1. สิ่งที่มีในฉากต้นแบบ (inventory)

| ส่วน | ต้นแบบ | ตำแหน่ง / ขนาด (หน่วยโมเดล ≈ เมตร) |
|---|---|---|
| Site plinth + ลาน | `build()` L210–211 | plinth 220×2.7×150 ที่ y −1.7; ลาน 121×73 |
| ถนน + เส้นจราจร + ทางม้าลาย | L212–215 | ถนน z 39–69 ยาว 320; texture `road` (noise) |
| ต้นไม้ริมถนน + ทางเดิน | L216–217 | แถว z=33 ทุก 15 m; แถว x=−53 / 54 |
| เส้น grid ลาน | L218–219 | ทุก 5.5 m, material `line` |
| เงาปลอม | L220–222 | quad texture `shadow` + polygon เงาหอคอย → **แทนด้วยเงาจริง** |
| ตึกบริบท 24 หลัง | L224–226 | z −90 ถึง −152, สูง 14–58, random seeded |
| รถ 10 คัน / คน 35 คน | L228–229 | ถนน z 47 / 61, ลาน z 28–37 (ตั้งนิ่ง) |
| **Exterior: podium** | L175–181 | rounded 85×49 r6; envelope 2 ชั้น × 5.2 ที่ y 6; sky garden ที่ 16.5; pavilion 2 หลังที่ 17.3–25.7 |
| **Exterior: แกน terracotta** | L183–184 | core 27×123×12 ที่ (9, 90, −10) + เสา 4 ต้น |
| **Exterior: หอคอย (bands)** | L185–188 | base y=29, ชั้นละ 4.15; band f0×7, f9×6, f17×6 (44×28 ที่ x9 z−6); band f25×4 แคบ 23×25 ที่ x19 z−7 |
| **Exterior: sky court 2 ชั้น** | L190–194 | ที่ f7, f15, f23 (0-based) — กระจก inset 31×16 + เสา + ระแนงไม้ |
| **Exterior: crown** | L196–199 | terrace ที่ 132.9; crown 153.5–161 (45×29) |
| Arrival canopy + ป้าย | L201–204 | canopy (−12, 6, 29) 38×9; texture `sign` |
| **Schematic: podium 5 ชั้น** | L236–249 | ชั้นละ 5.2; shell โปร่ง α .09; ร้านค้า + concourse + บันไดเลื่อน |
| **Schematic: หอคอย 30 ชั้น** | L270–297 | 44×28 ทุกชั้น; slab + เสา + ห้อง 20 ห้อง (เฟอร์นิเจอร์ 6 กล่อง/ห้อง) เมื่อเลือกชั้น / explode / ชั้นบนสุดของ slice |
| เส้นกรอบชั้นที่เลือก | L296 | เส้น glow 0.3 รอบชั้น |
| Skywalk | L301 | (−83, 9.1, 13) ยาว 80 |
| Central plant | L303 | ฐาน 18×23 ที่ (57, −20); chiller 3 ตัว (จานพัดลม**นิ่ง**) |
| Layer: Energy | L205, L290, L304 | แผ่นสีร้อน-เย็นต่อชั้นที่หน้าอาคาร + ท่อสีฟ้าจาก plant ขึ้นหอคอย |
| Layer: People | L305 | วงกลมโปร่ง 36 วง + เส้นทางเดิน |
| Layer: Security | L306 | ทรงกลม glow 4 จุด (ตำแหน่งกล้อง) |
| Layer: Assets | L321 | เปิด/ปิด hotspot `plant`, `ahu` เท่านั้น |
| มุมขอบเขต site | L308 | เส้น glow รูปตัว L 4 มุม |
| Hotspot DOM 6 จุด | L321 | hotel, mall, plant, security, ahu, people (พิกัดในข้อ 4.3) |
| Look | L112 | แสงทิศ (−0.6, 1, 0.9), ambient .54/.45, fresnel สะท้อนฟ้า, fog 290–750 (สูงสุด 0.8), gamma 0.92 |

---

## 2. สถาปัตยกรรมฉาก

### 2.1 หลักการ
1. **GeometryBuilder (TS ล้วน, ไม่มี React)** — port `quad / tri / box / line / sphere / tree / roundedPath / roundedSolid / roundedRail / envelope / skyGarden / roomFurniture` จากต้นแบบมาแทบ 1:1 แต่ผลลัพธ์เป็น `Map<MaterialKey, BufferGeometry>` (position, normal, uv, **color**) → ได้รูปทรงเหมือนต้นแบบเป๊ะ และรวม draw call ตามธรรมชาติ
2. **React เฉพาะส่วนที่ต้องโต้ตอบหรือเคลื่อนไหว** — floor group, ห้อง, proxy, hotspot, layer; ส่วนนิ่ง (site, exterior shell) เป็น `<mesh>` ก้อนเดียวต่อ material
3. **Floor schedule เดียว** (`data/property.ts`) กำหนดชนิด / footprint / ความสูงของทุกชั้น → ใช้สร้างทั้ง exterior, schematic, pick proxy, hotspot, ตำแหน่งกล้อง (`floorY(f, explode)`)
4. **Seed แยกต่อส่วน** (site, exterior, schematic, layers) แทน seed เดียวที่เรียงลำดับ → เพิ่ม/ลบอะไรแล้วต้นไม้ส่วนอื่นไม่ขยับ

### 2.2 Scene graph

```
<Canvas> (opaque, background + fog ในฉาก — ไม่ใช้ canvas โปร่งแบบต้นแบบ เพราะ tone mapping / bloom ต้องการพื้นทึบ)
 ├ <Look>               ไฟ, environment, fog, tone mapping ตาม day/dusk (three/look.ts)
 ├ <Site>               merged: plinth, ลาน, ถนน, grid, ตึกบริบท, ต้นไม้ (instanced) | <Traffic> รถ + คน (ambient motion)
 ├ <ExteriorShell>      merged จาก hospitalityExterior() — มองเห็นในโหมด exterior, fade ออกเมื่อเปลี่ยนโหมด
 ├ <SchematicBuilding>  podium 5 + tower ตาม floor schedule
 │   └ <FloorGroup f>   slab, เสา, ห้อง (instanced ตามระดับ semantic zoom), เส้นกรอบเลือก — ขยับ y เมื่อ explode
 ├ <Fixed>              ArrivalCanopy, Skywalk, CentralPlant (+ พัดลม), มุมขอบเขต site
 ├ <Layers>             Energy | Security | People | Assets
 ├ <PickProxies>        กล่องล่องหน: ชั้น / ห้อง / อุปกรณ์ (เป็นลูกของ FloorGroup → ขยับตามเมื่อ explode)
 ├ <Markers>            incident pulse, selection highlight
 ├ <Hotspots>           drei <Html> 6 จุด (เป็นลูกของ group ที่เกี่ยวข้อง → ขยับตามเอง)
 ├ <CameraRig>          drei <CameraControls> + presets + auto-rotate
 └ <Effects>            N8AO, Bloom, SMAA (ปิดได้ตามระดับคุณภาพ)
```

### 2.3 ไฟล์

```
src/three/
├─ geometry/builder.ts       # GeometryBuilder + helpers (port จาก L127–172)
├─ geometry/exterior.ts      # buildExterior(schedule) ← hospitalityExterior()
├─ geometry/schematic.ts     # buildPodiumFloor(f), buildTowerFloor(f, type)
├─ geometry/site.ts          # buildSite()
├─ materials.ts              # MaterialKey → three material (ข้อ 4.2)
├─ look.ts                   # day/dusk, fog, tone mapping, สี 3D ของสถานะห้อง
├─ CameraRig.tsx / presets.ts
├─ picking/PickProxies.tsx, picking/useSceneSelection.ts
└─ anim/useDamped.ts         # damp + invalidate จนนิ่ง
```

---

## 3. ขั้นตอนการสร้าง (ผูกกับ Phase ใน PLAN.md)

| ขั้น | งาน | อ้างอิงต้นแบบ | Definition of Done | Phase / ประมาณ |
|---|---|---|---|---|
| **3D-1 Builder + materials** | port helper เป็น `GeometryBuilder`; ตาราง material (ข้อ 4.2); แปลงสี sRGB → linear ตอนเขียน vertex color | L109–172, L125 | unit test: จำนวน vertex ของ `box()` / `roundedSolid()` ถูกต้อง; ฉากทดสอบแสดง box + rounded ได้ | P1 · 0.5 วัน |
| **3D-2 Exterior + Site + Fixed** | `buildExterior`, `buildSite`, canopy, skywalk, plant | L173–229, L301–303 | screenshot ที่ preset `all` ซ้อนกับ baseline ต้นแบบแล้วรูปทรงตรงกัน | P1 · 0.5 วัน |
| **3D-3 CameraRig** | CameraControls + presets + ข้อจำกัด + auto-rotate + แก้ bug ข้อ 0.6 | L103–104, L313, L316–329 | preset ทั้ง 6 + floor view ตรงต้นแบบ; หมุน / ซูม / pan / pinch ลื่น; preset ไม่หมุนย้อนหลายรอบ | P1 · 0.25 วัน |
| **3D-4 Look-dev** | environment, ไฟ, เงา static, N8AO, dusk + หน้าต่างเรืองแสง + bloom, fog | L112, L154, L280 | อนุมัติดีไซน์รอบ 1; ≥ 50 fps บนเครื่อง Demo | P1 · 0.75 วัน |
| **3D-5 Floor schedule + Schematic** | `property.ts` floor schedule; `FloorGroup` podium 5 + tower; ห้อง instanced; pick proxy | L232–297 | ทุกชั้นมี proxy; จำนวนห้องตรงกับข้อมูล; footprint ตรงกับ exterior | P5 · 1 วัน |
| **3D-6 Modes + transitions** | exterior ↔ x-ray (crossfade), slice, explode (damp), day ↔ dusk | L231, L237, L273, L322–324 | ทุก transition ลื่น ไม่ rebuild geometry; ไม่มีเฟรมกระตุก | P5 · 1 วัน |
| **3D-7 Interaction** | hover / select / double-click / ห้อง / asset, tooltip, hotspot + occlusion, compass, keyboard | L321, L326–333 | ทำได้ครบตามตารางข้อ 5.1 ทั้งเมาส์และ touch | P5 · 1 วัน |
| **3D-8 Layers + toolbar** | energy, security, people (แบบพื้นฐานตามต้นแบบ), capture PNG, presentation | L205, L290, L304–306 | toolbar ทุกปุ่มทำงาน | P5 · 1 วัน |
| **3D-9 Data-driven display** | semantic zoom ห้อง (view Hotel), energy heat ต่อชั้น (view Energy), Locate in 3D + incident marker (view IOC) | — (ใหม่) | ตามข้อ 5.4–5.5 | P6–P7 · รวมในประมาณการเดิม |
| **3D-10 Ambient + effects** | รถ / คนเคลื่อนที่, พัดลม chiller หมุน, ท่อเรืองแสงไหล, heatmap, intro | — (ใหม่) | ทำงานเฉพาะเมื่อเปิด ambient (ข้อ 6.6) | P9 (stretch) |

> ประมาณการรวมเท่ากับที่ PLAN.md จัดไว้แล้ว (P1 = 2 วัน, P5 = 4 วัน) — Builder ช่วยให้ 3D-2 เร็วขึ้นมาก เพราะไม่ต้องเขียนรูปทรงใหม่

---

## 4. ค่าอ้างอิงจากต้นแบบ

### 4.1 กล้อง (ใช้กับ CameraControls ได้ตรง: `azimuthAngle = θ`, `polarAngle = φ`, `distance = d`)

| Preset | target | θ | φ | d |
|---|---|---|---|---|
| `all` (ค่าเริ่มต้น) | (0, 77, 0) | 0.43 | 1.34 | 282 |
| `hotel` | (9, 94, −6) | 0.47 | 1.18 | 192 |
| `mall` | (0, 18, 3) | 0.65 | 1.02 | 161 |
| `plant` | (50, 10, −15) | 1.15 | 1.00 | 121 |
| `arrival` | (−5, 14, 23) | 0.55 | 1.12 | 175 |
| `roof` | (9, 110, −6) | 0.65 | 0.55 | 209 |
| `floor` H*n* | (9, 29 + (n−1)×4.15, −6) | 0.35 | 0.52 | 126 |
| `floor` G / L*n* | (0, n×5.2, 0) | 0.35 | 0.52 | 148 |

- FOV 38° — ต้นแบบขยาย FOV เมื่อจอแนวตั้ง: `fov = 2·atan(tan(19°)·max(1, 0.78/aspect))` → คงไว้
- near 0.5 / far 1400 → เปลี่ยนเป็น **near 1 / far 1500** ลด z-fighting (มี quad ซ้อนห่างกันแค่ 0.01–0.04 หลายจุด)
- ข้อจำกัด: φ 0.18–1.56, d 70–560
- ระยะ preset ปรับตามสัดส่วน viewport ด้วย `getDistanceToFitBox()` ของ CameraControls (ค่า d ในตารางคือค่าที่ 16:9) — จำเป็นเพราะ viewport ที่ 1280×720 + panel ขวา แคบกว่าต้นแบบ

### 4.2 Material (ต้นแบบ L125 → three.js)

ทุก material ใช้ `vertexColors: true` + สีจาก builder (ต้นแบบส่งสีต่อ vertex เพื่อสุ่มเฉดกระจก / แผง)

| ต้นแบบ | ค่าเดิม | three.js |
|---|---|---|
| `ivory`, `stone`, `planter`, `deck`, `base`, `foliage`, `wood` | reflect 0–0.18 | `MeshStandardMaterial` roughness 0.6–0.9, metalness 0 |
| `terracotta` | (.62,.24,.16) reflect .1 | Standard roughness 0.75 |
| `facadeGlass`, `glass` | reflect .8 | `MeshPhysicalMaterial` roughness 0.08, metalness 0.1, envMapIntensity 1.2 (ทึบ — **ไม่ใช้ transmission** เพราะแพง) |
| `balconyGlass` | α .3 | Physical transparent opacity 0.3, `depthWrite: false` |
| `metal` | reflect .65 | Standard metalness 0.6, roughness 0.35 |
| `warm` | emission .4 | Standard + emissive อุ่น (#f5c26e) → bloom เฉพาะตอน dusk |
| `glow`, `blue`, `red` | unlit | `MeshBasicMaterial` `toneMapped: false` (สว่างพอให้ bloom จับ) |
| `transparent` (x-ray shell) | α .09–.17 | Basic transparent, `depthWrite: false`, `renderOrder` สูง |
| `line` | α .35 unlit | Basic transparent + `polygonOffset` |
| `road` | texture noise | Standard + CanvasTexture (seeded) |
| `sign`, `screen` | texture | Basic + CanvasTexture — วาดหลัง `document.fonts.ready` ด้วยฟอนต์ self-host (ต้นแบบใช้ Arial) |
| `shadow` | quad เงาปลอม | **ตัดทิ้ง** → ใช้ shadow map จริง |

### 4.3 Look และ hotspot

| รายการ | ค่าจากต้นแบบ | ใน three.js |
|---|---|---|
| แสงหลัก | ทิศ (−0.6, 1, 0.9), สี (0.80, 0.78, 0.72) | `directionalLight` + **static shadow map** (`shadowMap.autoUpdate = false`, สั่ง update เมื่อเปลี่ยนโหมด/explode) — ดีกว่า ContactShadows เพราะหอคอยสูง 161 m ต้องทอดเงาข้ามลาน |
| Ambient | 0.54 (day) / 0.45 (dusk) | hemisphere + environment intensity |
| Fog | day (.29,.41,.52), dusk (.055,.115,.19), เริ่ม 290 จบ 750, หนาสุด 80% | `Fog` near 290 far ~800 (three หนาได้ 100% จึงขยาย far ชดเชย) |
| Gamma | pow 0.92 | tone mapping AgX/ACES + exposure ปรับให้ใกล้ baseline |
| หน้าต่างเรืองแสง (dusk) | exterior: 28% ของบาน (L154) | emissive ต่อบาน seeded, ความหนาแน่นผูกกับ occupancy ของชั้นนั้น |
| Hotspot `hotel` | (31, 118, 3) หรือ y ของชั้นที่ slice + 2 | ลูกของ tower group |
| Hotspot `mall` / `plant` / `security` / `ahu` / `people` | (−31,19,26) / (58,6,−18) / (38,10,24) / (−12,78,3) / (−24,5,32) | ลูกของ group ที่เกี่ยวข้อง — ไม่ต้อง hard-code ค่าชดเชย explode (+31 / +16) แบบต้นแบบ |
| Safe-area ของ hotspot | ซ่อนเมื่ออยู่ห่างขอบ < 42 / 18 / 72 / 70 px (ซ้าย/ขวา/บน/ล่าง) | อ่านจาก layout จริง (KPI ลอย, toolbar) |

---

## 5. การคลิกและการแสดงผลบน 3D

### 5.1 ตารางการโต้ตอบ

| การกระทำ | Exterior | X-ray / Explode | Slice | ผล (store action) |
|---|---|---|---|---|
| Hover ชั้น | แถบเรืองแสงบางรอบชั้น + tooltip "H12 · 18/20 occupied" | เหมือนกัน + slab สว่างขึ้น | — | `hover` (ไม่เข้า store หลัก) |
| Click ชั้น | เลือกชั้น → panel ขวาแสดงข้อมูลชั้น (ยังไม่เปลี่ยนโหมด) | เหมือนกัน | — | `select({ kind: 'floor', id })` |
| Double-click ชั้น / แตะชั้นที่เลือกอยู่ซ้ำ (touch) | เข้า slice ชั้นนั้น + บินกล้อง | เหมือนกัน | — | `setFloor(id)` |
| Hover / Click ห้อง | — | — | tooltip ห้อง / เปิด Room modal | `select({ kind: 'room', id })` |
| Click อุปกรณ์ (chiller, AHU, กล้อง) | Asset card + กล้อง `fitToBox` | เหมือนกัน | เหมือนกัน | `select({ kind: 'asset', id })` |
| Click hotspot | เปิดสิ่งที่ hotspot นั้นผูกไว้ (ตาม `hotspot()` ของต้นแบบ) | เหมือนกัน | เหมือนกัน | — |
| Click ที่ว่าง | ล้างการเลือก | เหมือนกัน | ล้างห้องที่เลือก (ยังอยู่ชั้นเดิม) | `select(null)` |
| Drag แล้วปล่อย | **ไม่นับเป็น click** (`event.delta > 4 px`) | | | — |
| `Esc` | ล้างการเลือก → ออกจาก slice → ปิด tour ตามลำดับ | | | |
| `[` / `]` | ชั้นลง / ขึ้น | | | `setFloor` |
| `Home` | กลับ preset ของ view ปัจจุบัน | | | |

- **Clicker:** รีโมตพรีเซนต์บางรุ่นส่ง `Esc` / `F5` / `.` / `b` เมื่อกดปุ่ม play หรือ blank → ทดสอบรุ่นที่ใช้จริง และอย่าให้ `Esc` ปิด tour ตอน presentation mode
- **Touch:** ไม่มี hover → แตะครั้งแรก = เลือก + tooltip, แตะซ้ำ = เข้า slice; ใช้นิ้วเดียวหมุน, สองนิ้วซูม + เลื่อน

### 5.2 Picking
- **Pick proxy:** กล่องล่องหนแบบง่ายต่อชั้น (ขนาดตาม floor schedule — ชั้นแคบก็แคบ, ชั้น sky court เป็นชนิด sky court), ต่อห้อง (เฉพาะชั้นที่แสดงห้อง), ต่ออุปกรณ์ — ใช้ `<meshBasicMaterial visible={false} />` (mesh ยัง raycast ได้แต่ไม่ render)
- geometry ที่ใช้แสดงผลทั้งหมดตั้ง `raycast={() => null}` → R3F ไม่ต้อง raycast ครีบ / กระจกหลายพันชิ้นทุกครั้งที่ขยับเมาส์
- ห้องใช้ `InstancedMesh` proxy → `event.instanceId` = index ห้อง
- `event.stopPropagation()` ที่ proxy เพื่อให้ได้เฉพาะชิ้นที่ใกล้ที่สุด
- **Hover ไม่เก็บใน store หลัก** — เก็บใน ref / store ย่อยแบบ transient แล้ว `invalidate()` → ไม่ re-render UI ทั้งแอปทุกครั้งที่เมาส์ขยับ (PLAN R5)
- Tooltip เป็น DOM element เดียวใน overlay ของ Viewport ตามตำแหน่งเมาส์ (ถูกกว่าการสร้าง `<Html>` ใหม่ทุกครั้ง)

### 5.3 การแสดงสถานะที่เลือก / hover
- ชั้นที่เลือก: เส้นกรอบเรืองแสงรอบชั้น (แบบต้นแบบ L296) + slab สีอ่อน (`.71,.89,.88` ตามต้นแบบ L284)
- Hover: เส้นกรอบเดียวกันแต่บางลงและจางกว่า
- ห้องที่เลือก: ยกขึ้นเล็กน้อย + เส้นกรอบ
- อุปกรณ์ที่เลือก: emissive pulse เบาๆ (ไม่ใช้ postprocessing Outline)

### 5.4 Semantic zoom ของข้อมูลห้อง (ใหม่ — แก้ปัญหาข้อ 0.8)

| ระยะกล้อง | สิ่งที่แสดงในโหมด X-ray / Slice / view Hotel |
|---|---|
| > 250 m | แต่ละชั้นเป็นแถบสีตาม % occupancy ของชั้น (ไล่สีเดียว) |
| 120–250 m | ห้องเป็นแผ่นสีเต็มห้อง (4 × 5.7 m) ตามสถานะ — อ่านได้จากไกล |
| < 120 m หรือชั้นที่เลือก | แผ่นสี + เฟอร์นิเจอร์ตามต้นแบบ (L134) |

- ทุกระดับใช้ `InstancedMesh` + `instanceColor` → เปลี่ยนสถานะห้องแค่แก้สี instance เดียว **ไม่ rebuild** (ต้นแบบ rebuild ทั้งฉาก)
- ต้นแบบแสดงเฟอร์นิเจอร์ทุก 30 ชั้นตอน explode (600 ห้อง × 6 กล่อง) → ใช้ระดับกลางแทน ยกเว้นชั้นที่เลือก
- สีสถานะใน 3D ใช้ค่าจาก `look.ts` (ปรับหลัง tone mapping) + ความสว่างต่างกัน (PLAN R15)
- Legend เล็กมุมล่างซ้ายของ viewport แสดงความหมายของสีใน layer / โหมดที่เปิดอยู่

### 5.5 Hotspot, marker และ overlay
- Hotspot: drei `<Html>` + `occlude={[proxyRefs]}` (raycast กับ proxy เท่านั้น ถูกกว่าการบังด้วยทั้งฉาก) → ซ่อนเมื่ออยู่หลังอาคาร (ต้นแบบแสดงทะลุตึก)
- Incident marker (Locate in 3D): วงแหวน pulse (scale 1 → 2.5, จาง 1 → 0, วน 1.2 วินาที) + เส้นแนวตั้งบางๆ ให้เห็นจากไกล
- Compass: หมุนตาม azimuth (ต้นแบบ L321); คลิก = หันกลับทิศเหนือ (ใหม่)

---

## 6. การเคลื่อนไหว (Movement)

### 6.1 การควบคุมกล้อง (drei `<CameraControls>`)

| ค่า | ต้นแบบ | ใหม่ | เหตุผล |
|---|---|---|---|
| ความหน่วง | lerp 0.09 ต่อเฟรม (≈ 0.18 วินาทีที่ 60 Hz, ช้าลงบนเครื่องอ่อน) | `smoothTime 0.25`, `draggingSmoothTime 0.1` | คิดตามเวลา — ความรู้สึกเท่ากันทุกเครื่อง |
| Zoom | wheel `exp(Δy·0.001)` ไปที่ target | `dollyToCursor: true` | ซูมไปตรงที่เมาส์ชี้ ใช้งานจริงง่ายกว่า |
| Pan | คลิกขวา / Shift + ลาก, เลื่อนตามแกนโลก X/Y (bug) | truck ตามแกนจอ (ค่าเริ่มต้นของ CameraControls) | แก้ทิศผิดเมื่อหมุนกล้อง |
| ขอบเขต | ไม่มี | `setBoundary(Box3(−120, 0, −90 → 120, 170, 90))` | กันกล้องหลุดจากอาคาร |
| Touch | 1 นิ้วหมุน, 2 นิ้วซูม (pan ไม่ได้) | 1 นิ้วหมุน, 2 นิ้วซูม + เลื่อน | ใช้บน iPad ได้ครบ |
| ข้อจำกัด | φ 0.18–1.56, d 70–560 | คงเดิม | |

### 6.2 การบินกล้อง (fly-to)
- ใช้ `setLookAt(..., true)` / `fitToBox(..., true, { padding })` ซึ่งคืน Promise เมื่อกล้องหยุด → Tour ใช้ `await` ได้: บินกล้องก่อน แล้วค่อยเลื่อน panel เข้า (ใช้ motion tokens ร่วมกัน)
- เส้นทางบินเป็นแบบโคจร (interpolate θ / φ / d แยกกัน) จึงไม่พุ่งทะลุตึก
- **แก้ bug มุมสะสม:** เรียก `normalizeRotations()` แล้วเลือก θ ปลายทางที่ใกล้มุมปัจจุบันที่สุด (θ + 2πk) ก่อนบินทุกครั้ง
- บินใน tour ใช้ `smoothTime` ยาวขึ้น (0.6–0.8) แล้วคืนค่าเดิมเมื่อจบ
- ผู้ใช้ลากระหว่างบิน → ยกเลิกการบินทันที (เป็นพฤติกรรมของ CameraControls อยู่แล้ว) และ tour ต้องไม่ดึงกล้องกลับ
- Locate in 3D / เลือกอุปกรณ์: `fitToBox` รอบพิกัดเป้าหมาย (รัศมี ~15 m) แทนระยะ hard-code

### 6.3 Auto-rotate
- ต้นแบบ 0.0016 rad ต่อเฟรม (≈ 5.5°/วินาที ที่ 60 Hz) → ใหม่ `azimuthAngle += 0.096 × delta` (คิดตามเวลา)
- หยุดเมื่อผู้ใช้เริ่มควบคุม (`controlstart`); เริ่มใหม่หลังไม่มีการใช้งาน 20 วินาที **เฉพาะ** view overview, presentation และ attract mode

### 6.4 Transition ของโหมด (ระยะเวลาจาก motion tokens)

| จาก → ไป | การเคลื่อนไหว | ระยะเวลา |
|---|---|---|
| Exterior → X-ray | ExteriorShell จาง 1 → 0 ขณะที่ floor ของ schematic ค่อยปรากฏจากล่างขึ้นบน (stagger ~15 ms/ชั้น) | 0.5 วินาที |
| X-ray → Exterior | ย้อนกลับ | 0.5 วินาที |
| → Slice ชั้น *n* | ชั้นเหนือ *n* ลอยขึ้น + จางหาย (stagger บนลงล่าง) พร้อมกล้องบินไป floor preset | 0.6 วินาที |
| Explode | ชั้นแยกออก (tower 1.55 m/ชั้น, podium 2.0 m/ชั้น ตามต้นแบบ) ด้วย `maath` `easing.damp` + stagger; กล้องถอยให้เห็นทั้งอาคาร (สูงขึ้น ~46 m) | 0.8 วินาที |
| Day ↔ Dusk | lerp: env intensity, สีแสง, fog, bloom; หน้าต่างเปิดไฟทีละบานแบบสุ่ม | 1.2 วินาที |
| เปลี่ยนสถานะห้อง | สี instance lerp | 0.3 วินาที |

- ระหว่าง fade ตั้ง `transparent = true` เฉพาะช่วงที่กำลังจาง แล้วคืน `false` เมื่อจบ → ไม่มีปัญหาการเรียงลำดับวัตถุโปร่งใสตอนนิ่ง
- shadow map สั่ง update ครั้งเดียวหลัง transition จบ (ไม่ใช่ทุกเฟรมระหว่างเคลื่อนไหว)
- `prefers-reduced-motion`: transition ทั้งหมดเป็น 0 หรือ fade สั้น, ไม่มี auto-rotate, บินกล้องแบบตัดภาพ

### 6.5 การ render และ frameloop
- ค่าเริ่มต้น `frameloop="demand"` — ไม่มีอะไรขยับ = ไม่ใช้ GPU (CameraControls ของ drei สั่ง `invalidate()` เองขณะเคลื่อนที่)
- Animation ที่เขียนเองใช้ hook `useDamped()` ซึ่งสั่ง `invalidate()` ทุกเฟรมจนค่านิ่ง
- เมื่อมี auto-rotate / ambient motion / intro → สลับเป็น `frameloop="always"` ผ่าน `setFrameloop` แล้วคืนเป็น `demand` เมื่อหยุด
- ต้นแบบจำกัด render ~35 fps (เว้น 28 ms ต่อเฟรม) → เป้าหมายใหม่ ≥ 50 fps สูงกว่าต้นแบบ

### 6.6 Ambient motion (ใหม่ — stretch)
- รถวิ่งตามเลนถนน (z 47 ไปทางตะวันตก / z 61 ไปทางตะวันออก), คนเดินช้าๆ ในลาน, พัดลม chiller หมุน
- ทำให้ต้อง render ต่อเนื่อง → เปิดเฉพาะ overview / presentation / attract และปิดเมื่อระดับคุณภาพเป็น Low
- **ไม่อยู่ใน Demo แรก** (ข้อ 8)

---

## 7. ความเสี่ยงเฉพาะ 3D

| # | ความเสี่ยง | การรับมือ |
|---|---|---|
| 3R1 | อาคาร 2 ชุด (exterior / schematic) ไม่ตรงกัน → สลับโหมดแล้วรูปทรงกระโดด | floor schedule เดียวเป็นข้อมูลตั้งต้นของทั้งสองชุด |
| 3R2 | z-fighting จาก quad ที่ห่างกัน 0.01–0.04 (ป้าย, ถนน, เส้น grid) | near 1, `polygonOffset` สำหรับ decal, offset ≥ 0.05 |
| 3R3 | สีซีด / เข้มผิดจากต้นแบบเพราะ color management | แปลงสี sRGB → linear ตอนเขียน vertex color; เทียบกับ baseline ใน 3D-2 |
| 3R4 | วัตถุโปร่งใสที่ merge เป็นก้อนเดียวเรียงลำดับผิด (x-ray shell) | `depthWrite: false` + `renderOrder`; เปิด transparent เฉพาะตอน fade |
| 3R5 | Shadow acne / เงาเบลอเพราะฉากใหญ่ (220 × 150 m, สูง 161 m) | shadow camera ครอบเฉพาะ site, map 2048–4096, `normalBias`; static update |
| 3R6 | ฟอนต์ในป้าย canvas ไม่ใช่ฟอนต์ที่ตั้งไว้ (วาดก่อนโหลดเสร็จ) | วาดหลัง `document.fonts.ready` |
| 3R7 | Postprocessing / tone mapping บน canvas โปร่ง (แบบต้นแบบ) ทำให้ขอบและพื้นหลังเพี้ยน | canvas ทึบ, background + fog อยู่ในฉาก |

---

## 8. การตัดสินใจ (ยืนยันแล้ว 2026-10-26)

1. **ตารางชั้น → ทางเลือก A:** floor schedule ตามรูปอาคาร exterior จริง แล้วกระจาย 600 ห้องใหม่ (ทางเลือกที่ไม่เลือก: B คง 30 × 20 แล้วทำ exterior ให้ทุกชั้นเหมือนกัน, C คงแบบไม่ตรงกัน + disclaimer)

   | ชั้น | ชนิด (`FloorType`) | footprint | ห้อง/ชั้น | รวม |
   |---|---|---|---|---|
   | H01–H07 | `guest` | 44 × 28 ที่ (9, −6) | 28 | 196 |
   | H08–H09 | `skyCourt` (สูง 2 ชั้น, amenity) | 44 × 28 | 0 | — |
   | H10–H15 | `guest` | 44 × 28 | 28 | 168 |
   | H16–H17 | `skyCourt` | 44 × 28 | 0 | — |
   | H18–H23 | `guest` | 44 × 28 | 28 | 168 |
   | H24–H25 | `skyCourt` | 44 × 28 | 0 | — |
   | H26–H29 | `guestNarrow` | 23 × 25 ที่ (19, −7) | 17 | 68 |
   | H30 | `roof` (terrace + crown) | 45 × 29 | 0 | — |
   | | | | **รวม** | **600** |

   - ตรงกับ band ของต้นแบบ (L186–198): band f0×7, f9×6, f17×6, f25×4 แคบ; sky court ที่ f7 / f15 / f23
   - ชั้น `skyCourt` / `roof` คลิกเลือกได้ แสดงข้อมูล amenity แทนรายการห้อง
   - Room grid แสดงจำนวนห้องตามชั้น (28 หรือ 17) แทน 20 คงที่; room id รูปแบบ `H12-07`
   - ค่าเริ่มต้นเดิมยังใช้ได้: H12 และ AHU-H12 เป็นชั้น `guest`, occupancy 84% = 504 / 600
2. **X-ray → crossfade** จาก ExteriorShell ไปอาคาร schematic แบบต้นแบบ
3. **Slice → ชั้นด้านบนลอยขึ้น + จางหาย** สำหรับ MVP; section cut ด้วย clipping plane เป็น stretch (Phase 9)
4. **Ambient motion → ไม่อยู่ใน Demo แรก** — เป็น stretch ใน 3D-10 / Phase 9 และเมื่อทำ ให้เปิดเฉพาะ overview / presentation / attract
