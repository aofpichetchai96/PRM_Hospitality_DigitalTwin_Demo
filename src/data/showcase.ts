// Demo showcase behind "ชมเดโม", in two paths: Executive (business outcomes,
// 6 chapters) and Technical deep-dive (one chapter per feature). Each chapter
// is a short script of beats that drive the real UI (camera, modes, modals,
// sim) so the audience sees it working. Every chapter's first beat sets its
// own view, so the presenter can jump to any chapter. Wording says only what
// the demo does now, then "ระบบจริงจะ…" — never more than the disclaimers.
// Downloads (Export JSON, PNG capture) are left for the presenter to press.
import { valueMetric } from "./value";
import type {
  AssetId,
  FloorId,
  FloorPlanId,
  LayerId,
  Layers,
  RightPanelTab,
  RoomStatus,
  SceneMode,
  TimeOfDay,
  ViewId,
  ZoneId,
} from "@/types";

/** An incident id, or `"focus"` = the one the IOC follows (e.g. just simulated) */
type IncidentRef = string;

export type ShowcaseAction =
  | { do: "view"; view: ViewId; autoRotate?: boolean }
  | { do: "zone"; zone: ZoneId }
  | { do: "mode"; mode: SceneMode }
  | { do: "explode"; on: boolean }
  | { do: "floor"; floor: FloorId | "all" }
  | { do: "pickFloor"; floor: FloorId }
  | { do: "stepFloor"; dir: 1 | -1 }
  | { do: "layers"; layers: Partial<Layers> }
  | { do: "time"; time: TimeOfDay }
  | { do: "azimuth"; azimuth: number }
  | { do: "zoom"; dir: 1 | -1 }
  | { do: "rotate"; on: boolean }
  | { do: "presentation"; on: boolean }
  | { do: "plan"; type: FloorPlanId | null }
  | { do: "planZone"; zone: string }
  | { do: "hotspot"; id: "ahu" | "people" }
  | { do: "asset"; asset: AssetId }
  | { do: "workOrder" }
  | { do: "panel"; panel: RightPanelTab }
  | { do: "modal"; kind: "event"; id: IncidentRef }
  | { do: "modal"; kind: "cctv"; id: string }
  | { do: "modal"; kind: "asset" | "allRooms" | "methodology" | "reference" | "about" | "value" | "roadmap" }
  /** Opens the first room in this status (H12 first) */
  | { do: "roomModal"; status: RoomStatus }
  /** Changes the room the open room modal shows */
  | { do: "roomStatus"; status: RoomStatus }
  | { do: "closeModal" }
  | { do: "simulateIncident" }
  | { do: "incident"; id: IncidentRef }
  | { do: "locate"; id: IncidentRef }
  | { do: "scenario"; setpoint?: number; outdoor?: number; occupancy?: number; tariff?: number }
  | { do: "clock"; hour: number }
  | { do: "ask"; question: string };

export interface ShowcaseBeat {
  /** What the audience is looking at — shown on the card while the beat plays */
  caption: string;
  /** How long the beat stays on screen before the next one (ms) */
  wait: number;
  run: readonly ShowcaseAction[];
}

export interface ShowcaseChapter {
  id: string;
  title: string;
  /** One-line sales message (Thai) */
  pitch: string;
  /** Two short benefits for the customer */
  points: readonly [string, string];
  /** Business result to quote (executive path) — an assumption, labelled as such on the card */
  outcome?: string;
  beats: readonly ShowcaseBeat[];
}

export type ShowcasePath = "executive" | "technical";

const ALL_LAYERS_OFF: Record<LayerId, false> = { energy: false, security: false, people: false, assets: false };

/** Playback speed: beat waits below are scaled by this, with a floor so camera flights can land */
const PACE = 0.65;
const MIN_WAIT_MS = 1800;

