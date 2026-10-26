"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { CHARTS_ON_DEMAND } from "@/components/layout/Header";
import { DEMAND_PROFILE_SHAPE, FOOTFALL_BY_ZONE, REFERENCE_FOOTFALL } from "@/data/energy";
import { OCCUPANCY_WEEK } from "@/data/kpis";
import { fmt, timeStr } from "@/lib/format";
import { SHORT_SCREEN, useMediaQuery } from "@/lib/useMediaQuery";
import { useEnergy, useRoomCounts } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { ScenarioLab } from "./EnergyPanel";
import { HotelInventory } from "./HotelPanel";

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

/** Building demand 06:00–23:00, scaled so the "now" marker equals the KPI */
function DemandChart() {
  const current = useEnergy().current;
  const time = useAppStore((s) => s.time);
  const values = DEMAND_PROFILE_SHAPE.map((f) => f * current);
  const max = 3200;
  const x = (i: number) => (i / (values.length - 1)) * 100;
  const line = values.map((v, i) => `${x(i)},${100 - (v / max) * 100}`).join(" ");
  const now = x(Math.min(17, Math.max(0, time - 6)));
  return (
    <div className="absolute inset-0 top-2 flex flex-col">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="min-h-0 w-full flex-1" aria-hidden>
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
        <span className="text-gold">
          {timeStr(time)} · {fmt(current)} kW
        </span>
        <span>23:00</span>
      </div>
    </div>
  );
}

const DAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function OccupancyChart() {
  const today = useRoomCounts().occupied / 6;
  const week = [...OCCUPANCY_WEEK, Math.round(today)];
  return (
    <div className="absolute inset-0 top-2 flex items-end gap-2">
      {week.map((v, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted tabular-nums">{v}</span>
          <div
            className={`w-full rounded-t ${i === week.length - 1 ? "bg-green" : "bg-green/35"}`}
            style={{ height: `${Math.max(4, (v - 30) * 1.2)}%` }}
          />
          <span className="font-mono text-[10px] text-muted">{DAYS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function FootfallChart() {
  const scale = useAppStore((s) => s.footfall) / REFERENCE_FOOTFALL;
  const max = FOOTFALL_BY_ZONE[0][1];
  return (
    <div className="absolute inset-0 top-2 flex flex-col justify-between">
      {FOOTFALL_BY_ZONE.map(([zone, v]) => (
        <div key={zone} className="grid grid-cols-[88px_1fr_48px] items-center gap-2 text-[11px]">
          <span className="truncate text-muted">{zone}</span>
          <div className="h-2 rounded-full bg-line/60">
            <div className="h-full rounded-full bg-blue" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="text-right tabular-nums">{fmt(v * scale)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Bottom panel: overview charts. Shown by default on Overview on tall screens;
 * on screens under 900px tall (and on Twin / AI) it opens on demand.
 */
export function BottomPanel() {
  const view = useAppStore((s) => s.view);
  const open = useAppStore((s) => s.chartsOpen);
  const setOpen = useAppStore((s) => s.setChartsOpen);
  const short = useMediaQuery(SHORT_SCREEN);
  // Hotel and Energy always show their working panel (PLAN 5)
  if (view === "hotel") return <HotelInventory />;
  if (view === "energy") return <ScenarioLab />;
  const available = view === "overview" || CHARTS_ON_DEMAND.has(view);
  if (!available) return null;

  const shown = open || (view === "overview" && !short);
  if (!shown)
    return view === "overview" ? (
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4 text-[13px] text-muted hover:text-text"
      >
        <ChevronDown size={14} className="rotate-180" /> กราฟภาพรวม · Energy · Occupancy · Footfall
      </button>
    ) : null;

  return (
    <div className="grid h-[180px] shrink-0 grid-cols-[1.4fr_1fr_1fr] gap-2">
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
  );
}
