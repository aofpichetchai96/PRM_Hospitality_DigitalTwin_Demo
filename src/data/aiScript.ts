// Rule-based AI Assistant for the building (prototype ask() L394–404, extended). An
// intent router sends each question to one of six topics; every answer comes
// in three parts — the data (numbers, source and time window), the analysis,
// and the AI recommendation (for alarms: the SOP) — built only from the
// simulated state passed in. Offline: no network, no LLM. Text uses **bold**
// and blank lines between paragraphs.
import { fmt } from "@/lib/format";
import type { AssetMetric, EnergyResult, FloorPlanId, Incident, PlanZone, ViewId, WorkOrder } from "@/types";
import { type AirReading, aqiBand } from "./airQuality";
import { comfortRisk, OTHER_LOADS_KW } from "./energy";
import { INCIDENT_STEPS, SEVERITY } from "./events";
import { FLOOR_PLANS } from "./floorPlans";
import { KPI_YESTERDAY } from "./kpis";
import { DENSITY_LABEL, type ZoneReading } from "./publicZones";
import { PRECOOL_KW, STANDBY_KW } from "./rooms";
import { SOP_STAGE_LABEL, SOPS } from "./sop";

export type Intent = "building" | "energy" | "rooms" | "public" | "alarms" | "recommend";

export const INTENT_LABEL: Record<Intent, string> = {
  building: "Building information",
  energy: "Energy consumption",
  rooms: "Occupancy & Guest Room",
  public: "Lobby & Public Area",
  alarms: "Alarm & Events",
  recommend: "AI Recommendations",
};

type Chip = { label: string; question: string };

/** Suggested questions follow the open scene */
export const QUICK_CHIPS: Record<ViewId, readonly Chip[]> = {
  executive: [
    { label: "สรุปอาคาร", question: "สรุปสถานะอาคารตอนนี้" },
    { label: "ค่าไฟวันนี้", question: "ทำไมค่าไฟสูงวันนี้" },
    { label: "เคสค้าง", question: "มี Alarm หรือเหตุการณ์อะไรค้างอยู่" },
    { label: "ลดการใช้พลังงาน", question: "แนะนำวิธีลดการใช้พลังงาน" },
  ],
  twin: [
    { label: "สรุปอาคาร", question: "สรุปสถานะอาคารตอนนี้" },
    { label: "ชั้นที่เลือก", question: "ข้อมูลชั้นที่เลือก" },
    { label: "Lobby หนาแน่นไหม", question: "Lobby หนาแน่นไหม คนเข้าออกเท่าไร" },
    { label: "คุณภาพอากาศ", question: "คุณภาพอากาศในอาคารเทียบภายนอกเป็นอย่างไร" },
  ],
  ioc: [
    { label: "Alarm ค้าง", question: "มี Alarm อะไรค้างอยู่" },
    { label: "ทำตาม SOP", question: "ควรแก้ Alarm นี้ตาม SOP อย่างไร" },
    { label: "Lobby หนาแน่นไหม", question: "Lobby หนาแน่นไหม คนเข้าออกเท่าไร" },
  ],
  energy: [
    { label: "ค่าไฟวันนี้", question: "ทำไมค่าไฟสูงวันนี้" },
    { label: "ลดการใช้พลังงาน", question: "แนะนำวิธีลดการใช้พลังงาน" },
    { label: "ไฟฟ้าห้องพัก", question: "ห้องพักใช้ไฟฟ้าเท่าไร" },
  ],
  overview: [
    { label: "สรุปอาคาร", question: "สรุปสถานะอาคารตอนนี้" },
    { label: "ค่าไฟวันนี้", question: "ทำไมค่าไฟสูงวันนี้" },
    { label: "เคสค้าง", question: "มี Alarm หรือเหตุการณ์อะไรค้างอยู่" },
    { label: "คุณภาพอากาศ", question: "คุณภาพอากาศในอาคารเทียบภายนอกเป็นอย่างไร" },
  ],
  rooms: [
    { label: "ห้องว่างกี่ห้อง", question: "ห้องพักว่างพร้อมขายกี่ห้อง" },
    { label: "แขกเข้าพักวันนี้", question: "วันนี้มีแขก Check-in กี่ห้อง" },
    { label: "ไฟฟ้าห้องพัก", question: "ห้องพักใช้ไฟฟ้าเท่าไร" },
    { label: "ชั้นที่เลือก", question: "ข้อมูลชั้นที่เลือก" },
  ],
  public: [
    { label: "Lobby หนาแน่นไหม", question: "Lobby หนาแน่นไหม คนเข้าออกเท่าไร" },
    { label: "AQI ราย Zone", question: "คุณภาพอากาศแต่ละ Zone ใน Lobby" },
    { label: "ข้อเสนอแนะ Lobby", question: "แนะนำการจัดการ Lobby และคุณภาพอากาศ" },
  ],
  boh: [
    { label: "Alarm ค้าง", question: "มี Alarm อะไรค้างอยู่" },
    { label: "ทำตาม SOP", question: "ควรแก้ Alarm นี้ตาม SOP อย่างไร" },
    { label: "อุปกรณ์ที่ต้องดูแล", question: "อุปกรณ์ใดต้องซ่อมบำรุง" },
  ],
  ai: [
    { label: "สรุปอาคาร", question: "สรุปสถานะอาคารตอนนี้" },
    { label: "ลดการใช้พลังงาน", question: "แนะนำวิธีลดการใช้พลังงาน" },
    { label: "จัดการคุณภาพอากาศ", question: "แนะนำการจัดการคุณภาพอากาศ" },
    { label: "Alarm & SOP", question: "มี Alarm อะไรค้างอยู่ และควรทำอะไรก่อน" },
  ],
};

