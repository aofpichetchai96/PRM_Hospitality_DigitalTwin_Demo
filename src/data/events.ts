// Incidents and work-order owners (prototype state L342, simulate L390)
import type { Incident, IncidentType } from "@/types";

export const INCIDENT_STEPS = ["Detected", "Verified", "Dispatched", "Resolved"] as const;
export const INCIDENT_STEPS_TH = ["ตรวจพบ", "ตรวจสอบ", "มอบหมาย", "ปิดเหตุการณ์"] as const;

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
  },
  {
    id: "INC-003",
    title: { th: "ประสิทธิภาพ Chiller ควรตรวจสอบ", en: "Chiller efficiency advisory" },
    location: "Central plant · CH-01",
    position: [58, 6, -18],
    priority: "medium",
    status: 0,
    type: "plant",
    time: "14:18",
    owner: "Energy manager",
    assetCode: "PRM-CP-HVAC-CH-01",
  },
];

/** "Simulate incident" cycles through these (prototype L390) */
export const SIMULATED_INCIDENTS: readonly Omit<Incident, "id" | "status" | "time">[] = [
  {
    title: { th: "พบสัญญาณน้ำรั่วในพื้นที่ Plant", en: "Water leak sensor alert" },
    type: "leak",
    location: "Central plant · Water loop",
    position: [56, 4, -12],
    priority: "high",
    owner: "Engineering team",
    assetCode: "PRM-CP-WATER-LS-02",
  },
  {
    title: { th: "ความหนาแน่นคนในโถงเพิ่มสูง", en: "Crowd-density advisory" },
    type: "people",
    location: "G · Retail arrival",
    floor: "G",
    position: [-24, 5, 32],
    priority: "medium",
    owner: "Mall operations",
    assetCode: "PRM-G-PEOPLE-ZN-01",
  },
  {
    title: { th: "อุณหภูมิพื้นที่ Hotel ต้องตรวจสอบ", en: "Hotel comfort advisory" },
    type: "ahu",
    location: "H12 · Hotel corridor",
    floor: "H12",
    position: [-12, 78, 3],
    priority: "medium",
    owner: "Hotel engineering",
    assetCode: "PRM-H12-HVAC-AHU-12",
  },
];

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
