# PRM Hospitality · Digital Twin

Demo ขายงานแบบ Digital Twin ของโครงการ Mixed-use (โรงแรม 600 ห้อง + ศูนย์การค้า) — ข้อมูลทั้งหมดเป็นข้อมูลจำลองแบบ hard-code ไม่มี backend

- แผนงาน: [`docs/PLAN.md`](docs/PLAN.md) · แผนฉาก 3D: [`docs/3D_PLAN.md`](docs/3D_PLAN.md)
- ต้นแบบเดิม (ไฟล์เดียว): [`reference/PRM_Hospitality_DigitalTwin_example.html`](reference/PRM_Hospitality_DigitalTwin_example.html)
- Stack: Next.js 16 · React 19 · three.js / React Three Fiber · Zustand · Tailwind CSS 4

## รัน Demo (localhost)

ต้องใช้ Node.js 24

```bash
npm ci          # ครั้งแรก (ต้องมีเน็ต)
npm run build   # ต้องมีเน็ต — next/font ดาวน์โหลดฟอนต์มาเก็บไว้ในแอปตอน build
npm start       # รันได้โดยไม่ต้องมีเน็ต → http://localhost:3000
```

## รันบน server (pm2)

```bash
npm ci && npm run build
pm2 start ecosystem.config.js
pm2 save        # จำ process ไว้; ใช้ `pm2 startup` เพื่อให้เริ่มเองเมื่อเครื่องรีบูต
```

## ให้ browser ใช้ GPU แยก (สำคัญสำหรับเครื่อง Demo)

เครื่อง Demo มี GPU 2 ตัว (Radeon 780M ในตัว + RTX 4060) และ browser เลือกใช้ GPU ในตัวเป็นค่าเริ่มต้น (PLAN R16) ทำให้ 3D ช้าลง

1. Windows **Settings › System › Display › Graphics**
2. เลือก Microsoft Edge / Google Chrome → **Options** → **High performance** (NVIDIA GeForce RTX 4060) → Save
3. ปิด browser ทุกหน้าต่างแล้วเปิดใหม่ — หน้าแรกของแอปแสดงชื่อ GPU ที่ browser ใช้อยู่ (หรือดูที่ `edge://gpu` / `chrome://gpu`)
4. เสียบสายชาร์จตอน Demo

## คำสั่งสำหรับพัฒนา

| คำสั่ง                                            | ใช้ทำอะไร                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                     | dev server                                                                                                            |
| `npm run lint` / `npm run typecheck` / `npm test` | ตรวจโค้ด (CI รันชุดเดียวกัน + build)                                                                                  |
| `npm run format`                                  | จัดรูปแบบโค้ดด้วย Prettier                                                                                            |
| `npm run extract-assets`                          | แตกรูป base64 จากต้นแบบเป็น WebP ใน `public/images/`                                                                  |
| `npm run capture-baseline`                        | ถ่าย screenshot ต้นแบบทุก view / โหมด / มุมกล้อง ไว้ที่ `reference/screens/` (ใช้ Microsoft Edge ที่ติดตั้งในเครื่อง) |