export const GREETING = {
  title: "สวัสดีครับ ผมคือ AI Assistant ประจำอาคาร PRM Hospitality",
  body: "ถามได้ 6 เรื่อง: ข้อมูลอาคาร · พลังงาน · ห้องพัก · Lobby และคุณภาพอากาศ · Alarm & Events · ข้อเสนอแนะ",
  note: "ทุกคำตอบแยกเป็น ข้อมูล / การวิเคราะห์ / ข้อเสนอแนะ AI และบอกแหล่งข้อมูลกับช่วงเวลา · ตอบจากข้อมูลจำลองในหน้านี้",
};

export interface AskContext {
  /** Scene open when the question was asked */
  view: ViewId;
  time: string;
  energy: EnergyResult;
  /** Same building at a 25 °C setpoint, for the saving recommendation */
  energyAt25: EnergyResult;
  counts: { occupied: number; reserved: number; available: number };
  guests: { inHouse: number; arrivals: number; checkedInToday: number };
  footfall: number;
  openIncidents: readonly Incident[];
  cases: { open: number; pending: number; resolved: number };
  workOrders: readonly WorkOrder[];
  scenario: { outdoor: number; setpoint: number; tariff: number; operatingHours: number };
  air: { indoor: AirReading; outdoor: AirReading };
  lobby: {
    people: number;
    entrance: { in: number; out: number };
    zones: readonly ZoneReading[];
    busiest: ZoneReading;
    avgAqi: number;
  };
  /** What is selected in 3D */
  selection: { label: string; assetName: string; assetCode: string; metrics: AssetMetric[] };
  plan: { open: boolean; type: FloorPlanId; selectedZone: string };
}

export interface Answer {
  /** Topic the router chose; undefined for the side answers (floor plan, facade, greeting, fallback) */
  intent?: Intent;
  /** Facts and numbers — the same selectors as the KPI strip and the panels */
  data: string;
  analysis?: string;
  recommendation?: string;
  /** Incident whose SOP the recommendation points to (opens its checklist) */
  sopFor?: string;
  source: string;
  /** Time window the data covers */
  period: string;
}

const SELECTED = /พื้นที่ที่เลือก|selected|บริเวณนี้|ชั้นนี้|ชั้นที่เลือก/;
const SIM = "SIM · ข้อมูลจำลอง";
const now = (ctx: AskContext) => `ณ ${ctx.time} วันนี้`;
const today = (ctx: AskContext) => `06:00–${ctx.time} วันนี้`;

/** Full zone name first, then a distinctive word of it ("library" → Library gallery) */
function findZone(q: string, zones: readonly PlanZone[]) {
  const name = (z: PlanZone) => z.name.toLowerCase();
  return (
    zones.find((z) => q.includes(name(z))) ??
    zones.find((z) =>
      name(z)
        .split(" ")
        .some((w) => w.length >= 6 && q.includes(w)),
    )
  );
}