const TECHNICAL: readonly ShowcaseChapter[] = [
  {
    id: "twin",
    title: "3D Digital Twin",
    pitch: "โมเดล 3D จากภาพอ้างอิงโครงการพร้อมบริบทเมือง บินไปทุกโซนได้ในคลิกเดียว · ระบบจริงใช้ BIM / IFC",
    points: ["Mall และ Hotel ใช้ข้อมูลชุดเดียวกัน", "Property Explorer เลือกโซนได้ทันที"],
    beats: [
      {
        caption: "อาคารทั้งโครงการในบริบทเมืองรอบข้าง",
        wait: 4000,
        run: [
          { do: "view", view: "twin" },
          { do: "zone", zone: "all" },
        ],
      },
      { caption: "Hotel tower · 600 ห้อง", wait: 3500, run: [{ do: "zone", zone: "hotel" }] },
      { caption: "Retail podium · ชั้น G ถึง L4", wait: 3500, run: [{ do: "zone", zone: "mall" }] },
      { caption: "Central plant · Chiller และงานระบบ", wait: 3500, run: [{ do: "zone", zone: "plant" }] },
      { caption: "Arrival & skywalk เชื่อมสถานี", wait: 3500, run: [{ do: "zone", zone: "arrival" }] },
      { caption: "ภาพอาคารอ้างอิงที่ใช้ทำฟาซาด", wait: 3500, run: [{ do: "modal", kind: "reference" }] },
    ],
  },
  {
    id: "camera",
    title: "Camera, compass & lighting",
    pitch: "ควบคุมมุมมองได้ลื่นไหล ซูม หมุน หันตามทิศ และเปลี่ยนแสงกลางวัน / พลบค่ำ",
    points: ["เข็มทิศหันกลับทิศเหนือในคลิกเดียว", "บันทึกภาพ 3D เป็น PNG ได้จากแถบเครื่องมือ"],
    beats: [
      {
        caption: "ซูมเข้าใกล้อาคาร",
        wait: 3000,
        run: [
          { do: "view", view: "twin" },
          { do: "zone", zone: "all" },
          { do: "zoom", dir: 1 },
        ],
      },
      { caption: "หมุนมองจากอีกฝั่งของโครงการ", wait: 3500, run: [{ do: "azimuth", azimuth: Math.PI }] },
      { caption: "เข็มทิศ · หันกลับทิศเหนือ", wait: 3500, run: [{ do: "azimuth", azimuth: 0 }] },
      {
        caption: "แสงพลบค่ำ · ไฟหน้าต่างและบรรยากาศยามเย็น",
        wait: 4000,
        run: [
          { do: "time", time: "dusk" },
          { do: "rotate", on: true },
        ],
      },
      {
        caption: "กลับเป็นแสงกลางวัน",
        wait: 3000,
        run: [
          { do: "time", time: "day" },
          { do: "rotate", on: false },
        ],
      },
    ],
  },
  {
    id: "xray",
    title: "X-ray & Explode",
    pitch: "มองทะลุอาคาร เห็นโครงสร้าง งานระบบ และแยกทุกชั้นออกมาดูพร้อมกัน",
    points: ["ไม่ต้องเปิดแบบก่อสร้างหลายแผ่น", "คลิกชั้นในโมเดลเพื่อดูข้อมูลชั้นนั้น"],
    beats: [
      {
        caption: "โหมด X-ray · โครงสร้างและงานระบบจำลอง",
        wait: 4000,
        run: [
          { do: "view", view: "twin" },
          { do: "mode", mode: "xray" },
        ],
      },
      { caption: "Explode · แยกชั้นทั้งอาคารออกเป็นชั้น ๆ", wait: 4500, run: [{ do: "explode", on: true }] },
      {
        caption: "เลือกชั้น H16 · Sky court ฟิตเนส พร้อมข้อมูลด้านขวา",
        wait: 4500,
        run: [{ do: "pickFloor", floor: "H16" }],
      },
      { caption: "กลับเป็นอาคารภายนอก", wait: 2500, run: [{ do: "explode", on: false }] },
    ],
  },
  {
    id: "floors",
    title: "Floor slice & fit-out",
    pitch: "ตัดดูภายในแต่ละชั้น พร้อมเฟอร์นิเจอร์ ห้องเครื่อง และตัวอย่างงานระบบในแต่ละชั้น",
    points: ["ห้องพัก Sky court และ Podium ทุกชั้น", "เลื่อนขึ้น / ลงทีละชั้นด้วยปุ่ม [ ]"],
    beats: [
      {
        caption: "H12 · ชั้นห้องพัก 28 ห้อง พร้อมสถานะห้อง",
        wait: 4500,
        run: [
          { do: "view", view: "twin" },
          { do: "floor", floor: "H12" },
        ],
      },
      { caption: "เลื่อนขึ้นทีละชั้น · H13", wait: 3000, run: [{ do: "stepFloor", dir: 1 }] },
      { caption: "H08 · Sky court สระว่ายน้ำ", wait: 4000, run: [{ do: "floor", floor: "H08" }] },
      { caption: "H24 · ห้องอาหาร Open kitchen", wait: 4000, run: [{ do: "floor", floor: "H24" }] },
      { caption: "H30 · ดาดฟ้าและงานระบบบนหลังคา", wait: 3500, run: [{ do: "floor", floor: "H30" }] },
      { caption: "L3 · Ballroom ของ Podium", wait: 3500, run: [{ do: "floor", floor: "L3" }] },
      { caption: "G · ล็อบบี้และ Atrium", wait: 3500, run: [{ do: "floor", floor: "G" }] },
    ],
  },
  {
    id: "plan",
    title: "Interior Atlas",
    pitch: "ผังพื้นภาพตกแต่งพร้อมรายละเอียดแต่ละโซน เปิดจากโมเดลได้ทันที",
    points: ["ผัง Residence และพื้นที่ส่วนกลาง", "ซูม ลาก และคลิกโซนเพื่อดูรายละเอียด"],
    beats: [
      {
        caption: "ผังห้องพักแบบ Residence",
        wait: 4000,
        run: [
          { do: "view", view: "twin" },
          { do: "plan", type: "residence" },
        ],
      },
      { caption: "เลือกโซน B · รายละเอียดพื้นที่ด้านขวา", wait: 4000, run: [{ do: "planZone", zone: "B" }] },
      { caption: "ผังพื้นที่ส่วนกลาง Social floor", wait: 4000, run: [{ do: "plan", type: "social" }] },
      { caption: "เลือกโซน 3", wait: 3500, run: [{ do: "planZone", zone: "3" }] },
      { caption: "กลับสู่โมเดล 3D", wait: 2000, run: [{ do: "plan", type: null }] },
    ],
  },
  {
    id: "layers",
    title: "System layers & hotspots",
    pitch: "ซ้อนข้อมูลงานระบบบนโมเดล เห็นพลังงาน ความปลอดภัย ผู้คน และทรัพย์สินในที่เดียว",
    points: ["เปิด / ปิดแต่ละเลเยอร์ได้อิสระ", "จุดสำรวจบนโมเดลพาไปยังข้อมูลที่เกี่ยวข้อง"],
    beats: [
      {
        caption: "Energy · ท่อและ Riser ไฟฟ้า / น้ำเย็น",
        wait: 3500,
        run: [
          { do: "view", view: "twin" },
          { do: "layers", layers: { ...ALL_LAYERS_OFF, energy: true } },
        ],
      },
      {
        caption: "Security · กล้องและระบบควบคุมประตู",
        wait: 3500,
        run: [{ do: "layers", layers: { security: true } }],
      },
      { caption: "Assets · อุปกรณ์และ Sensor สำคัญ", wait: 3500, run: [{ do: "layers", layers: { assets: true } }] },
      {
        caption: "People · Heatmap ความหนาแน่นที่ทางเข้าและสกายวอล์ก",
        wait: 4500,
        run: [{ do: "hotspot", id: "people" }],
      },
      { caption: "จุดสำรวจ AHU-H12 · Sensor และสุขภาพอุปกรณ์", wait: 4500, run: [{ do: "hotspot", id: "ahu" }] },
    ],
  },
  {
    id: "assets",
    title: "Asset & maintenance",
    pitch: "ทุกอุปกรณ์มีข้อมูลสุขภาพ ค่า Sensor และสร้างใบงานซ่อมบำรุงได้จากโมเดล",
    points: ["Health score และค่า Sensor ล่าสุด", "ใบงานส่งถึงทีมช่างพร้อมรหัสอุปกรณ์"],
    beats: [
      {
        caption: "เลือก CH-01 Central plant บนโมเดล",
        wait: 4000,
        run: [
          { do: "view", view: "twin" },
          { do: "asset", asset: "plant" },
        ],
      },
      { caption: "เปิดข้อมูลอุปกรณ์แบบละเอียด", wait: 4500, run: [{ do: "modal", kind: "asset" }] },
      {
        caption: "สร้างใบงานซ่อมบำรุงให้ทีมวิศวกรรม",
        wait: 3500,
        run: [{ do: "closeModal" }, { do: "workOrder" }],
      },
    ],
  },
  {
    id: "ioc",
    title: "IOC: alert to action",
    pitch: "จากการแจ้งเตือนสู่การสั่งงาน ครบ Workflow Detect → Verify → Dispatch → Resolve",
    points: ["รวมเหตุการณ์จาก ACS / BMS / CCTV", "ผู้ปฏิบัติงานยืนยันก่อนสั่งงานทุกขั้น"],
    beats: [
      {
        caption: "ศูนย์ปฏิบัติการ · เหตุการณ์ทั้งหมดเรียงตามความสำคัญ",
        wait: 3500,
        run: [{ do: "view", view: "ioc" }],
      },
      {
        caption: "เปิดเหตุการณ์ INC-001 · ประตู Service L2 เปิดค้าง",
        wait: 3500,
        run: [{ do: "modal", kind: "event", id: "INC-001" }],
      },
      { caption: "Verify · เจ้าหน้าที่ยืนยันเหตุการณ์", wait: 3000, run: [{ do: "incident", id: "INC-001" }] },
      {
        caption: "Dispatch · ผู้ปฏิบัติงานยืนยัน ระบบออกใบงาน WO",
        wait: 3500,
        run: [{ do: "incident", id: "INC-001" }],
      },
      { caption: "Resolve · ปิดเหตุการณ์และปิดใบงาน", wait: 3000, run: [{ do: "incident", id: "INC-001" }] },
      { caption: "ระบุตำแหน่งเหตุการณ์บนโมเดล 3D", wait: 4000, run: [{ do: "locate", id: "INC-001" }] },
    ],
  },
  {
    id: "drill",
    title: "Live incident drill",
    pitch: "จำลองเหตุการณ์ใหม่สด ๆ เพื่อซ้อมแผนรับมือและฝึกทีมปฏิบัติการ",
    points: ["เหตุการณ์ใหม่ขึ้นทั้งรายการ KPI และโมเดล", "ใช้ฝึกซ้อมทีมก่อนเปิดอาคารจริง"],
    beats: [
      {
        caption: "แจ้งเตือนเข้า · ระบบระบุตำแหน่ง ดึง Sensor และแนะนำทีมที่ต้องแจ้ง",
        wait: 6500,
        run: [{ do: "view", view: "ioc" }, { do: "simulateIncident" }],
      },
      {
        caption: "เปิดรายละเอียดและขั้นตอนรับมือ",
        wait: 3500,
        run: [{ do: "modal", kind: "event", id: "focus" }],
      },
      { caption: "Verify ทันที", wait: 2500, run: [{ do: "incident", id: "focus" }] },
      { caption: "Verify แล้ว · ติดตามจุดเกิดเหตุบนโมเดล", wait: 4000, run: [{ do: "locate", id: "focus" }] },
    ],
  },
  {
    id: "cctv",
    title: "CCTV video wall",
    pitch: "ดูภาพกล้องจากจุดเกิดเหตุได้จากหน้าจอเดียวกับโมเดล",
    points: ["กล้องผูกกับตำแหน่งในอาคาร", "ภาพในเดโมเป็นภาพสังเคราะห์ ไม่ใช่กล้องจริง"],
    beats: [
      { caption: "Video wall · กล้องหลักของโครงการ", wait: 3000, run: [{ do: "view", view: "ioc" }] },
      { caption: "ขยายภาพกล้อง Lobby", wait: 4000, run: [{ do: "modal", kind: "cctv", id: "0" }] },
      { caption: "สลับไปกล้องตัวถัดไป", wait: 4000, run: [{ do: "modal", kind: "cctv", id: "1" }] },
      { caption: "กลับสู่ศูนย์ปฏิบัติการ", wait: 1500, run: [{ do: "closeModal" }] },
    ],
  },
  {
    id: "energy",
    title: "Energy Lab",
    pitch: "ทดลองสถานการณ์พลังงานก่อนตัดสินใจ เห็นผลต่อ kW และค่าไฟทันที",
    points: ["ปรับ Setpoint · อากาศ · Occupancy · ค่าไฟ", "คำนวณจากสมมติฐาน ไม่มีคำสั่งควบคุมจริง"],
    beats: [
      {
        caption: "Demand ปัจจุบัน 2,616 kW แยกตาม Mall / Hotel / Plant",
        wait: 4000,
        run: [{ do: "view", view: "energy" }],
      },
      {
        caption: "ปรับ Setpoint 24°C → 25°C · โหลดทำความเย็นลดลงทันที",
        wait: 4000,
        run: [{ do: "scenario", setpoint: 25 }],
      },
      { caption: "จำลองวันที่อากาศร้อนขึ้น 35°C", wait: 3500, run: [{ do: "scenario", outdoor: 35 }] },
      { caption: "Occupancy ลดเหลือ 70%", wait: 3500, run: [{ do: "scenario", occupancy: 70 }] },
      { caption: "ค่าไฟต่อหน่วยสูงขึ้นเป็น 5.5 บาท", wait: 3500, run: [{ do: "scenario", tariff: 5.5 }] },
      { caption: "ที่มาของสูตรและสมมติฐาน", wait: 4500, run: [{ do: "modal", kind: "methodology" }] },
      {
        caption: "กลับสู่สถานการณ์ปัจจุบัน",
        wait: 2000,
        run: [{ do: "closeModal" }, { do: "scenario", setpoint: 24, outdoor: 32, occupancy: 84, tariff: 4.5 }],
      },
    ],
  },
  {
    id: "clock",
    title: "Time simulation",
    pitch: "เลื่อนเวลาดูอาคารตลอดทั้งวัน Footfall และพลังงานเปลี่ยนตามช่วงเวลา",
    points: ["จำลองตั้งแต่ 06:00 ถึง 23:00", "ใช้วางแผนกำลังคนและพลังงานช่วง Peak"],
    beats: [
      {
        caption: "09:00 · ช่วงเช้าก่อนห้างเปิด",
        wait: 4000,
        run: [
          { do: "view", view: "overview" },
          { do: "clock", hour: 9 },
        ],
      },
      { caption: "19:00 · ช่วง Peak หัวค่ำ", wait: 4000, run: [{ do: "clock", hour: 19 }] },
      { caption: "กลับสู่ 14:30", wait: 2500, run: [{ do: "clock", hour: 14.5 }] },
    ],
  },
  {
    id: "hotel",
    title: "Hotel · 600 keys",
    pitch: "สถานะ 600 ห้องเชื่อมฝ่ายต้อนรับ แม่บ้าน และช่างในมุมมองเดียว",
    points: ["Occupied · Ready · Cleaning · Maintenance", "แม่บ้านปิดงานแล้วห้องพร้อมขายทันที"],
    beats: [
      { caption: "ภาพรวมห้องพักทั้งโรงแรม", wait: 3500, run: [{ do: "view", view: "hotel" }] },
      { caption: "H12 · สถานะห้องรายชั้นบนโมเดล", wait: 3500, run: [{ do: "floor", floor: "H12" }] },
      { caption: "เปิดห้องที่กำลังทำความสะอาด", wait: 4000, run: [{ do: "roomModal", status: "cleaning" }] },
      { caption: "แม่บ้านปิดงาน · ห้องพร้อมขาย", wait: 3500, run: [{ do: "roomStatus", status: "ready" }] },
      { caption: "รายการห้องทั้งหมด 600 ห้อง", wait: 4000, run: [{ do: "modal", kind: "allRooms" }] },
      { caption: "กลับสู่มุมมองโรงแรม", wait: 1500, run: [{ do: "closeModal" }] },
    ],
  },
  {
    id: "ai",
    title: "AI Assistant",
    pitch: "ถามอาคารเป็นภาษาไทยได้เลย · เดโมนี้ตอบจากข้อมูลจำลอง ระบบจริงเชื่อม AI ผ่าน API ที่ได้รับอนุญาต",
    points: ["สรุปสถานการณ์ พลังงาน ห้องพัก เหตุการณ์", "เดโมเป็น Rule-based · ต่อยอดกับ LLM ได้"],
    beats: [
      { caption: "ผู้ช่วยอาคาร", wait: 2500, run: [{ do: "view", view: "ai" }] },
      {
        caption: "ถาม: สรุปสถานการณ์อาคารวันนี้",
        wait: 5000,
        run: [{ do: "ask", question: "สรุปสถานการณ์อาคารวันนี้" }],
      },
      {
        caption: "ถาม: ค่าไฟวันนี้เป็นอย่างไร",
        wait: 5000,
        run: [{ do: "ask", question: "ค่าไฟวันนี้เป็นอย่างไร" }],
      },
      {
        caption: "ถาม: ห้องพร้อมขายมีกี่ห้อง",
        wait: 5000,
        run: [{ do: "ask", question: "ห้องพร้อมขายมีกี่ห้อง" }],
      },
      {
        caption: "ถาม: มีเหตุการณ์ค้างอะไรบ้าง",
        wait: 5000,
        run: [{ do: "ask", question: "มีเหตุการณ์ค้างอะไรบ้าง" }],
      },
    ],
  },
  {
    id: "presentation",
    title: "Presentation mode",
    pitch: "ซ่อนแผงข้อมูลทั้งหมด เหลือโมเดลเต็มจอสำหรับโปรเจคเตอร์และบูธ",
    points: ["กด P สลับได้ทุกเมื่อ · สีคอนทราสต์สูง", "Attract mode เล่นสาธิตวนเองที่บูธ"],
    beats: [
      {
        caption: "เต็มจอ · โมเดลหมุนอัตโนมัติ",
        wait: 5500,
        run: [
          { do: "view", view: "twin", autoRotate: true },
          { do: "presentation", on: true },
        ],
      },
      { caption: "กลับสู่หน้าควบคุม", wait: 2000, run: [{ do: "presentation", on: false }] },
    ],
  },
  {
    id: "lineage",
    title: "Data lineage & roadmap",
    pitch: "ทุกตัวเลขบอกแหล่งข้อมูลและสมมติฐาน · ระบุสิ่งที่ต้องได้จากโครงการก่อนเชื่อมระบบจริง",
    points: ["BIM / IFC · Data point list · Interface matrix", "เริ่มจากเฟส 1 อ่านข้อมูลอย่างเดียว"],
    beats: [
      {
        caption: "Model notes · สมมติฐานและขอบเขตความรับผิดชอบ",
        wait: 6000,
        run: [
          { do: "view", view: "overview", autoRotate: true },
          { do: "modal", kind: "about" },
        ],
      },
      { caption: "Roadmap 3 เฟส · เริ่มเล็ก ขยายได้", wait: 6000, run: [{ do: "modal", kind: "roadmap" }] },
      { caption: "ขอบคุณครับ · ทดลองใช้งานแต่ละฟังก์ชันต่อได้", wait: 3000, run: [{ do: "closeModal" }] },
    ],
  },
];

