// Business value and delivery roadmap for the sales pitch (Value / ROI and
// Roadmap pages, executive showcase). Every figure is an assumption to frame
// the conversation — real savings need measurement and verification (M&V).
import { computeEnergy, REFERENCE_SETPOINT } from "./energy";

/** Annual cooling saving at 25 °C against the 24 °C base, with the t0 hotel / mall load */
const t0At25 = computeEnergy({
  occupancy: 0.84,
  setpoint: REFERENCE_SETPOINT + 1,
  outdoor: 32,
  footfallFactor: 1,
  operatingHours: 16,
  tariff: 4.5,
});
export const ANNUAL_ENERGY_SAVING_THB = t0At25.dayCost * 365;

export interface ValueMetric {
  id: "mttr" | "turnaround" | "energy" | "reporting";
  label: string;
  before: string;
  after: string;
  /** Short "−38%" style change */
  change: string;
  how: string;
}

const millions = (thb: number) => `${(thb / 1e6).toFixed(1)} ล้าน ฿`;

export const VALUE_METRICS: readonly ValueMetric[] = [
  {
    id: "mttr",
    label: "เวลาปิดเหตุการณ์ (MTTR)",
    before: "45 นาที",
    after: "28 นาที",
    change: "−38%",
    how: "เห็นตำแหน่ง กล้อง และทีมที่ต้องแจ้งในหน้าเดียว ผู้ปฏิบัติงานยืนยันก่อนสั่งงาน",
  },
  {
    id: "turnaround",
    label: "เวลาเตรียมห้องให้พร้อมขาย",
    before: "55 นาที",
    after: "40 นาที",
    change: "−27%",
    how: "แม่บ้านปิดงานแล้วฝ่ายต้อนรับเห็นห้องพร้อมขายทันที ไม่ต้องโทรตาม",
  },
  {
    id: "energy",
    label: "ค่าไฟที่ประหยัดได้ต่อปี",
    before: "ฐาน 24°C",
    after: `≈ ${millions(ANNUAL_ENERGY_SAVING_THB)}`,
    change: "Setpoint +1°C",
    how: "ปรับ Setpoint ในพื้นที่ที่เหมาะสมโดยดู Comfort risk ประกอบ",
  },
  {
    id: "reporting",
    label: "เวลาทำรายงานสถานการณ์ประจำวัน",
    before: "120 นาที",
    after: "20 นาที",
    change: "−83%",
    how: "สรุปจาก Dashboard และ AI Assistant แทนการรวบรวมจากหลายระบบ",
  },
];

export const valueMetric = (id: ValueMetric["id"]) => VALUE_METRICS.find((m) => m.id === id)!;

export interface RoadmapPhase {
  phase: string;
  title: string;
  scope: readonly string[];
  prerequisite: string;
  note: string;
}

export const ROADMAP: readonly RoadmapPhase[] = [
  {
    phase: "เฟส 1",
    title: "มองเห็นและพลังงาน",
    scope: ["3D Digital Twin ของโครงการ", "BMS / Energy dashboard (อ่านข้อมูลอย่างเดียว)", "Executive overview"],
    prerequisite: "BIM / IFC และ Data point list",
    note: "ความเสี่ยงต่ำสุด เหมาะเป็นจุดเริ่มสัญญา",
  },
  {
    phase: "เฟส 2",
    title: "ปฏิบัติการ IOC",
    scope: ["Incident workflow + Human approval", "CCTV ในหน้าเดียวกับโมเดล", "Access control"],
    prerequisite: "VMS SDK / WebRTC และสิทธิ์ ACS",
    note: "ขยายเมื่อได้สิทธิ์เข้าถึงระบบกล้องและประตู",
  },
  {
    phase: "เฟส 3",
    title: "โรงแรมและ AI",
    scope: ["PMS / Housekeeping status", "AI Assistant ผ่าน LLM (อ่านข้อมูลอย่างเดียว)", "รายงานอัตโนมัติ"],
    prerequisite: "PMS API และ License จากผู้ขาย",
    note: "การสั่งงานยังต้องให้คนอนุมัติทุกครั้ง",
  },
];