function planAnswer(q: string, ctx: AskContext): Answer {
  let type = ctx.plan.type;
  for (const plan of Object.values(FLOOR_PLANS)) if (findZone(q, plan.zones)) type = plan.id;
  if (/พื้นที่ส่วนกลาง|social floor/.test(q)) type = "social";
  if (/แปลนที่พัก|private residences/.test(q)) type = "residence";
  const p = FLOOR_PLANS[type];
  const z =
    findZone(q, p.zones) ??
    (type === ctx.plan.type ? p.zones.find((zone) => zone.id === ctx.plan.selectedZone) : undefined) ??
    p.zones[0];
  return {
    data: `**PRM Hospitality · ${p.label}**\n\n**${z.name}**\n${z.desc}`,
    analysis: z.ideas,
    recommendation:
      "แปลนนี้เป็นภาพอ้างอิงที่ให้มา ยังไม่ได้ผูกกับชั้นจริงหรือข้อมูลห้องพัก 600 ห้อง ระบบจริงจะใช้แบบ BIM ล่าสุดของโครงการ",
    source: "ภาพอ้างอิงผู้ใช้ · คำอธิบายโซนที่จัดเตรียมไว้",
    period: "ข้อมูลอ้างอิงคงที่",
  };
}

const sevCount = (open: readonly Incident[]) =>
  (["high", "medium", "low"] as const)
    .map((p) => [p, open.filter((x) => x.priority === p).length] as const)
    .filter(([, n]) => n > 0)
    .map(([p, n]) => `${SEVERITY[p].label} ${n}`)
    .join(" · ") || "ไม่มี";

/** Worst open alarm first: severity, then still new, then newest */
function topAlarm(open: readonly Incident[]) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...open].sort((a, b) => rank[a.priority] - rank[b.priority] || a.status - b.status)[0];
}

/** The next unticked-stage SOP steps of an alarm, as a numbered list */
function sopSteps(e: Incident, limit = 3) {
  const stage = e.status <= 1 ? 1 : e.status === 2 ? 2 : 3;
  const steps = SOPS[e.sop].steps.filter((s) => s.stage >= stage).slice(0, limit);
  return steps.map((s, i) => `${i + 1}. ${s.text} (${SOP_STAGE_LABEL[s.stage]})`).join("\n");
}

const air = (r: AirReading) =>
  `AQI ${r.aqi} (${aqiBand(r.aqi).th} · ${aqiBand(r.aqi).label}) · PM2.5 ${fmt(r.pm25, 1)} µg/m³ · CO₂ ${fmt(r.co2)} ppm`;

// ------------------------------------------------------------- six topics

function building(ctx: AskContext): Answer {
  const { energy: e, counts: c, cases, openIncidents: open, lobby, air: a } = ctx;
  const critical = open.filter((x) => x.priority === "high");
  const hotelShare = (e.hotel / e.current) * 100;
  return {
    intent: "building",
    data: `**PRM Hospitality · ${ctx.time}**\nHotel occupancy **${fmt(c.occupied / 6)}%** (${c.occupied}/600 · จอง ${c.reserved} · ว่าง ${c.available})\nBuilding demand **${fmt(e.current)} kW**\nIndoor ${air(a.indoor)}\nLobby ${lobby.people} คน · Mall footfall ${fmt(ctx.footfall)}\nCases: Open ${cases.open} · Pending ${cases.pending} · Resolved ${cases.resolved}`,
    analysis: `Hotel cooling เป็นภาระหลัก ${fmt(hotelShare)}% ของไฟฟ้าทั้งอาคาร · อากาศภายใน${
      a.indoor.aqi < a.outdoor.aqi ? "ดีกว่า" : "แย่กว่า"
    }ภายนอก (AQI ${a.indoor.aqi} vs ${a.outdoor.aqi}) · ${
      critical.length
        ? `มี Alarm ระดับ Critical ${critical.length} รายการ ต้องจัดการก่อน`
        : "ไม่มี Alarm ระดับ Critical"
    }`,
    recommendation: [
      critical.length
        ? `จัดการ ${critical[0].id} ${critical[0].title.th} ตาม SOP`
        : open.length
          ? `ติดตามเคสที่ค้าง ${open.length} รายการให้ปิดภายใน SLA`
          : "ไม่มีเคสค้าง รักษาสถานะปัจจุบัน",
      `ลอง Setpoint 25 °C ลดไฟได้ประมาณ ${fmt(ctx.energy.current - ctx.energyAt25.current)} kW`,
      `เตรียม ${c.reserved} ห้องที่แขกจะเข้าพักวันนี้ (Pre-cool ก่อนเวลามาถึง)`,
    ].join("\n"),
    sopFor: critical[0]?.id,
    source: `${SIM} · PMS + EMS + IAQ + People counting + BMS / ACS alarms`,
    period: `${now(ctx)} · Footfall และ Cases สะสม ${today(ctx)}`,
  };
}

