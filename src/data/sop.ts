// SOP library: check-and-fix steps per alarm type, grouped by the alarm
// workflow stage they belong to (1 Acknowledged · 2 In progress · 3 Close).
// Ticked on the alarm's checklist. Example procedures for the demo, not SOPs
// approved for the project: a real deployment uses the owner's own.
import type { SopId } from "@/types";

export interface SopStep {
  /** Workflow stage the step belongs to: 1 verify, 2 fix, 3 close out */
  stage: 1 | 2 | 3;
  text: string;
}
export interface Sop {
  id: SopId;
  title: string;
  /** Who leads it */
  team: string;
  /** Usual causes, shown with the alarm so the operator knows where to look first */
  cause: string;
  steps: readonly SopStep[];
}

export const SOP_STAGE_LABEL = { 1: "ตรวจสอบ", 2: "แก้ไข", 3: "ปิดงาน" } as const;

export const SOPS: Record<SopId, Sop> = {
  ctTrip: {
    id: "ctTrip",
    title: "Cooling tower fan trip",
    team: "Engineering",
    cause: "Overload ทริปเพราะมอเตอร์ร้อนเกิน สายพานหย่อนหรือขาด หรือใบพัดติดขัด",
    steps: [
      { stage: 1, text: "ตรวจสถานะ Breaker / Overload ที่ MCC ของ CT-02 ผ่าน BMS" },
      { stage: 1, text: "ยืนยันว่า Cooling tower อีก 2 ชุดรับภาระแทนได้ (อุณหภูมิน้ำออก ≤ 32 °C)" },
      { stage: 2, text: "Lock-out / Tag-out แล้วตรวจสายพาน ใบพัด และฉนวนมอเตอร์ที่หน้างาน" },
      { stage: 2, text: "Reset overload และสั่งเดินทดสอบ วัดกระแสทั้ง 3 เฟส" },
      { stage: 3, text: "เฝ้าดูกระแสและอุณหภูมิน้ำ 30 นาที แล้วบันทึกสาเหตุในใบงาน" },
    ],
  },
  chwsHigh: {
    id: "chwsHigh",
    title: "Chilled-water supply temperature high",
    team: "Engineering · Energy",
    cause: "Chiller รับภาระไม่พอ Setpoint ถูกปรับ ปั๊มน้ำเย็นหรือวาล์วผิดปกติ หรือ Condenser ระบายความร้อนได้น้อย",
    steps: [
      { stage: 1, text: "ตรวจ Setpoint CHWS และสถานะ Chiller / ปั๊มน้ำเย็นที่เดินอยู่" },
      { stage: 1, text: "เทียบภาระความเย็นกับจำนวน Chiller ที่เดิน (Load vs. capacity)" },
      { stage: 2, text: "เดิน Chiller สำรองหรือปรับลำดับการเดิน (Sequencing) ตามภาระ" },
      { stage: 2, text: "ตรวจ Condenser water: อุณหภูมิเข้า Chiller และการทำงานของ Cooling tower" },
      { stage: 3, text: "ยืนยัน CHWS กลับมา ≤ 7 °C ต่อเนื่อง 15 นาที และบันทึกผล" },
    ],
  },
  vibration: {
    id: "vibration",
    title: "Pump vibration high",
    team: "Engineering",
    cause: "ลูกปืนสึก ศูนย์เพลาเคลื่อน ใบพัดไม่สมดุล หรือขาตั้งหลวม",
    steps: [
      { stage: 1, text: "ดูแนวโน้มแรงสั่น 24 ชม. ว่าเพิ่มต่อเนื่องหรือกระโดดทันที" },
      { stage: 1, text: "ฟังเสียงและวัดอุณหภูมิ Bearing ที่หน้างาน" },
      { stage: 2, text: "สลับไปเดินปั๊มสำรอง (Standby) แล้วหยุดปั๊ม P-03" },
      { stage: 2, text: "ตรวจ Alignment ฐานยึด และ Coupling" },
      { stage: 3, text: "วางแผนเปลี่ยน Bearing ใน CMMS และบันทึกค่าแรงสั่นหลังแก้ไข" },
    ],
  },
  leak: {
    id: "leak",
    title: "Water leak",
    team: "Engineering · Security",
    cause: "ข้อต่อหรือวาล์วรั่ว ถังล้นเพราะลูกลอยเสีย หรือท่อแตก",
    steps: [
      { stage: 1, text: "ยืนยันจุดรั่วด้วย Leak sensor ข้างเคียงและกล้องบนดาดฟ้า" },
      { stage: 1, text: "กันพื้นที่และแจ้ง Security ห้ามเข้าใกล้ตู้ไฟฟ้า" },
      { stage: 2, text: "ปิดวาล์วแยก (Isolation valve) ของถังที่รั่ว" },
      { stage: 2, text: "ดูดน้ำออกและตรวจรอยรั่วที่ฐานถัง / ข้อต่อท่อ" },
      { stage: 3, text: "ตรวจความชื้นชั้นล่าง (H29) และบันทึกความเสียหายพร้อมภาพ" },
    ],
  },
  security: {
    id: "security",
    title: "Door held open",
    team: "Security",
    cause: "ประตูถูกค้างไว้ระหว่างขนของ Door closer เสีย หรือมีผู้ผ่านโดยไม่ได้รับอนุญาต",
    steps: [
      { stage: 1, text: "เปิดกล้องใกล้ประตูและดูสถานะประตูใน ACS" },
      { stage: 1, text: "ยืนยันกับเจ้าหน้าที่ประจำพื้นที่ว่ามีการขนของหรือไม่" },
      { stage: 2, text: "ส่ง รปภ. ไปปิดประตูและตรวจพื้นที่" },
      { stage: 3, text: "บันทึกสาเหตุและหลักฐานภาพ แล้วปิดงาน" },
    ],
  },
  ahu: {
    id: "ahu",
    title: "AHU supply air out of range",
    team: "Engineering",
    cause: "Chilled-water valve เปิดไม่พอ ฟิลเตอร์อุดตัน หรือ Setpoint ไม่เหมาะกับภาระ",
    steps: [
      { stage: 1, text: "ตรวจ Setpoint ลมจ่าย และการเปิดวาล์วน้ำเย็นของ AHU" },
      { stage: 1, text: "ดู Filter ΔP: ถ้าเกิน 250 Pa ให้วางแผนเปลี่ยนไส้กรอง" },
      { stage: 2, text: "ตรวจ Actuator วาล์วและ Sensor อุณหภูมิลมจ่ายที่หน้างาน" },
      { stage: 3, text: "ยืนยันลมจ่ายกลับเข้าช่วง 14–16 °C และบันทึกผล" },
    ],
  },
  chillerEfficiency: {
    id: "chillerEfficiency",
    title: "Chiller efficiency low",
    team: "Energy manager",
    cause: "Condenser tube สกปรกจน Approach สูง น้ำยาไม่พอ หรือเดินที่ภาระต่ำกว่าจุดประหยัด",
    steps: [
      { stage: 1, text: "เทียบ COP ปัจจุบันกับ Baseline ที่ภาระเดียวกัน" },
      { stage: 2, text: "ตรวจ Approach temperature ของ Condenser / Evaporator" },
      { stage: 2, text: "วางแผนล้าง Condenser tube ถ้า Approach สูงกว่าเกณฑ์" },
      { stage: 3, text: "บันทึก COP หลังปรับปรุงเพื่อติดตามผลประหยัด" },
    ],
  },
  crowd: {
    id: "crowd",
    title: "Crowd density high",
    team: "Front office · Security",
    cause: "แขก Check-in พร้อมกันหลายกลุ่ม งานอีเวนต์ หรือคิวรถรับส่งที่ประตูหน้า",
    steps: [
      { stage: 1, text: "ดูกล้องและ Heatmap ของโซนที่หนาแน่น" },
      { stage: 2, text: "เปิดเคาน์เตอร์ Check-in เพิ่มและจัดแถว" },
      { stage: 2, text: "แจ้ง Security ช่วยจัดเส้นทางเดินไป Lift hall" },
      { stage: 3, text: "ยืนยันความหนาแน่นกลับต่ำกว่าเกณฑ์ แล้วปิดงาน" },
    ],
  },
};
