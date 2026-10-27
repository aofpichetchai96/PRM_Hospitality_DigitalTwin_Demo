// Rule-based "AI" assistant (prototype ask() L394–404). Answers only from
// the simulated state passed in; no network, no LLM. Text uses **bold** and
// blank lines between paragraphs.
import { fmt } from "@/lib/format";
import type { AssetMetric, EnergyResult, FloorPlanId, Incident, PlanZone, WorkOrder } from "@/types";
import { INCIDENT_STEPS } from "./events";
import { FLOOR_PLANS } from "./floorPlans";
import { OTHER_LOADS_KW } from "./energy";

export const QUICK_CHIPS: readonly { label: string; question: string }[] = [
  { label: "สรุปอาคาร", question: "สรุปสถานการณ์อาคารวันนี้" },
  { label: "พื้นที่ที่เลือก", question: "ข้อมูลพื้นที่ที่เลือก" },
  { label: "ค่าไฟวันนี้", question: "ทำไมค่าไฟสูงวันนี้" },
  { label: "เหตุการณ์ค้าง", question: "มีเหตุการณ์อะไรค้างอยู่" },
  { label: "ห้องพร้อมขาย", question: "ห้องพักพร้อมขายกี่ห้อง" },
  { label: "แนวคิดฟาซาด", question: "ฟาซาดอาคารออกแบบอย่างไร" },
  { label: "งานบำรุงรักษา", question: "อุปกรณ์ใดต้องซ่อมบำรุง" },
];

export const GREETING = {
  title: "สวัสดีครับ ผมคือ AI Assistant ของ PRM Hospitality",
  body: "ผมช่วยสรุปภาพรวมอาคาร ตรวจเหตุการณ์ค้าง วิเคราะห์พลังงาน และดูสถานะห้องพักได้ครับ",
  note: "คำตอบเปลี่ยนตาม Room status, Energy Lab และ Incident ที่ทดลองในหน้านี้",
};

export interface AskContext {
  time: string;
  energy: EnergyResult;
  counts: { occupied: number; ready: number; cleaning: number; maintenance: number };
  footfall: number;
  openIncidents: readonly Incident[];
  workOrders: readonly WorkOrder[];
  scenario: { outdoor: number; setpoint: number; tariff: number; operatingHours: number };
  /** What is selected in 3D */
  selection: { label: string; assetName: string; assetCode: string; metrics: AssetMetric[] };
  plan: { open: boolean; type: FloorPlanId; selectedZone: string };
}

export interface Answer {
  text: string;
  source: string;
}

const SELECTED = /พื้นที่ที่เลือก|selected|บริเวณนี้|ชั้นนี้/;

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
    text: `**PRM Hospitality · ${p.label}**\n\n**${z.name}**\n${z.desc}\n\n${z.ideas}\n\nแปลนนี้เป็นภาพอ้างอิงที่คุณให้มา ยังไม่ได้ผูกกับชั้นจริงหรือข้อมูลห้องพัก 600 ห้อง และไม่มีข้อมูลยืนยันขนาดพื้นที่หรือสถานะใช้งานจริง`,
    source: "ภาพอ้างอิงผู้ใช้ · คำอธิบายโซนที่จัดเตรียมไว้ · ไม่ใช่การวิเคราะห์แปลนโดย LLM",
  };
}

type Rule = { match: (q: string, ctx: AskContext) => boolean; answer: (ctx: AskContext, q: string) => Answer };

