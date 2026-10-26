"use client";

import { BedDouble, type LucideIcon, TriangleAlert, Users, Zap } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { fmt } from "@/lib/format";
import { useKpis } from "@/store/hooks";

type Card = {
  label: string;
  /** Label for cards under 1440px wide */
  shortLabel: string;
  icon: LucideIcon;
  value: string;
  unit?: string;
  note: string;
  source: string;
  color: string;
  trend: readonly number[];
};

/**
 * Four KPI cards, ~72px tall, all derived from the store. `floating` renders
 * the translucent variant laid over the viewport on screens under 900px tall.
 */
export function KpiStrip({ floating = false }: { floating?: boolean }) {
  const k = useKpis();
  const cards: Card[] = [
    {
      label: "HOTEL OCCUPANCY",
      shortLabel: "OCCUPANCY",
      icon: BedDouble,
      value: fmt(k.occupancy.value),
      unit: "%",
      note: `${fmt(k.occupancy.occupied)} / 600 rooms`,
      source: "PMS",
      color: "var(--green)",
      trend: k.occupancy.trend,
    },
    {
      label: "BUILDING DEMAND",
      shortLabel: "DEMAND",
      icon: Zap,
      value: fmt(k.demand.value),
      unit: "kW",
      note: Math.abs(k.demand.savingPct) > 0.05 ? `${fmt(k.demand.savingPct, 1)}% vs. 24°C` : "Illustrative model",
      source: "EMS",
      color: "var(--accent)",
      trend: k.demand.trend,
    },
    {
      label: "MALL FOOTFALL TODAY",
      shortLabel: "FOOTFALL",
      icon: Users,
      value: fmt(k.footfall.value),
      note: "Entry counts",
      source: "AI",
      color: "var(--blue)",
      trend: k.footfall.trend,
    },
    {
      label: "OPEN INCIDENTS",
      shortLabel: "INCIDENTS",
      icon: TriangleAlert,
      value: String(k.incidents.value),
      unit: `${k.incidents.high} high priority`,
      note: k.incidents.workOrders ? `${k.incidents.workOrders} work orders` : "Detect → Verify → Respond",
      source: "IOC",
      color: "var(--gold)",
      trend: k.incidents.trend,
    },
  ];

  return (
    <section aria-label="Simulated operational metrics" className="grid grid-cols-4 gap-2">
      {cards.map((c) => (
        <article
          key={c.label}
          className={`relative flex h-[72px] items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border px-3.5 ${
            floating ? "pointer-events-auto border-line/70 bg-panel/75 backdrop-blur-md" : "border-line bg-panel"
          }`}
        >
          <div className="min-w-0 flex-1 leading-none">
            <p className="flex items-center gap-1.5 text-[11px] tracking-wider text-muted">
              <c.icon size={13} strokeWidth={1.8} style={{ color: c.color }} />
              <span className="hidden truncate wide:inline">{c.label}</span>
              <span className="truncate wide:hidden">{c.shortLabel}</span>
            </p>
            <p className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[26px] font-semibold tracking-tight tabular-nums">{c.value}</span>
              {c.unit && <span className="text-[12px] text-muted">{c.unit}</span>}
            </p>
          </div>
          <div className="flex h-full w-[38%] max-w-[150px] flex-col justify-center gap-1 text-right">
            <Sparkline values={c.trend} color={c.color} className="h-7 w-full" />
            <p className="hidden truncate text-[10px] text-muted wide:block">
              {c.note} · <span style={{ color: c.color }}>{c.source}</span>
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