function energy(ctx: AskContext): Answer {
  const { energy: e, counts: c, scenario: s, energyAt25: e25 } = ctx;
  const save = e.current - e25.current;
  const hotelShare = (e.hotel / e.current) * 100;
  const atBase = Math.abs(e.savingPct) < 0.05;
  return {
    intent: "energy",
    data: `ความต้องการไฟฟ้าขณะนี้ **${fmt(e.current)} kW**\nHotel cooling ${fmt(e.hotel)} kW · Mall cooling ${fmt(e.mall)} kW · Other loads ${fmt(OTHER_LOADS_KW)} kW\nOccupancy ${fmt(c.occupied / 6)}% · Outdoor ${s.outdoor} °C · Setpoint ${s.setpoint} °C\nเมื่อวานเวลาเดียวกัน ${fmt(KPI_YESTERDAY.demand)} kW (ค่าสมมติ)`,
    analysis: `Hotel cooling คิดเป็น ${fmt(hotelShare)}% ของภาระ และแปรตาม Occupancy ${fmt(c.occupied / 6)}% กับอากาศภายนอก ${s.outdoor} °C · ${
      atBase
        ? "ตอนนี้ใช้ Setpoint ฐาน 24 °C"
        : `เทียบฐาน 24 °C ต่างกัน ${fmt(e.savingPct, 1)}% หรือ ${fmt(e.dayCost)} ฿/วัน`
    } · Demand ${e.current > KPI_YESTERDAY.demand ? "สูงกว่า" : "ต่ำกว่า"}เมื่อวาน ${fmt(Math.abs(e.current - KPI_YESTERDAY.demand))} kW`,
    recommendation:
      s.setpoint < 25
        ? `ปรับ Setpoint เป็น 25 °C ลดได้ประมาณ **${fmt(save)} kW** (${fmt((save / e.current) * 100, 1)}%) ≈ ${fmt(
            save * s.operatingHours * s.tariff,
          )} ฿/วัน · Comfort risk ${comfortRisk(25) === "low" ? "ต่ำ" : "กลาง"}\nห้องว่างคงโหมด Eco และ Pre-cool ห้องจองก่อนแขกมาถึง 2 ชม.\nทดลองได้ที่ปุ่มจำลอง Setpoint 25°C ในแท็บ Energy · ระบบจริงจะส่งคำแนะนำให้ผู้ปฏิบัติงานอนุมัติก่อนสั่งงาน BMS`
        : `Setpoint ${s.setpoint} °C ประหยัดแล้ว · ติดตาม Comfort ของแขก (risk ${comfortRisk(s.setpoint)}) และ COP ของ Chiller ก่อนปรับเพิ่ม`,
    source: `${SIM} · EMS + BMS + PMS · แบบจำลองเชิงเส้น · ไม่มีคำสั่งไปยังอาคาร`,
    period: `${now(ctx)} · ค่าไฟต่อวันคิด ${s.operatingHours} ชม. × ${s.tariff} ฿/kWh`,
  };
}