// First match wins — order follows the prototype
const RULES: Rule[] = [
  {
    match: (q, ctx) =>
      /แปลน|floor.?plan|เรสซิเดนซ์|ส่วนกลาง|residence|library|co.?working|โซน/.test(q) ||
      (ctx.plan.open && SELECTED.test(q)),
    answer: (ctx, q) => planAnswer(q, ctx),
  },
  {
    match: (q) => SELECTED.test(q),
    answer: ({ selection: s, time }) => ({
      text: `**พื้นที่ที่กำลังดู: ${s.label}**\n\n**${s.assetName}** · ${s.assetCode}\n${s.metrics
        .map((m) => `${m.label}: ${m.value}${m.unit ? ` ${m.unit}` : ""}`)
        .join("\n")}\n\nเลือกชั้นจากเมนูใต้อาคาร หรือคลิกจุดบนอาคารแล้วถามอีกครั้งเพื่อดูข้อมูลพื้นที่นั้น`,
      source: `ข้อมูลพื้นที่และอุปกรณ์จำลอง ณ ${time}`,
    }),
  },
  {
    match: (q) => /ฟาซาด|facade|façade|ออกแบบ|ชื่ออาคาร|ชื่อตึก/.test(q),
    answer: () => ({
      text: "**PRM Hospitality**\n\nแนวคิดฟาซาดใช้ครีบสีขาวแนวตั้ง กระจกมุมโค้ง และกรอบโครงสร้างสีอิฐ ตัดด้วยสวนลอยฟ้าและสวนบนฐานอาคาร\n\nรูปทรงอ้างอิงภาพที่ให้มา ผังภายในและข้อมูลปฏิบัติการเป็นข้อมูลจำลอง ดูภาพต้นทางได้ใน Model notes",
      source: "User-supplied facade references · Concept 3D model",
    }),
  },
  {
    match: (q) => /สวัสดี|hello|ช่วยอะไร/.test(q),
    answer: () => ({
      text: "สวัสดีครับ ผมเป็นผู้ช่วยเดโมประจำอาคาร ช่วยสรุปสถานการณ์ พลังงาน ห้องพัก เหตุการณ์ และข้อมูลพื้นที่ที่เลือกได้ ลองเลือกคำถามด้านล่างได้เลยครับ",
      source: "Local assistant demo",
    }),
  },
  {
    match: (q) => /พลังงาน|ค่าไฟ|energy|chiller|hvac|setpoint|ประหยัด|cooling/.test(q),
    answer: ({ energy: e, counts: c, scenario: s }) => ({
      text: `ความต้องการไฟฟ้าจำลองขณะนี้ **${fmt(e.current)} kW** แบ่งเป็น Mall cooling ${fmt(e.mall)} kW, Hotel cooling ${fmt(e.hotel)} kW และ Other loads ${fmt(OTHER_LOADS_KW)} kW\n\nOccupancy **${fmt(c.occupied / 6)}%** · Outdoor ${s.outdoor}°C · Setpoint ${s.setpoint}°C\n\nเทียบกับฐาน 24°C ภายใต้สภาวะเดียวกัน ผลต่างประมาณ **${fmt(e.savingPct, 1)}%** หรือ ${fmt(e.dayCost)} THB/วัน ตามสมมติฐาน ${s.operatingHours} ชั่วโมง และ ${s.tariff} THB/kWh\n\nทดลองใน Energy Lab และตรวจสอบ Comfort ก่อนเสนอการปรับจริง ตัวเลขนี้ยังไม่ใช่ผลประหยัดที่วัดได้`,
      source: "DEMO: BMS + EMS + PMS · Local linear scenario model · No control command sent",
    }),
  },
  {
    match: (q) => /ห้อง|โรงแรม|room|hotel|occupancy|housekeeping/.test(q),
    answer: ({ counts: c }) => ({
      text: `จาก Inventory จำลอง **600 ห้อง**\nมีผู้เข้าพัก **${c.occupied} ห้อง** (${fmt(c.occupied / 6)}%)\nพร้อมขาย / ว่าง ${c.ready} ห้อง\nกำลังทำความสะอาด ${c.cleaning} ห้อง\nปิดซ่อม ${c.maintenance} ห้อง\n\nให้ทีม Housekeeping ตรวจสอบห้องที่ค้าง และประสาน Engineering สำหรับห้องปิดซ่อม ไม่มีชื่อหรือข้อมูลแขกจริงอยู่ในระบบนี้`,
      source: "DEMO: 600 local room records · PMS + Housekeeping + GRMS mock state",
    }),
  },
  {
    match: (q) => /ซ่อม|บำรุง|maintenance|asset|equipment|work order/.test(q),
    answer: ({ workOrders }) => ({
      text: `มีใบงานจำลอง **${workOrders.length} ใบ** (${workOrders.filter((w) => w.status !== "Completed").length} ใบยังไม่เสร็จ)\n\nรายการควรตรวจสอบ: AHU-H12 (Supply-air advisory) และ CH-01 (Efficiency advisory)\n\nเปิด Asset details หรือเลือก Incident เพื่อยืนยัน → มอบหมาย → สร้าง Work order ทั้งหมดนี้ยังไม่ถูกส่งเข้าระบบ CMMS จริง`,
      source: "DEMO: Asset registry + local work orders · Example advisory rules, not failure prediction",
    }),
  },
  {
    match: (q) => /เหตุ|incident|security|alert|alarm|ปลอดภัย/.test(q),
    answer: ({ openIncidents: open }) => ({
      text: `ขณะนี้มี **${open.length} เหตุการณ์ค้าง** และ ${open.filter((x) => x.priority === "high").length} รายการระดับ High\n\n${
        open
          .slice(0, 5)
          .map((x) => `**${x.id}** ${x.title.th}\n${x.location} · ${INCIDENT_STEPS[x.status]} · ${x.owner}`)
          .join("\n\n") || "ไม่มีเหตุการณ์ค้างในสถานการณ์นี้"
      }\n\nกด IOC operations เพื่อดำเนิน Workflow โดยเจ้าหน้าที่เป็นผู้ยืนยันและสั่งการ`,
      source: "DEMO: Local event list · ACS / BMS / synthetic CCTV references",
    }),
  },
  {
    match: (q) => /คน|ผู้ใช้|footfall|crowd|visitor|traffic/.test(q),
    answer: ({ footfall }) => ({
      text: `Mall entry counts วันนี้จำลองที่ **${fmt(footfall)}** ครั้ง ไม่ใช่จำนวนคนที่ไม่ซ้ำกัน\n\nเปิด People flow layer เพื่อดู Heatmap และแนวการเข้าถึงพื้นที่ ตัวอย่างนี้ใช้ข้อมูลรวมและไม่มี Face recognition หรือข้อมูลระบุตัวตน`,
      source: "DEMO: Aggregated people-counting scenario · Illustrative spatial distribution",
    }),
  },
  {
    match: (q) => /สรุป|summary|overview|วันนี้|status/.test(q),
    answer: ({ time, counts: c, energy: e, footfall, openIncidents: open, workOrders }) => ({
      text: `**PRM Hospitality · ${time} · Simulated brief**\n\nHotel: ${c.occupied}/600 ห้อง (${fmt(c.occupied / 6)}%)\nBuilding demand: ${fmt(e.current)} kW\nMall entry counts: ${fmt(footfall)}\nOpen incidents: ${open.length}\nWork orders: ${workOrders.length}\n\n**สิ่งที่ควรทำในสถานการณ์นี้**\n${
        open.some((x) => x.priority === "high") ? "ตรวจสอบเหตุการณ์ High ก่อน" : "ติดตามเหตุการณ์ที่ยังค้าง"
      } → ติดตาม ${c.cleaning} ห้องที่กำลังทำความสะอาด → ทดสอบ Energy Lab โดยไม่กระทบ Comfort`,
      source: "DEMO: Combined local PMS, EMS, people counts, incident and work-order state",
    }),
  },
];

const FALLBACK: Answer = {
  text: "ตัวสาธิตนี้ยังไม่เชื่อมต่อ LLM และตอบได้เฉพาะข้อมูลจำลองที่เตรียมไว้ เช่น **พลังงาน / เหตุการณ์ / ห้องพัก / งานซ่อม / People flow / สรุปสถานการณ์**\n\nลองถาม “ทำไมค่าไฟสูงวันนี้” หรือ “มีเหตุการณ์อะไรค้างอยู่”",
  source: "Scripted demo scope · No external AI service",
};

export function answerQuestion(question: string, ctx: AskContext): Answer {
  const q = question.toLowerCase();
  return RULES.find((r) => r.match(q, ctx))?.answer(ctx, q) ?? FALLBACK;
}
