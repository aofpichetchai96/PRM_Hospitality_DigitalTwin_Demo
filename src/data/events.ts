// Incidents and alarms with their work-order owners (prototype state L342,
// simulate L390). One list feeds Case Management, Alarm & Events and the AI.
import type { Incident, IncidentType, Priority } from "@/types";
import { equipmentTop, isRoofEquipment, roofEquipment } from "./assets";

/** Alarm status: New → Acknowledged → In progress → Closed */
export const INCIDENT_STEPS = ["New", "Acknowledged", "In progress", "Closed"] as const;
export const INCIDENT_STEPS_TH = ["ใหม่", "รับทราบ", "กำลังแก้ไข", "ปิดแล้ว"] as const;
/** Button that moves an alarm on from each status */
export const NEXT_STEP: readonly string[] = ["Acknowledge", "Start work", "Close"];

export const SEVERITY: Record<Priority, { label: string; th: string }> = {
  high: { label: "Critical", th: "วิกฤต" },
  medium: { label: "Major", th: "สำคัญ" },
  low: { label: "Minor", th: "เล็กน้อย" },
};

export const INITIAL_INCIDENTS: readonly Incident[] = [
  {
    id: "INC-001",
    title: { th: "ประตู Service L2 เปิดค้าง", en: "Service door held open" },
    location: "L2 · Service access",
    floor: "L2",
    position: [38, 10, 24],
    priority: "high",
    status: 0,
    type: "security",
    time: "14:26",
    owner: "Security supervisor",
    assetCode: "PRM-L2-ACS-DR-07",
    reading: { metric: "Door held open", value: "4 min", threshold: "≤ 1 min" },
    sop: "security",
  },
  {
    id: "INC-002",
    title: { th: "อุณหภูมิลมจ่าย AHU-H12 สูง", en: "AHU supply-air advisory" },
    location: "H12 · Hotel HVAC",
    floor: "H12",
    position: [-12, 78, 3],
    priority: "medium",
    status: 0,
    type: "ahu",
    time: "14:22",
    owner: "Engineering team",
    assetCode: "PRM-H12-HVAC-AHU-12",
    device: "ahu",
    reading: { metric: "Supply air", value: "17.8 °C", threshold: "14–16 °C" },
    sop: "ahu",
  },
  {
    id: "INC-003",
    title: { th: "ประสิทธิภาพ Chiller ควรตรวจสอบ", en: "Chiller efficiency advisory" },
    location: "Central plant · CH-01",
    position: [56, 6, -26],
    priority: "medium",
    status: 0,
    type: "plant",
    time: "14:18",
    owner: "Energy manager",
    assetCode: "PRM-CP-HVAC-CH-01",
    device: "plant",
    reading: { metric: "Chiller COP", value: "5.2", threshold: "≥ 5.8" },
    sop: "chillerEfficiency",
  },
];

export type ScenarioId = "ctTrip" | "chwsHigh" | "pumpVibration" | "leak" | "crowd";

const CT_02 = roofEquipment("CT-02");
const P_03 = roofEquipment("P-03");
const T_01 = roofEquipment("T-01");

/**
 * Abnormal situations the presenter can inject (Shift+1…5 or "จำลองเหตุการณ์"); without a choice
 * they come in this order. The rooftop ones blink on their unit in Back of House.
 */
