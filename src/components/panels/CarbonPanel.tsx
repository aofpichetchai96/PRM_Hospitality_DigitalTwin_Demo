"use client";

// Carbon footprint (Scope 1 + 2), in the AI Assistant scene's second tab: the
// period total, each source's tCO₂e and share with its warning level against
// target (colour + words), and the assumptions. The bottom panel adds today's
// hourly carbon load and the carbon intensities. All from selectCarbon, so the
// setpoint what-if and the assistant's carbon answer agree with it.
import { CircleAlert, CircleCheck, Leaf, type LucideIcon, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { CARBON_LEVEL, type CarbonLevel, type CarbonPeriod, GRID_EF, PERIOD_LABEL } from "@/data/carbon";
import { fmt, timeStr } from "@/lib/format";
import { useCarbon } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "./common";

const LEVEL_ICON: Record<CarbonLevel, LucideIcon> = {
  standard: CircleCheck,
  excessive: TriangleAlert,
  serious: CircleAlert,
};
const PERIODS = Object.keys(PERIOD_LABEL) as CarbonPeriod[];
const t = (v: number) => fmt(v, v < 100 ? 1 : 0);

export function CarbonPanel() {
  const [period, setPeriod] = useState<CarbonPeriod>("month");
  const c = useCarbon(period);
  const ask = useAppStore((s) => s.ask);
  const sources = [...c.sources].sort((a, b) => b.t - a.t);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
      <div
        role="tablist"
        aria-label="ช่วงเวลา"
        className="grid grid-cols-4 gap-1 rounded-[var(--radius-button)] bg-panel-2 p-1"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={p === period}
            onClick={() => setPeriod(p)}
            className={`rounded py-1 text-[13px] ${p === period ? "bg-accent/15 text-accent" : "text-muted hover:text-text"}`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {/* Total in a ring, like the reference dashboard's globe */}
      <section className="flex items-center gap-4">
        <div className="grid size-[112px] shrink-0 place-items-center rounded-full border-[6px] border-accent/30 bg-[radial-gradient(circle,rgb(108_228_223/0.18),transparent_70%)] text-center shadow-[0_0_24px_rgb(108_228_223/0.25)]">
          <span>
            <Leaf size={14} className="mx-auto text-green" />
            <b className="block text-[22px] leading-tight tabular-nums">{t(c.total)}</b>
            <span className="text-[11px] text-muted">tCO₂e</span>
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1 text-[13px]">
          <p className="font-semibold">Carbon emission · {PERIOD_LABEL[period]}</p>
          <p className="text-muted">
            Scope 2 ไฟฟ้า <b className="text-text tabular-nums">{t(c.scope2)}</b> t
          </p>
          <p className="text-muted">
            Scope 1 เชื้อเพลิง <b className="text-text tabular-nums">{t(c.scope1)}</b> t
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-1.5 border-t border-line pt-3">
        <SectionTitle>แหล่งปล่อย · เทียบเป้า</SectionTitle>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          {(Object.keys(CARBON_LEVEL) as CarbonLevel[]).map((l) => (
            <span key={l} className="flex items-center gap-1">
              <i className="size-2 rounded-full" style={{ background: CARBON_LEVEL[l].color }} />
              {CARBON_LEVEL[l].label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {sources.map((s) => {
            const lv = CARBON_LEVEL[s.level];
            const Icon = LEVEL_ICON[s.level];
            return (
              <div
                key={s.id}
                className="rounded-[var(--radius-button)] border px-2.5 py-1.5"
                style={{ borderColor: lv.color, background: `color-mix(in oklab, ${lv.color} 10%, transparent)` }}
                title={`${s.name} · ${lv.th} · ${s.gap > 0 ? "+" : ""}${fmt(s.gap, 1)}% เทียบเป้า`}
              >
                <p className="flex items-center gap-1 truncate text-[13px] font-semibold" style={{ color: lv.color }}>
                  <Icon size={12} className="shrink-0" /> {s.name}
                </p>
                <p className="tabular-nums">
                  <b className="text-[16px]">{t(s.t)}</b> <span className="text-[11px] text-muted">tCO₂e</span>
                </p>
                <p className="flex justify-between text-[11px] text-muted tabular-nums">
                  <span>{fmt(s.pct)}%</span>
                  <span style={{ color: lv.color }}>
                    {s.gap > 0 ? "+" : ""}
                    {fmt(s.gap, 1)}%
                  </span>
                </p>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => ask("Carbon footprint เดือนนี้เป็นอย่างไร")}
          className="mt-1 self-start text-[13px] text-accent"
        >
          ถาม AI วิเคราะห์ Carbon →
        </button>
      </section>

      <p className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-3 text-[13px]">
        ค่าจำลอง: ไฟฟ้าจากแบบจำลองพลังงาน × EF {GRID_EF} kgCO₂e/kWh (TGO) + LPG ครัวและหม้อน้ำร้อน · เป้าเป็นค่าสมมติ ·
        ระบบจริงจะคำนวณตาม GHG Protocol จากมิเตอร์และใบเสร็จเชื้อเพลิง
      </p>
    </div>
  );
}

/** Ring gauge: value as a share of its target (≤ 100 % is within target) */
function Ring({ value, target, label, unit }: { value: number; target: number; label: string; unit: string }) {
  const share = value / target;
  const color = share <= 1 ? "var(--green)" : share <= 1.05 ? "var(--gold)" : "var(--red)";
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="size-[64px] shrink-0 -rotate-90" aria-hidden>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--line)" strokeWidth={7} />
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${Math.min(1, share) * c} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="min-w-0 leading-tight">
        <b className="text-[18px] tabular-nums" style={{ color }}>
          {fmt(share * 100)}%
        </b>
        <p className="truncate text-[11px] text-muted">{label}</p>
        <p className="text-[11px] tabular-nums">
          {fmt(value, value < 1 ? 2 : 1)} / {target} {unit}
        </p>
      </div>
    </div>
  );
}

/** Bottom panel of the AI Assistant scene: today's hourly carbon load and the carbon intensities against target */
export function CarbonCharts() {
  const c = useCarbon("day");
  const time = useAppStore((s) => s.time);
  const max = Math.max(...c.hourly) * 1.15;
  const x = (i: number) => (i / (c.hourly.length - 1)) * 100;
  const line = c.hourly.map((v, i) => `${x(i)},${100 - (v / max) * 100}`).join(" ");
  const now = x(Math.min(17, Math.max(0, time - 6)));
  const nowT = c.hourly[Math.min(17, Math.max(0, Math.floor(time - 6)))];

  return (
    <div className="grid h-[180px] shrink-0 grid-cols-[1.25fr_1fr] gap-2 overflow-hidden short:h-[150px]">
      <section className="flex min-h-0 min-w-0 flex-col rounded-[var(--radius-card)] border border-line bg-panel px-4 py-3">
        <p className="flex items-baseline justify-between text-[13px] font-semibold">
          Real-time carbon load · วันนี้
          <span className="text-[11px] font-normal text-muted">tCO₂e / h · today {t(c.today)} t</span>
        </p>
        {/* Absolutely placed, so the stretched SVG never sizes the card */}
        <div className="relative mt-2 min-h-0 flex-1">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            {[25, 50, 75].map((g) => (
              <line key={g} x1={0} x2={100} y1={g} y2={g} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
            ))}
            <polygon points={`0,100 ${line} 100,100`} fill="var(--green)" opacity={0.14} />
            <polyline
              points={line}
              fill="none"
              stroke="var(--green)"
              strokeWidth={1.75}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={now}
              x2={now}
              y1={0}
              y2={100}
              stroke="var(--text)"
              strokeOpacity={0.5}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className="flex justify-between pt-1 font-mono text-[10px] text-muted">
          <span>06:00</span>
          <span className="text-green">
            {timeStr(time)} · {fmt(nowT, 2)} tCO₂e/h
          </span>
          <span>23:00</span>
        </div>
      </section>
      <section className="flex min-h-0 min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4 py-3">
        <p className="flex items-baseline justify-between text-[13px] font-semibold">
          Carbon intensity
          <span className="text-[11px] font-normal text-muted">kgCO₂e vs target (assumed)</span>
        </p>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-1">
          {c.intensity.map((i) => (
            <Ring key={i.id} value={i.value} target={i.target} label={i.label} unit={i.unit} />
          ))}
        </div>
      </section>
    </div>
  );
}
