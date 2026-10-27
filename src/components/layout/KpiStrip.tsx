"use client";

import { BedDouble, type LucideIcon, TriangleAlert, Users, Zap } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { KPI_YESTERDAY } from "@/data/kpis";
import { fmt } from "@/lib/format";
import { useKpis } from "@/store/hooks";

/** Change against the same time yesterday; `good` colours it green */
type Delta = { text: string; up: boolean; good: boolean };

const pct = (now: number, before: number) => ((now - before) / before) * 100;
function delta(change: number, unit: string, upIsGood: boolean, digits = 1): Delta | undefined {
  if (Math.abs(change) < 0.05) return undefined;
  return { text: `${fmt(Math.abs(change), digits)}${unit}`, up: change > 0, good: change > 0 === upIsGood };
}

type Card = {
  /** What the number covers (Hotel / Mall / whole building) and when */
  label: string;
  /** Label for cards under 1440px wide */
  shortLabel: string;
  icon: LucideIcon;
  value: string;
  unit?: string;
  note: string;
  source: string;
  /** Source label colour (prototype: green PMS, cyan EMS / AI, gold IOC) */
  color: string;
  sparkColor: string;
  trend: readonly number[];
  delta?: Delta;
};

/**
 * Four KPI cards in the prototype's layout (~94px; ~72px when floating), all derived from the store. `floating` renders
 * the translucent variant laid over the viewport on screens under 900px tall.
 */
export function KpiStrip({ floating = false }: { floating?: boolean }) {
  const k = useKpis();
  const cards: Card[] = [
    {
      label: "OCCUPANCY · HOTEL NOW",
      shortLabel: "OCCUPANCY · HOTEL",
      icon: BedDouble,
      value: fmt(k.occupancy.value),
      unit: "%",
      note: `${fmt(k.occupancy.occupied)} / 600 rooms occupied`,
      source: "PMS",
      color: "var(--green)",
      sparkColor: "var(--accent)",
      trend: k.occupancy.trend,
      delta: delta(k.occupancy.value - KPI_YESTERDAY.occupancy, " pts", true),
    },
    {
      label: "DEMAND · WHOLE BUILDING NOW",
      shortLabel: "DEMAND · BUILDING",
      icon: Zap,
      value: fmt(k.demand.value),
      unit: "kW",
      note:
        Math.abs(k.demand.savingPct) > 0.05 ? `${fmt(k.demand.savingPct, 1)}% vs. 24°C` : "Illustrative energy model",
      source: "EMS",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: k.demand.trend,
      delta: delta(pct(k.demand.value, KPI_YESTERDAY.demand), "%", false),
    },
    {
      label: "FOOTFALL · MALL TODAY",
      shortLabel: "FOOTFALL · MALL",
      icon: Users,
      value: fmt(k.footfall.value),
      note: "Entry counts, not unique people",
      source: "AI",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: k.footfall.trend,
      delta: delta(pct(k.footfall.value, KPI_YESTERDAY.footfall), "%", true),
    },
    {
      label: "INCIDENTS · MALL + HOTEL OPEN",
      shortLabel: "INCIDENTS · OPEN",
      icon: TriangleAlert,
      value: String(k.incidents.value),
      // The high-priority count lives in the note: next to the value the sparkline covered it
      note: `${k.incidents.high} high priority${k.incidents.workOrders ? ` · ${k.incidents.workOrders} work orders` : ""}`,
      source: "IOC",
      color: "var(--gold)",
      sparkColor: "var(--gold)",
      trend: k.incidents.trend,
      delta: delta(k.incidents.value - KPI_YESTERDAY.incidents, "", false, 0),
    },
  ];

  return (
    <section aria-label="Simulated operational metrics" className="grid grid-cols-4 gap-2 tall:gap-3">
      {cards.map((c) => (
        // Prototype KPI card (.kpi): label + icon, large value, note + source line, corner sparkline
        <article
          key={c.label}
          className={`relative overflow-hidden rounded-[var(--radius-card)] border px-4 py-3 ${
            floating
              ? "pointer-events-auto border-line/70 bg-panel/80 backdrop-blur-md"
              : "border-line bg-[linear-gradient(115deg,#121f30,#0c1725)]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] tracking-wide text-[#a2b3c7]">
            <span className="hidden truncate wide:inline">{c.label}</span>
            <span className="truncate wide:hidden">{c.shortLabel}</span>
            <c.icon size={17} strokeWidth={1.65} className="shrink-0 text-accent" />
          </div>
          <p className="mt-1.5 flex items-baseline whitespace-nowrap">
            <span className="text-[27px] leading-none font-[550] tracking-[-0.03em] tabular-nums">{c.value}</span>
            {c.unit && <small className="ml-1.5 text-[11px] text-[#95a9bd]">{c.unit}</small>}
            {c.delta && (
              <small
                title="เทียบกับเมื่อวานเวลาเดียวกัน (ค่าสมมติ)"
                className={`ml-2 hidden text-[11px] font-semibold wide:inline ${c.delta.good ? "text-green" : "text-gold"}`}
              >
                {c.delta.up ? "▲" : "▼"} {c.delta.text}
                <span className="font-normal text-[#8197af]"> vs. yesterday</span>
              </small>
            )}
          </p>
          {/* Screens under 900px tall drop the note line, as the prototype did on small screens */}
          <div className={`mt-2 justify-between gap-2 text-[10px] text-[#8197af] ${floating ? "hidden" : "flex"}`}>
            <span className="truncate">{c.note}</span>
            <span className="shrink-0" style={{ color: c.color }}>
              {c.source} · DEMO
            </span>
          </div>
          <Sparkline
            values={c.trend}
            color={c.sparkColor}
            className={`absolute right-4 h-[22px] w-[72px] opacity-60 ${floating ? "bottom-3" : "bottom-[26px]"}`}
          />
        </article>
      ))}
    </section>
  );
}
