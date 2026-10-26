// Guided tour (prototype TOUR L411). Only steps whose view is finished go in a
// set — no placeholder steps during a demo (PLAN 5).
import type { TourStep } from "@/types";

const STEPS = {
  property: {
    view: "twin",
    zone: "all",
    title: "See the whole property",
    body: "หมุนอาคาร 3D ที่อ้างอิงฟาซาดจากภาพ PRM Hospitality · Mall และ Hotel ใช้ข้อมูลร่วมกัน แต่แยกมุมมองการปฏิบัติการ",
  },
  interior: {
    view: "twin",
    mode: "xray",
    title: "Explore the digital interior",
    body: "โมเดล X-ray แสดงโครงสร้างและงานระบบจำลอง เปลี่ยนชั้นจากเมนูเพื่อดูผังตัวอย่าง",
  },
  ioc: {
    view: "ioc",
    zone: "mall",
    title: "From alert to action",
    body: "IOC รวมเหตุการณ์และภาพ CCTV สังเคราะห์ คลิกเหตุการณ์เพื่อ Verify → Dispatch → Resolve",
  },
  energy: {
    view: "energy",
    title: "Test an energy scenario",
    body: "ทดลองปรับ Setpoint 24°C → 25°C หรือเปลี่ยน Occupancy ผลคำนวณใช้สมมติฐานและไม่มีคำสั่งควบคุมจริง",
  },
  hotel: {
    view: "hotel",
    floor: "H12",
    title: "Understand hotel operations",
    body: "600 ห้องจำลองเชื่อมสถานะ Occupied / Ready / Cleaning / Maintenance เลือกห้องเพื่อดูรายละเอียด",
  },
  ai: {
    view: "ai",
    zone: "all",
    title: "Ask the building",
    body: "ถาม “สรุปสถานการณ์อาคารวันนี้” เพื่อรับคำตอบจากข้อมูลจำลองในหน้านี้ แบบ Rule-based ไม่ใช่ LLM ที่เชื่อมต่อจริง",
  },
} satisfies Record<string, TourStep>;

export type TourSetId = "mvp" | "full";

export const TOURS: Record<TourSetId, readonly TourStep[]> = {
  mvp: [STEPS.property, STEPS.interior, STEPS.energy, STEPS.hotel],
  full: [STEPS.property, STEPS.interior, STEPS.ioc, STEPS.energy, STEPS.hotel, STEPS.ai],
};

/** Set used by "เริ่มสาธิต" until Phase 7 completes the remaining views */
export const ACTIVE_TOUR: TourSetId = "mvp";
