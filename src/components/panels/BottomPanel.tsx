"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { type AirBand, aqiBand, co2Band } from "@/data/airQuality";
import { DEMAND_PROFILE_SHAPE } from "@/data/energy";
import { OCCUPANCY_WEEK } from "@/data/kpis";
import { fmt, timeStr } from "@/lib/format";
import { SHORT_SCREEN, useMediaQuery } from "@/lib/useMediaQuery";
import { useAir, useEnergy, useRoomCounts } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { ScenarioLab } from "./EnergyPanel";
import { HotelInventory } from "./HotelPanel";
import { AlarmWorkflow } from "./AlarmPanel";
import { PeopleCounting } from "./PublicPanel";

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

/** Air-quality level as colour + words, never colour alone */
function BandChip({ band }: { band: AirBand }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-1.5 text-[10px] leading-4 whitespace-nowrap"
      style={{ color: band.color, borderColor: band.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: band.color }} />
      {band.label}
    </span>
  );
}

const AIR_SIDES = [
  ["indoor", "Indoor", "var(--accent)"],
  ["outdoor", "Outdoor", "var(--gold)"],
] as const;

/** Indoor vs. outdoor AQI, PM2.5 and CO₂, with both AQI lines over the last 24 h */
function AirComparison() {
  const air = useAir();
  const all = [...air.trend.indoor, ...air.trend.outdoor];
  const max = Math.max(...all) + 5;
  const line = (values: readonly number[]) =>
    values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`).join(" ");
  return (
    <div className="absolute inset-0 top-2 flex flex-col gap-1 text-[11px]">
      <div className="grid grid-cols-[48px_1fr_1fr] items-center gap-x-2 gap-y-0.5">
        <span />
        {AIR_SIDES.map(([id, label, color]) => (
          <span key={id} className="flex items-center gap-1.5 font-semibold">
            <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="text-muted">AQI</span>
        {AIR_SIDES.map(([id]) => (
          <span key={id} className="flex items-center gap-1.5">
            <b className="text-[13px] tabular-nums">{air[id].aqi}</b>
            <BandChip band={aqiBand(air[id].aqi)} />
          </span>
        ))}
        <span className="text-muted">PM2.5</span>
        {AIR_SIDES.map(([id]) => (
          <span key={id} className="tabular-nums">
            {fmt(air[id].pm25, 1)} <span className="text-muted">µg/m³</span>
          </span>
        ))}
        <span className="text-muted">CO₂</span>
        {AIR_SIDES.map(([id]) => (
          <span key={id} className="flex items-center gap-1.5 tabular-nums">
            {fmt(air[id].co2)} <span className="text-muted">ppm</span>
            {id === "indoor" && co2Band(air[id].co2).id !== "good" && <BandChip band={co2Band(air[id].co2)} />}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="min-h-0 w-full flex-1" aria-hidden>
        {AIR_SIDES.map(([id, , color]) => (
          <polyline
            key={id}
            points={line(air.trend[id])}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-muted">
        <span>−24 h</span>
        <span>AQI · US EPA (PM2.5)</span>
        <span>now</span>
      </div>
    </div>
  );
}

/**
 * Bottom panel: each page's and scene's working panel. Executive overview and the Overview scene show the same
 * charts on tall screens; on screens under 900px tall they open on demand.
 */
export function BottomPanel() {
  const view = useAppStore((s) => s.view);
  const open = useAppStore((s) => s.chartsOpen);
  const setOpen = useAppStore((s) => s.setChartsOpen);
  const short = useMediaQuery(SHORT_SCREEN);
  if (view === "rooms") return <HotelInventory />;
  if (view === "public") return <PeopleCounting />;
  if (view === "boh" || view === "ioc") return <AlarmWorkflow />;
  if (view === "ai" || view === "energy") return <ScenarioLab />;
  if (view !== "overview" && view !== "executive") return null;

  if (!open && short)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4 text-[13px] text-muted hover:text-text"
      >
        <ChevronDown size={14} className="rotate-180" /> กราฟภาพรวม · Energy · Occupancy · Air quality
      </button>
    );

  return (
    <div className="grid h-[180px] shrink-0 grid-cols-[1.4fr_1fr_1fr] gap-2">
      <ChartCard title="Energy profile · 24 ชม." meta="kW · วันนี้">
        <DemandChart />
      </ChartCard>
      <ChartCard title="Occupancy trend" meta="% · 7 วัน">
        <OccupancyChart />
      </ChartCard>
      <ChartCard title="AQI comparison" meta="Indoor vs Outdoor · SIM">
        <AirComparison />
      </ChartCard>
    </div>
  );
}