function rooms(ctx: AskContext): Answer {
  const { counts: c, guests: g, energy: e } = ctx;
  const precool = c.reserved * PRECOOL_KW;
  const selectedFloor = /^ชั้น H/.test(ctx.selection.label);
  return {
    intent: "rooms",
    data: `Inventory **600 ห้อง**\n🔴 Occupied **${c.occupied}** (${fmt(c.occupied / 6)}%) · ผู้เข้าพัก ${fmt(g.inHouse)} คน\n🟡 Reserved **${c.reserved}** (รอ Check-in วันนี้)\n🟢 Available **${c.available}**\nCheck-in แล้ววันนี้ ${g.checkedInToday} ห้อง · ไฟฟ้าห้องพักรวม ${fmt(e.hotel)} kW${
      selectedFloor
        ? `\n\n**${ctx.selection.label}:** ${ctx.selection.metrics.map((m) => `${m.label} ${m.value}${m.unit ? ` ${m.unit}` : ""}`).join(" · ")}`
        : ""
    }`,
    analysis: `Occupancy ${fmt(c.occupied / 6)}% ${c.occupied / 6 >= KPI_YESTERDAY.occupancy ? "สูงกว่า" : "ต่ำกว่า"}เมื่อวาน (${KPI_YESTERDAY.occupancy}%) · ห้องที่มีแขกใช้ไฟเฉลี่ย ${fmt(
      (e.hotel - precool - c.available * STANDBY_KW) / Math.max(1, c.occupied),
      2,
    )} kW/ห้อง · ห้องจอง ${c.reserved} ห้อง Pre-cool รวม ${fmt(precool, 1)} kW`,
    recommendation: `เตรียมห้อง Reserved ${c.reserved} ห้องให้พร้อมก่อนแขกมาถึง (Pre-cool 2 ชม. ก่อนเวลามาถึง)\nห้อง Available ${c.available} ห้องคงโหมด Eco · พิจารณาเปิดขายผ่าน OTA ช่วงเย็น\nระบบจริงจะอ่านสถานะจาก PMS และสั่ง GRMS อัตโนมัติตามนโยบายของโรงแรม`,
    source: `${SIM} · 600 local room records · PMS + GRMS mock state · ไม่มีข้อมูลแขกจริง`,
    period: `${now(ctx)} · Check-in นับ ${today(ctx)}`,
  };
}

function publicArea(ctx: AskContext): Answer {
  const { lobby, air: a } = ctx;
  const crowded = lobby.zones.filter((z) => z.level === "crowded" || z.level === "high");
  const worstAir = lobby.zones.reduce((x, y) => (y.air.aqi > x.air.aqi ? y : x));
  const crowdAlarm = ctx.openIncidents.find((x) => x.type === "people");
  return {
    intent: "public",
    data: `Lobby (ชั้น G) ตอนนี้ **${lobby.people} คน** · ประตูหลัก เข้า ${fmt(lobby.entrance.in)} / ออก ${fmt(lobby.entrance.out)}\n${lobby.zones
      .map(
        (z) =>
          `${z.zone.name}: ${z.people} คน (${Math.round(z.load * 100)}% · ${DENSITY_LABEL[z.level].label}) · AQI ${z.air.aqi} · CO₂ ${fmt(z.air.co2)}`,
      )
      .join("\n")}\nIndoor เฉลี่ย AQI ${lobby.avgAqi} · Outdoor ${air(a.outdoor)}`,
    analysis: `หนาแน่นสุด **${lobby.busiest.zone.name}** ${Math.round(lobby.busiest.load * 100)}% ของความจุ · ${
      crowded.length ? `${crowded.map((z) => z.zone.name).join(", ")} เกิน 80%` : "ทุก Zone ยังต่ำกว่า 80%"
    } · ${worstAir.zone.name} มี AQI สูงสุด (${worstAir.air.aqi}) ${
      worstAir.zone.doorAir > 0.05 ? "เพราะใกล้ประตูที่อากาศภายนอกเข้ามา" : "จากจำนวนคนในพื้นที่"
    }`,
    recommendation: crowdAlarm
      ? `ทำตาม SOP ${SOPS[crowdAlarm.sop].title}:\n${sopSteps(crowdAlarm)}`
      : `${crowded.length ? `เปิดเคาน์เตอร์เพิ่มและจัดเส้นทางไป Lift hall สำหรับ ${crowded[0].zone.name}` : "ความหนาแน่นปกติ ไม่ต้องเพิ่มกำลังคน"}\n${
          worstAir.air.aqi > 50
            ? `เพิ่ม Fresh air / ปิด Air curtain ให้สนิทบริเวณ ${worstAir.zone.name}`
            : "คุณภาพอากาศอยู่ในเกณฑ์ดี"
        }\nระบบจริงจะใช้ People counter และ IAQ sensor ราย Zone พร้อมแจ้งเตือนอัตโนมัติ`,
    sopFor: crowdAlarm?.id,
    source: `${SIM} · People counting (ข้อมูลรวม ไม่ระบุตัวตน) + IAQ sensor ราย Zone`,
    period: `${now(ctx)} · จำนวนเข้า-ออกสะสม ${today(ctx)}`,
  };
}