const mttr = valueMetric("mttr");
const turnaround = valueMetric("turnaround");
const energy = valueMetric("energy");
const reporting = valueMetric("reporting");

/** Executive path: five business outcomes and how to start, for owners and GMs */
const EXECUTIVE: readonly ShowcaseChapter[] = [
  {
    id: "overview",
    title: "One building, two businesses",
    pitch: "เห็น Mall และ Hotel ในหน้าเดียว · ตัวเลขจำลองอัปเดตต่อเนื่อง ระบบจริงเชื่อม BMS / PMS แบบเรียลไทม์",
    points: ["Occupancy โรงแรม · Footfall ห้าง · Demand ทั้งอาคาร", "แยกสิทธิ์ทีม Mall และ Hotel"],
    beats: [
      {
        caption: "KPI ของทั้งสองธุรกิจบนแถบเดียว",
        wait: 5500,
        run: [{ do: "view", view: "overview", autoRotate: true }],
      },
      {
        caption: "โมเดล 3D จากภาพอ้างอิงโครงการ",
        wait: 4500,
        run: [
          { do: "view", view: "twin" },
          { do: "zone", zone: "all" },
        ],
      },
      { caption: "Hotel tower · 600 ห้อง", wait: 3500, run: [{ do: "zone", zone: "hotel" }] },
      { caption: "Retail podium · ชั้น G ถึง L4", wait: 3500, run: [{ do: "zone", zone: "mall" }] },
    ],
  },
  {
    id: "incident",
    title: "Incident to closed, faster",
    pitch: "เกิดเหตุแล้วรู้ทันที เห็นตำแหน่ง กล้อง และทีมที่ต้องแจ้ง · ผู้ปฏิบัติงานยืนยันก่อนสั่งงาน",
    points: ["Detect → Verify → Dispatch → Resolve", "IOC ไม่ควบคุมระบบ Life Safety"],
    outcome: `${mttr.label} ${mttr.before} → ${mttr.after} (${mttr.change})`,
    beats: [
      {
        caption: "แจ้งเตือนเข้า · ระบบระบุตำแหน่งและแนะนำทีมที่ต้องแจ้ง",
        wait: 6500,
        run: [{ do: "view", view: "ioc" }, { do: "simulateIncident" }],
      },
      { caption: "เปิดเหตุการณ์และขั้นตอนรับมือ", wait: 3500, run: [{ do: "modal", kind: "event", id: "focus" }] },
      { caption: "Verify · เจ้าหน้าที่ยืนยันเหตุการณ์", wait: 3000, run: [{ do: "incident", id: "focus" }] },
      { caption: "Dispatch · ผู้ปฏิบัติงานยืนยัน ระบบออกใบงาน", wait: 3500, run: [{ do: "incident", id: "focus" }] },
      { caption: "Resolve · ปิดเหตุการณ์และใบงาน", wait: 3500, run: [{ do: "incident", id: "focus" }] },
    ],
  },
  {
    id: "energy",
    title: "Lower energy cost",
    pitch: "ทดลองสถานการณ์ก่อนตัดสินใจ เห็นผลประหยัดและความเสี่ยงต่อความสบายของแขกพร้อมกัน",
    points: ["What-if ไม่ส่งคำสั่งควบคุมอาคาร", "ผลประหยัดจริงต้องวัดผล (M&V)"],
    outcome: `${energy.label} ${energy.after} ที่ ${energy.change}`,
    beats: [
      { caption: "Demand ปัจจุบันแยกตาม Mall / Hotel / Plant", wait: 4000, run: [{ do: "view", view: "energy" }] },
      {
        caption: "Setpoint 24°C → 25°C · ประหยัดราว 2.5% · Comfort risk ต่ำ",
        wait: 6000,
        run: [{ do: "scenario", setpoint: 25 }],
      },
      { caption: "กลับสู่สถานการณ์ปัจจุบัน", wait: 2000, run: [{ do: "scenario", setpoint: 24 }] },
    ],
  },
  {
    id: "rooms",
    title: "Rooms ready to sell sooner",
    pitch: "แม่บ้านปิดงาน ฝ่ายต้อนรับเห็นห้องพร้อมขายทันที ไม่ต้องโทรตาม",
    points: ["สถานะ 600 ห้องในมุมมองเดียว", "ไม่ใช้ข้อมูลที่ระบุตัวตนแขก (PDPA)"],
    outcome: `${turnaround.label} ${turnaround.before} → ${turnaround.after} (${turnaround.change})`,
    beats: [
      {
        caption: "H12 · สถานะห้องรายชั้น",
        wait: 4000,
        run: [
          { do: "view", view: "hotel" },
          { do: "floor", floor: "H12" },
        ],
      },
      { caption: "ห้องที่กำลังทำความสะอาด", wait: 4000, run: [{ do: "roomModal", status: "cleaning" }] },
      { caption: "แม่บ้านปิดงาน · ห้องพร้อมขาย", wait: 4000, run: [{ do: "roomStatus", status: "ready" }] },
      { caption: "กลับสู่มุมมองโรงแรม", wait: 1500, run: [{ do: "closeModal" }] },
    ],
  },
  {
    id: "ask",
    title: "Ask the building",
    pitch: "ถามสถานการณ์อาคารเป็นภาษาไทย · เดโมนี้ตอบจากข้อมูลจำลอง ระบบจริงเชื่อม AI ผ่าน API ที่ได้รับอนุญาต",
    points: ["สรุปพลังงาน ห้องพัก เหตุการณ์", "AI อ่านข้อมูลอย่างเดียว · การสั่งงานให้คนอนุมัติ"],
    outcome: `${reporting.label} ${reporting.before} → ${reporting.after} (${reporting.change})`,
    beats: [
      { caption: "AI Assistant", wait: 2500, run: [{ do: "view", view: "ai" }] },
      {
        caption: "ถาม: สรุปสถานการณ์อาคารวันนี้",
        wait: 6500,
        run: [{ do: "ask", question: "สรุปสถานการณ์อาคารวันนี้" }],
      },
    ],
  },
  {
    id: "start",
    title: "Start small, grow",
    pitch: "เริ่มจากเฟส 1 มองเห็นและพลังงาน (อ่านข้อมูลอย่างเดียว) แล้วขยายเมื่อได้สิทธิ์เข้าถึง VMS และ PMS",
    points: ["ออกแบบและติดตั้งโดย Piramid Solutions", "ทำงาน Offline ได้ · ไม่ส่งข้อมูลออกภายนอก"],
    beats: [
      {
        caption: "Value · ผลลัพธ์ที่คาดหวัง (ค่าสมมติ)",
        wait: 6500,
        run: [
          { do: "view", view: "overview", autoRotate: true },
          { do: "modal", kind: "value" },
        ],
      },
      { caption: "Roadmap 3 เฟส", wait: 6500, run: [{ do: "modal", kind: "roadmap" }] },
      { caption: "ขอบคุณครับ", wait: 2500, run: [{ do: "closeModal" }] },
    ],
  },
];

const paced = (chapters: readonly ShowcaseChapter[], pace: number) =>
  chapters.map((c) => ({
    ...c,
    beats: c.beats.map((b) => ({ ...b, wait: Math.max(MIN_WAIT_MS, Math.round(b.wait * pace)) })),
  }));

/** The executive path plays slower: the presenter talks over each business outcome */
export const SHOWCASES: Record<ShowcasePath, readonly ShowcaseChapter[]> = {
  executive: paced(EXECUTIVE, 0.9),
  technical: paced(TECHNICAL, PACE),
};

export const SHOWCASE_PATHS: readonly { id: ShowcasePath; title: string; detail: string }[] = [
  {
    id: "executive",
    title: "Executive",
    detail: `${EXECUTIVE.length} ขั้น · ผลลัพธ์ทางธุรกิจ สำหรับเจ้าของและผู้บริหาร`,
  },
  {
    id: "technical",
    title: "Technical deep-dive",
    detail: `${TECHNICAL.length} ขั้น · ทุกฟีเจอร์ สำหรับวิศวกรรม FM IT และ Security`,
  },
];