export const SCENARIOS: Record<ScenarioId, Omit<Incident, "id" | "status" | "time">> = {
  ctTrip: {
    title: { th: "พัดลม Cooling tower CT-02 หยุดทำงาน (Fan trip)", en: "Cooling tower fan trip" },
    type: "plant",
    location: "Roof · Cooling tower CT-02",
    floor: "H30",
    position: equipmentTop(CT_02),
    priority: "high",
    owner: "Engineering team",
    assetCode: CT_02.code,
    device: "CT-02",
    reading: { metric: "Fan current", value: "0 A", threshold: "> 5 A when running" },
    sop: "ctTrip",
  },
  chwsHigh: {
    title: { th: "อุณหภูมิน้ำเย็นจ่าย (CHWS) ของ CH-01 เกินเกณฑ์", en: "Chilled-water supply temperature high" },
    type: "plant",
    location: "Central plant · CH-01",
    position: [56, 6, -26],
    priority: "medium",
    owner: "Energy manager",
    assetCode: "PRM-CP-HVAC-CH-01",
    device: "plant",
    reading: { metric: "CHWS temperature", value: "9.2 °C", threshold: "≤ 7.0 °C" },
    sop: "chwsHigh",
  },
  pumpVibration: {
    title: { th: "แรงสั่นสะเทือนปั๊ม P-03 สูง", en: "Pump vibration high" },
    type: "plant",
    location: "Roof · Condenser water pump P-03",
    floor: "H30",
    position: equipmentTop(P_03),
    priority: "low",
    owner: "Engineering team",
    assetCode: P_03.code,
    device: "P-03",
    reading: { metric: "Vibration", value: "7.1 mm/s", threshold: "≤ 4.5 mm/s" },
    sop: "vibration",
  },
  leak: {
    title: { th: "พบน้ำรั่วที่ฐานถังเก็บน้ำ T-01", en: "Water leak at tank T-01" },
    type: "leak",
    location: "Roof · Water storage tank T-01",
    floor: "H30",
    position: equipmentTop(T_01),
    priority: "high",
    owner: "Engineering team",
    assetCode: T_01.code,
    device: "T-01",
    reading: { metric: "Leak sensor", value: "Wet", threshold: "Dry" },
    sop: "leak",
  },
  crowd: {
    title: { th: "ความหนาแน่นคนในโถง Lobby เพิ่มสูง", en: "Crowd-density advisory" },
    type: "people",
    location: "G · Lobby lounge",
    floor: "G",
    position: [-20, 2, 17],
    priority: "medium",
    owner: "Front office",
    assetCode: "PRM-G-PEOPLE-ZN-02",
    reading: { metric: "Occupancy vs capacity", value: "113%", threshold: "≤ 80%" },
    sop: "crowd",
  },
};
export const SCENARIO_ORDER: readonly ScenarioId[] = ["ctTrip", "chwsHigh", "pumpVibration", "leak", "crowd"];

/** Where an incident's evidence comes from (shown in the event modal and the incoming alert) */
export function incidentSource(type: IncidentType): string {
  if (type === "security") return "ACS event + synthetic CCTV";
  if (type === "leak") return "Water sensor + BMS mock feed";
  if (type === "people") return "People counting + synthetic CCTV";
  return "BMS + energy / asset mock feed";
}

/** Response-time target the incoming alert counts down from (minutes, demo assumption) */
export const RESPONSE_SLA_MIN = { high: 5, medium: 15, low: 30 } as const;

/** What the platform prepares the moment an alert arrives (steps tick in one by one); people approve any dispatch */
export function autoResponse(e: Pick<Incident, "type" | "owner" | "priority">): string[] {
  const watch =
    e.type === "security" || e.type === "people"
      ? "เปิดกล้อง CCTV ใกล้จุดเกิดเหตุ"
      : "ดึงค่า Sensor และแนวโน้มย้อนหลัง 24 ชม.";
  return [
    "ระบุตำแหน่งบนโมเดล 3D",
    watch,
    `แนะนำแจ้ง ${e.owner} · รอผู้ปฏิบัติงานยืนยัน`,
    `เริ่มนับ SLA ตอบสนอง ${RESPONSE_SLA_MIN[e.priority]} นาที`,
  ];
}

const URGENCY: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Open alarm on a unit the Back of House view can point at: a rooftop unit or the chiller plant */
export const onPlantUnit = (e: Incident) =>
  e.status < 3 && (e.device === "plant" || (e.device !== undefined && isRoofEquipment(e.device)));

/** The alarm Back of House frames and explains: the focused one if it is on a plant unit, else the most urgent */
export function plantAlarm(incidents: readonly Incident[], focus: string | null) {
  const open = incidents.filter(onPlantUnit);
  return (
    open.find((e) => e.id === focus) ??
    [...open].sort((a, b) => URGENCY[a.priority] - URGENCY[b.priority] || a.status - b.status)[0]
  );
}