/** The alarm a question names by id ("INC-003 …"), else the most urgent open one */
function alarmAsked(open: readonly Incident[], q = "") {
  const id = /inc-\d+/i.exec(q)?.[0].toUpperCase();
  return open.find((x) => x.id === id) ?? topAlarm(open);
}

function alarms(ctx: AskContext, q = ""): Answer {
  const open = ctx.openIncidents;
  const top = alarmAsked(open, q);
  return {
    intent: "alarms",
    data: open.length
      ? `Alarm / เหตุการณ์ค้าง **${open.length}** (${sevCount(open)})\n\n${[...open]
          .sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])
          .slice(0, 5)
          .map(
            (x) =>
              `**${x.id}** [${SEVERITY[x.priority].label}] ${x.title.th}\n${x.location}${
                x.reading ? ` · ${x.reading.metric} ${x.reading.value} (limit ${x.reading.threshold})` : ""
              } · ${INCIDENT_STEPS[x.status]} · ${x.time}`,
          )
          .join("\n\n")}`
      : "ไม่มี Alarm หรือเหตุการณ์ค้าง",
    analysis: top
      ? `${top.id} ${top === topAlarm(open) ? "สำคัญที่สุด" : "ที่ถามถึง"} (${SEVERITY[top.priority].label}) ${top.reading ? `ค่าที่วัดได้ ${top.reading.value} เกินเกณฑ์ ${top.reading.threshold}` : ""} · สาเหตุที่เป็นไปได้: ${SOPS[top.sop].cause} · ผู้รับผิดชอบ ${top.owner} · Cases: Open ${ctx.cases.open} · Pending ${ctx.cases.pending}`
      : "ระบบทำงานปกติ",
    recommendation: top
      ? `ทำตาม SOP **${SOPS[top.sop].title}** (ขั้น ${INCIDENT_STEPS[top.status]}):\n${sopSteps(top)}\nกดเปิด Checklist เพื่อติ๊กทีละขั้น · ระบบจริงจะสร้างใบงานใน CMMS เมื่อผู้ปฏิบัติงานยืนยัน`
      : "ทดลองจำลองเหตุการณ์ได้ในฉาก Back of House (Shift+1–5)",
    sopFor: top?.id,
    source: `${SIM} · BMS + ACS alarm feed · SOP library ตัวอย่าง`,
    period: `${now(ctx)} · Alarm ตั้งแต่ 06:00`,
  };
}

function maintenance(ctx: AskContext): Answer {
  const devices = ctx.openIncidents.filter((x) => x.device);
  const top = topAlarm(devices);
  return {
    intent: "alarms",
    data: `อุปกรณ์ที่มี Alarm ค้าง **${devices.length}**\n${
      devices.map((x) => `${x.assetCode} · ${SEVERITY[x.priority].label} · ${x.title.th}`).join("\n") || "ไม่มี"
    }\nใบงาน ${ctx.workOrders.length} ใบ (${ctx.workOrders.filter((w) => w.status !== "Completed").length} ใบยังไม่เสร็จ)`,
    analysis: top
      ? `${top.assetCode} ควรได้รับการดูแลก่อน (${SEVERITY[top.priority].label})`
      : "ไม่มีอุปกรณ์ที่มี Alarm ค้าง",
    recommendation: top
      ? `${sopSteps(top, 2)}\nกฎตัวอย่าง ไม่ใช่การพยากรณ์ความเสียหาย · ระบบจริงจะส่งใบงานเข้า CMMS`
      : "ทำ Preventive maintenance ตามแผน",
    sopFor: top?.id,
    source: `${SIM} · Asset registry + local work orders`,
    period: now(ctx),
  };
}

