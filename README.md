# PRM Hospitality · Digital Twin

Demo ขายงานแบบ Digital Twin ของโครงการ Mixed-use (โรงแรม 600 ห้อง + ศูนย์การค้า) — ข้อมูลทั้งหมดเป็นข้อมูลจำลองแบบ hard-code ไม่มี backend และไม่เรียกอินเทอร์เน็ตระหว่างใช้งาน

- แผนงาน: [`docs/PLAN.md`](docs/PLAN.md) · แผนฉาก 3D: [`docs/3D_PLAN.md`](docs/3D_PLAN.md)
- บทพูด Demo: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) · เช็คลิสต์ก่อนออกงาน: [`docs/DEMO_CHECKLIST.md`](docs/DEMO_CHECKLIST.md)
- ต้นแบบเดิม (ไฟล์เดียว): [`reference/PRM_Hospitality_DigitalTwin_example.html`](reference/PRM_Hospitality_DigitalTwin_example.html)
- Stack: Next.js 16 · React 19 · three.js / React Three Fiber · Zustand · Tailwind CSS 4

## รัน Demo (localhost)

ต้องใช้ Node.js 24

```bash
npm ci          # ครั้งแรก (ต้องมีเน็ต)
npm run build   # ต้องมีเน็ต — next/font ดาวน์โหลดฟอนต์มาเก็บไว้ในแอปตอน build
npm start       # รันได้โดยไม่ต้องมีเน็ต → http://localhost:3000
```

Port 3000 ถูกใช้อยู่: `npx next start -p 3100` แล้วเปิด `http://localhost:3100`

## ระหว่าง Demo

- เปิดหน้าที่ต้องการได้ตรงๆ ด้วย `?view=` เช่น `http://localhost:3000/?view=hotel` (overview, twin, ioc, energy, hotel, ai) — URL เปลี่ยนตามหน้าที่เปิดอยู่เสมอ
- **เริ่มสาธิต** (มุมขวาบน) เล่น Guided Demo 6 ขั้น — บทพูดอยู่ใน [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)
- คีย์ลัด (ใช้กับ wireless clicker ได้):

  | คีย์                              | ผล                                                                                                |
  | --------------------------------- | ------------------------------------------------------------------------------------------------- |
  | `→` / `PageDown` · `←` / `PageUp` | ขั้นถัดไป / ก่อนหน้าของ Guided Demo                                                               |
  | `P`                               | Presentation mode (ซ่อนแผงทั้งหมด เหลือภาพ 3D)                                                    |
  | `R`                               | Reset Demo กลับค่าเริ่มต้น                                                                        |
  | `[` / `]`                         | ชั้นลง / ขึ้น                                                                                     |
  | `Home`                            | กลับมุมกล้องเริ่มต้นของหน้า                                                                       |
  | `Esc`                             | ปิดหน้าต่าง → ปิด Floor Plan → ยกเลิกชั้นที่เลือก → ออกจาก Slice → ปิด Demo → ออกจาก Presentation |

- ปุ่ม `?` (ช่วยเหลือ): ปรับคุณภาพภาพ 3D (เครื่องช้าเลือก "ต่ำ") และเปิด **Attract mode** สำหรับบูธ — ไม่มีคนใช้งาน 2 นาที Demo จะเล่นวนเอง แตะหรือกดปุ่มใดก็ได้เพื่อหยุด

## รันบน server (pm2)

```bash
npm ci && npm run build
pm2 start ecosystem.config.js            # port 3000; อื่นๆ: PORT=3100 pm2 start ecosystem.config.js
pm2 save                                 # จำ process ไว้; ใช้ `pm2 startup` เพื่อให้เริ่มเองเมื่อเครื่องรีบูต
pm2 logs prm-hospitality-twin            # ดู log · pm2 restart / pm2 delete prm-hospitality-twin
```

## ให้ browser ใช้ GPU แยก (สำคัญสำหรับเครื่อง Demo)

เครื่อง Demo มี GPU 2 ตัว (Radeon 780M ในตัว + RTX 4060) และ browser เลือกใช้ GPU ในตัวเป็นค่าเริ่มต้น (PLAN R16) ทำให้ 3D ช้าลง

1. Windows **Settings › System › Display › Graphics**
2. เลือก Microsoft Edge / Google Chrome → **Options** → **High performance** (NVIDIA GeForce RTX 4060) → Save
3. ปิด browser ทุกหน้าต่างแล้วเปิดใหม่ — ตรวจด้วย `npm run benchmark` (แสดงชื่อ GPU ที่ Edge ใช้) หรือดูที่ `edge://gpu` / `chrome://gpu`
4. เสียบสายชาร์จตอน Demo

## ทดสอบ

| คำสั่ง              | ใช้ทำอะไร                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`          | Unit test (Vitest): สูตรพลังงาน, ห้องพัก, store, geometry                                                                              |
| `npm run test:e2e`  | Smoke test (Playwright + Microsoft Edge): ครบ 6 หน้า × 3 ขนาดจอ, Guided Demo, Reset, modal, Floor Plan — ต้อง `npm run build` ก่อน     |
| `npm run benchmark` | วัด fps ฉากที่หนักที่สุด (Overview พลบค่ำ + หมุน + คุณภาพสูง) 10 วินาที และแสดง GPU ที่ใช้ — เป้า ≥ 50 fps · ต้อง `npm run build` ก่อน |

Smoke test ยังตรวจว่า **ไม่มี request ออกนอกเครื่อง** และไม่มี error ใน console — ใช้แทนการทดสอบปิด Wi-Fi ได้

## คำสั่งสำหรับพัฒนา

| คำสั่ง                                            | ใช้ทำอะไร                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                     | dev server                                                                                                            |
| `npm run lint` / `npm run typecheck` / `npm test` | ตรวจโค้ด (CI รันชุดเดียวกัน + build + smoke test)                                                                     |
| `npm run format`                                  | จัดรูปแบบโค้ดด้วย Prettier                                                                                            |
| `npm run extract-assets`                          | แตกรูป base64 จากต้นแบบเป็น WebP ใน `public/images/`                                                                  |
| `npm run capture-baseline`                        | ถ่าย screenshot ต้นแบบทุก view / โหมด / มุมกล้อง ไว้ที่ `reference/screens/` (ใช้ Microsoft Edge ที่ติดตั้งในเครื่อง) |

## แก้ปัญหา

| อาการ                                      | ทำอย่างไร                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| ภาพ 3D ดำ / หาย แล้วขึ้นปุ่ม "โหลดฉากใหม่" | กดปุ่มนั้น หรือรีเฟรชหน้า (ข้อมูลกลับค่าเริ่มต้น) — มักเกิดจาก GPU driver reset                 |
| ภาพกระตุก                                  | ตั้ง GPU แยก (หัวข้อด้านบน) แล้ว `npm run benchmark`; ถ้ายังต่ำ ลดคุณภาพใน `?` → "กลาง" / "ต่ำ" |
| ฟอนต์ไทยไม่ขึ้น                            | build ใหม่ตอนมีเน็ต (`npm run build`) — ฟอนต์ถูกดาวน์โหลดมาเก็บตอน build                        |
| `npm start` บอก port ถูกใช้                | ใช้ port อื่น: `npx next start -p 3100`                                                         |
