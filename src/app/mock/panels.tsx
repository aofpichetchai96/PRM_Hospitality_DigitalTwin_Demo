// Phase 2 mock panels with hard-coded prototype content (PLAN 5). Real data,
// store wiring and interaction come in Phase 3–5.
import { ArrowUpRight, BedDouble, ChevronDown, Send, Sparkles, Store } from "lucide-react";
import type { ReactNode } from "react";

function Tabs({ tabs, active }: { tabs: string[]; active: number }) {
  return (
    <div className="grid grid-cols-2 gap-1 border-b border-line p-2 text-[13px]">
      {tabs.map((t, i) => (
        <span
          key={t}
          className={`rounded-[var(--radius-button)] py-1.5 text-center ${i === active ? "bg-accent/12 text-accent" : "text-muted"}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[13px] font-semibold">{children}</h2>
      {action && (
        <span className="flex items-center gap-0.5 text-[12px] text-accent">
          {action} <ArrowUpRight size={12} />
        </span>
      )}
    </div>
  );
}

export function RightPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel wide:w-[340px]">
      {children}
    </aside>
  );
}

const CHIPS = ["สรุปอาคาร", "พื้นที่ที่เลือก", "ค่าไฟวันนี้", "เหตุการณ์ค้าง", "ห้องพร้อมขาย", "งานบำรุงรักษา"];

/** Twin: AI Agent tab (the other tab is Layers & Asset inspector) */
export function AgentPanel() {
  return (
    <>
      <Tabs tabs={["AI Agent", "Layers & Asset"]} active={0} />
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-accent">
            <Sparkles size={16} /> PRM AI Agent
          </p>
          <p className="text-[13px] text-muted">ผู้ช่วยประจำอาคาร · ถามข้อมูลและสำรวจพื้นที่</p>
        </div>
        <span className="shrink-0 rounded border border-gold/50 px-1.5 text-[10px] tracking-wider whitespace-nowrap text-gold">
          LOCAL DEMO
        </span>
      </div>
      <p className="border-b border-line bg-panel-2 px-4 py-1.5 text-[12px] text-muted">
        บริบท: อาคารทั้งหมด · 14:30 · ข้อมูลจำลอง
      </p>

      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3.5 text-[13px]">
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-accent">
            <Sparkles size={14} /> สวัสดีครับ ผมคือผู้ช่วย PRM Hospitality
          </p>
          <p>ผมช่วยสรุปภาพรวมอาคาร ตรวจเหตุการณ์ค้าง วิเคราะห์พลังงาน และดูสถานะห้องพักได้ครับ</p>
          <p className="mt-2 text-muted">คำตอบเปลี่ยนตาม Room status, Energy Lab และ Incident ที่ทดลองในหน้านี้</p>
        </div>
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <span key={c} className="rounded-full border border-line px-2.5 py-0.5 text-[13px] hover:border-accent/60">
              {c}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="flex h-10 flex-1 items-center rounded-[var(--radius-button)] border border-line bg-bg px-3 text-[13px] text-muted">
            ถามเกี่ยวกับอาคาร...
          </span>
          <span className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-accent text-bg">
            <Send size={16} />
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted">ตอบตามกฎจากข้อมูลในหน้านี้ · ยังไม่เชื่อมต่อ AI / LLM</p>
      </div>
    </>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-semibold tabular-nums" style={{ color: tone }}>
        {value} {unit && <span className="text-[11px] font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

function BusinessCard({
  icon,
  title,
  tag,
  children,
}: {
  icon: ReactNode;
  title: string;
  tag: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3">
      <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
        {icon} {title}
        <span className="ml-auto font-mono text-[10px] font-normal text-muted">{tag}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

const EVENTS = [
  { tone: "bg-red", title: "ประตู Service L2 เปิดค้าง", where: "L2 · Service access", time: "14:26", level: "สูง" },
  { tone: "bg-gold", title: "อุณหภูมิลมจ่าย AHU-H12 สูง", where: "H12 · Hotel HVAC", time: "14:22", level: "กลาง" },
  {
    tone: "bg-gold",
    title: "ประสิทธิภาพ Chiller ควรตรวจสอบ",
    where: "Central plant · CH-01",
    time: "14:18",
    level: "กลาง",
  },
];

/** Overview: business summary per side, top-3 priority events, intelligence brief (PLAN 5 — new) */
export function OverviewPanel() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>สรุปธุรกิจ · สองธุรกิจในอาคารเดียว</SectionTitle>
        <BusinessCard icon={<BedDouble size={15} className="text-green" />} title="Hotel" tag="600 KEYS">
          <Stat label="Occupancy" value="84" unit="%" tone="var(--green)" />
          <Stat label="ห้องว่างขาย" value="96" unit="ห้อง" />
          <Stat label="ทำความสะอาด" value="28" unit="ห้อง" tone="var(--gold)" />
        </BusinessCard>
        <BusinessCard icon={<Store size={15} className="text-blue" />} title="Retail podium" tag="MALL">
          <Stat label="Footfall" value="27,840" tone="var(--blue)" />
          <Stat label="โซนหนาแน่น" value="L1" unit="Retail" />
          <Stat label="เหตุการณ์" value="1" unit="สูง" tone="var(--red)" />
        </BusinessCard>
      </section>

      <section className="flex flex-col gap-1">
        <SectionTitle action="ดูทั้งหมด">Priority events</SectionTitle>
        {EVENTS.map((e) => (
          <div key={e.title} className="flex gap-2.5 border-b border-line/70 py-2 last:border-0">
            <span className={`mt-2 size-2 shrink-0 rounded-full ${e.tone}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{e.title}</p>
              <p className="text-[11px] text-muted">
                {e.where} · ความสำคัญ{e.level}
              </p>
            </div>
            <span className="font-mono text-[11px] text-muted">{e.time}</span>
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-3 text-[13px]">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-accent">
          <Sparkles size={14} /> INTELLIGENCE BRIEF
        </p>
        <p>3 เหตุการณ์ต้องติดตาม · 28 ห้องกำลังทำความสะอาด · ทดลองลดภาระ Cooling ได้ใน Energy Lab</p>
        <p className="mt-1.5 text-[12px] text-accent">ถามผู้ช่วยต่อ →</p>
      </section>
    </div>
  );
}

// Hourly building demand (kW), 06:00–23:00; 14:30 matches the KPI (2,616)
const DEMAND = [
  1520, 1690, 1910, 2140, 2290, 2380, 2450, 2510, 2580, 2616, 2680, 2700, 2650, 2560, 2420, 2240, 1980, 1760,
];
const OCCUPANCY = [78, 81, 83, 80, 86, 88, 84];
const FOOTFALL: [string, number][] = [
  ["Retail L1", 9820],
  ["F&B L2", 6140],
  ["Arrival G", 5310],
  ["Event hall L3", 3920],
  ["Skywalk", 2650],
];

function ChartCard({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel px-4 py-3">
      <p className="flex items-baseline justify-between text-[13px] font-semibold">
        {title} <span className="text-[11px] font-normal text-muted">{meta}</span>
      </p>
      <div className="relative min-h-0 flex-1 pt-2">{children}</div>
    </section>
  );
}

function DemandChart() {
  const max = 3000;
  const x = (i: number) => (i / (DEMAND.length - 1)) * 100;
  const y = (v: number) => 100 - (v / max) * 100;
  const line = DEMAND.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const now = x(8.5); // 14:30
  return (
    <div className="absolute inset-0 top-2 flex flex-col">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="min-h-0 w-full flex-1 overflow-visible"
        aria-hidden
      >
        {[25, 50, 75].map((g) => (
          <line key={g} x1={0} x2={100} y1={g} y2={g} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
        ))}
        <polygon points={`0,100 ${line} 100,100`} fill="var(--accent)" opacity={0.14} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.75}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={now}
          x2={now}
          y1={0}
          y2={100}
          stroke="var(--gold)"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between pt-1 font-mono text-[10px] text-muted">
        <span>06:00</span>
        <span className="text-gold">14:30 · 2,616 kW</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

function OccupancyChart() {
  return (
    <div className="flex h-full items-end gap-2">
      {OCCUPANCY.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted tabular-nums">{v}</span>
          <div
            className={`w-full rounded-t ${i === OCCUPANCY.length - 1 ? "bg-green" : "bg-green/35"}`}
            style={{ height: `${(v - 60) * 2.2}%` }}
          />
          <span className="font-mono text-[10px] text-muted">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"][i]}</span>
        </div>
      ))}
    </div>
  );
}

function FootfallChart() {
  const max = FOOTFALL[0][1];
  return (
    <div className="flex h-full flex-col justify-between">
      {FOOTFALL.map(([zone, v]) => (
        <div key={zone} className="grid grid-cols-[88px_1fr_44px] items-center gap-2 text-[11px]">
          <span className="truncate text-muted">{zone}</span>
          <div className="h-2 rounded-full bg-line/60">
            <div className="h-full rounded-full bg-blue" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="text-right tabular-nums">{v.toLocaleString("en-US")}</span>
        </div>
      ))}
    </div>
  );
}

/** Overview bottom panel; folds to a 36px bar on screens under 900px tall */
export function OverviewBottomPanel() {
  return (
    <>
      <div className="hidden h-[180px] shrink-0 grid-cols-[1.4fr_1fr_1fr] gap-2 tall:grid">
        <ChartCard title="Energy profile · 24 ชม." meta="kW · วันนี้">
          <DemandChart />
        </ChartCard>
        <ChartCard title="Occupancy trend" meta="% · 7 วัน">
          <OccupancyChart />
        </ChartCard>
        <ChartCard title="Footfall by zone" meta="entries · วันนี้">
          <FootfallChart />
        </ChartCard>
      </div>
      <button className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4 text-[13px] text-muted tall:hidden">
        <ChevronDown size={14} className="rotate-180" /> กราฟภาพรวม · Energy · Occupancy · Footfall
      </button>
    </>
  );
}