function recommend(q: string, ctx: AskContext): Answer {
  if (TOPIC.alarms.test(q)) return { ...alarms(ctx, q), intent: "recommend" };
  if (/พลังงาน|ไฟ|energy|kw|setpoint/.test(q)) return { ...energy(ctx), intent: "recommend" };
  if (/อากาศ|aqi|pm|co2|co₂|ฝุ่น|air/.test(q)) {
    const p = publicArea(ctx);
    return {
      ...p,
      intent: "recommend",
      data: `Indoor ${air(ctx.air.indoor)}\nOutdoor ${air(ctx.air.outdoor)}\nLobby: ${ctx.lobby.zones.map((z) => `${z.zone.name} AQI ${z.air.aqi}`).join(" · ")}`,
    };
  }
  const top = topAlarm(ctx.openIncidents);
  const b = building(ctx);
  return {
    ...b,
    intent: "recommend",
    recommendation: [
      top ? `1. ${top.id} ${top.title.th} → ทำตาม SOP ${SOPS[top.sop].title}` : "1. ไม่มี Alarm ค้าง",
      `2. Setpoint 25 °C ลดได้ ${fmt(ctx.energy.current - ctx.energyAt25.current)} kW โดย Comfort risk ต่ำ`,
      `3. ${ctx.lobby.busiest.zone.name} ใช้พื้นที่ ${Math.round(ctx.lobby.busiest.load * 100)}% · ${
        ctx.lobby.busiest.load >= 0.8 ? "เพิ่มเจ้าหน้าที่หน้างาน" : "ความหนาแน่นยังปกติ"
      }`,
      "ข้อเสนอแนะเป็นผลจากกฎตัวอย่าง ผู้ปฏิบัติงานเป็นผู้ตัดสินใจ",
    ].join("\n"),
    sopFor: top?.id,
  };
}

/** What is selected in 3D (an asset or a podium floor) and its live metrics */
function selectionAnswer({ selection: s, time }: AskContext): Answer {
  return {
    data: `**พื้นที่ที่กำลังดู: ${s.label}**\n\n**${s.assetName}** · ${s.assetCode}\n${s.metrics
      .map((m) => `${m.label}: ${m.value}${m.unit ? ` ${m.unit}` : ""}`)
      .join("\n")}`,
    recommendation: "เลือกชั้นจากเมนูใต้อาคาร หรือคลิกอุปกรณ์ในโมเดล 3D แล้วถามอีกครั้งเพื่อดูข้อมูลพื้นที่นั้น",
    source: `${SIM} · ข้อมูลพื้นที่และอุปกรณ์`,
    period: `ณ ${time} วันนี้`,
  };
}

type Rule = { match: (q: string, ctx: AskContext) => boolean; answer: (ctx: AskContext, q: string) => Answer };

const TOPIC: Record<Intent, RegExp> = {
  recommend: /แนะนำ|ควรทำ|ควรแก้|ทำอย่างไร|ทำยังไง|recommend|suggest|ลดการใช้|ปรับปรุง|improve/,
  alarms: /alarm|อลาร์ม|เหตุ|incident|แจ้งเตือน|ขัดข้อง|sop|เคส|case|ผิดปกติ|security|ปลอดภัย/,
  energy: /พลังงาน|ค่าไฟ|ไฟฟ้า|energy|kw|chiller|hvac|setpoint|ประหยัด|cooling/,
  rooms: /ห้อง|โรงแรม|room|hotel|occupancy|เข้าพัก|check.?in|check.?out|แขก|guest/,
  public: /lobby|ล็อบบี้|โถง|zone|คน|people|crowd|หนาแน่น|aqi|อากาศ|pm2|co2|co₂|ฝุ่น|footfall/,
  building: /สรุป|summary|overview|ภาพรวม|อาคาร|building|สถานะ|status/,
};

/** Default topic of each scene, for generic questions ("วิเคราะห์ให้หน่อย") */
const SCENE_TOPIC: Record<ViewId, Intent> = {
  executive: "building",
  twin: "building",
  ioc: "alarms",
  energy: "energy",
  overview: "building",
  rooms: "rooms",
  public: "public",
  boh: "alarms",
  ai: "recommend",
};
const GENERIC = /วิเคราะห์|analy[sz]e|ตอนนี้เป็น|เป็นยังไง|เป็นอย่างไร|how is|what.?s happening/;

function route(intent: Intent, ctx: AskContext, q: string): Answer {
  switch (intent) {
    case "building":
      return building(ctx);
    case "energy":
      return energy(ctx);
    case "rooms":
      return rooms(ctx);
    case "public":
      return publicArea(ctx);
    case "alarms":
      return /ซ่อม|บำรุง|maintenance|equipment|อุปกรณ์|work order/.test(q) ? maintenance(ctx) : alarms(ctx, q);
    case "recommend":
      return recommend(q, ctx);
  }
}

/** Which of the six topics a question belongs to; null = none of them */
export function routeIntent(q: string, ctx: Pick<AskContext, "view">): Intent | null {
  const text = q.toLowerCase();
  if (/ซ่อม|บำรุง|maintenance|equipment|อุปกรณ์|work order/.test(text) && !TOPIC.recommend.test(text)) return "alarms";
  for (const intent of ["recommend", "alarms", "energy", "rooms", "public", "building"] as const)
    if (TOPIC[intent].test(text)) return intent;
  return GENERIC.test(text) ? SCENE_TOPIC[ctx.view] : null;
}

// Side answers first (floor plan, selected area, facade, greeting), then the six topics
const RULES: Rule[] = [
  {
    match: (q, ctx) =>
      /แปลน|floor.?plan|เรสซิเดนซ์|residence|library|co.?working|social floor/.test(q) ||
      (ctx.plan.open && (SELECTED.test(q) || /โซน|ส่วนกลาง/.test(q))),
    answer: (ctx, q) => planAnswer(q, ctx),
  },
  {
    match: (q) => SELECTED.test(q),
    // A guest floor answers with its rooms; anything else with its asset card
    answer: (ctx) => (/^ชั้น H/.test(ctx.selection.label) ? rooms(ctx) : selectionAnswer(ctx)),
  },
  {
    match: (q) => /ฟาซาด|facade|façade|ออกแบบ|ชื่ออาคาร|ชื่อตึก/.test(q),
    answer: () => ({
      data: "**PRM Hospitality**\n\nแนวคิดฟาซาดใช้ครีบสีขาวแนวตั้ง กระจกมุมโค้ง และกรอบโครงสร้างสีอิฐ ตัดด้วยสวนลอยฟ้าและสวนบนฐานอาคาร",
      analysis: "รูปทรงอ้างอิงภาพที่ให้มา ผังภายในและข้อมูลปฏิบัติการเป็นข้อมูลจำลอง ดูภาพต้นทางได้ใน Model notes",
      source: "User-supplied facade references · Concept 3D model",
      period: "ข้อมูลอ้างอิงคงที่",
    }),
  },
  {
    match: (q) => /สวัสดี|hello|ช่วยอะไร/.test(q),
    answer: () => ({
      data: "สวัสดีครับ ผมเป็นผู้ช่วยประจำอาคาร ตอบได้ 6 เรื่อง: ข้อมูลอาคาร · พลังงาน · ห้องพัก · Lobby และคุณภาพอากาศ · Alarm & Events · ข้อเสนอแนะ",
      recommendation: "ลองเลือกคำถามแนะนำด้านล่าง ซึ่งเปลี่ยนตามฉากที่เปิดอยู่",
      source: "Local assistant demo",
      period: "—",
    }),
  },
];

const FALLBACK: Answer = {
  data: "ตัวสาธิตนี้ยังไม่เชื่อมต่อ LLM และตอบได้เฉพาะข้อมูลจำลองที่เตรียมไว้ 6 เรื่อง: **ข้อมูลอาคาร / พลังงาน / ห้องพัก / Lobby และคุณภาพอากาศ / Alarm & Events / ข้อเสนอแนะ**",
  recommendation: "ลองถาม “ทำไมค่าไฟสูงวันนี้” หรือ “มี Alarm อะไรค้างอยู่”",
  source: "Scripted demo scope · No external AI service",
  period: "—",
};

export function answerQuestion(question: string, ctx: AskContext): Answer {
  const q = question.toLowerCase();
  const side = RULES.find((r) => r.match(q, ctx));
  if (side) return side.answer(ctx, q);
  const intent = routeIntent(q, ctx);
  return intent ? route(intent, ctx, q) : FALLBACK;
}

/** All three parts as one string (tests, export) */
export const answerText = (a: Answer) => [a.data, a.analysis, a.recommendation].filter(Boolean).join("\n\n");
