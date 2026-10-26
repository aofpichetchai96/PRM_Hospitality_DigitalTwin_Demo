import { BedDouble, type LucideIcon, TriangleAlert, Users, Zap } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";

export type Kpi = {
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

// Prototype t0 values (PLAN 7): 84 % / 2,616 kW / 27,840 / 3
export const KPIS: Kpi[] = [
  {
    label: "HOTEL OCCUPANCY",
    shortLabel: "OCCUPANCY",
    icon: BedDouble,
    value: "84",
    unit: "%",
    note: "504 / 600 rooms",
    source: "PMS",
    color: "var(--green)",
    trend: [78, 79, 81, 80, 82, 83, 84],
  },
  {
    label: "BUILDING DEMAND",
    shortLabel: "DEMAND",
    icon: Zap,
    value: "2,616",
    unit: "kW",
    note: "Illustrative model",
    source: "EMS",
    color: "var(--accent)",
    trend: [2210, 2340, 2490, 2580, 2650, 2590, 2616],
  },
  {
    label: "MALL FOOTFALL TODAY",
    shortLabel: "FOOTFALL",
    icon: Users,
    value: "27,840",
    note: "Entry counts",
    source: "AI",
    color: "var(--blue)",
    trend: [8, 12, 15, 19, 22, 25, 27.8],
  },
  {
    label: "OPEN INCIDENTS",
    shortLabel: "INCIDENTS",
    icon: TriangleAlert,
    value: "3",
    unit: "1 high priority",
    note: "Detect → Verify → Respond",
    source: "IOC",
    color: "var(--gold)",
    trend: [1, 2, 2, 4, 3, 3, 3],
  },
];

/**
 * Four KPI cards, ~72px tall. `floating` renders the translucent variant laid
 * over the top edge of the viewport on screens under 900px tall (PLAN 8).
 */
export function KpiStrip({ floating = false }: { floating?: boolean }) {
  return (
    <section
      aria-label="Simulated operational metrics"
      className={`grid grid-cols-4 gap-2 ${floating ? "pointer-events-auto" : ""}`}
    >
      {KPIS.map((k) => (
        <article
          key={k.label}
          className={`relative flex h-[72px] items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border px-3.5 ${
            floating ? "border-line/70 bg-panel/75 backdrop-blur-md" : "border-line bg-panel"
          }`}
        >
          <div className="min-w-0 flex-1 leading-none">
            <p className="flex items-center gap-1.5 text-[11px] tracking-wider text-muted">
              <k.icon size={13} strokeWidth={1.8} style={{ color: k.color }} />
              <span className="hidden truncate wide:inline">{k.label}</span>
              <span className="truncate wide:hidden">{k.shortLabel}</span>
            </p>
            <p className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[26px] font-semibold tracking-tight tabular-nums">{k.value}</span>
              {k.unit && <span className="text-[12px] text-muted">{k.unit}</span>}
            </p>
          </div>
          <div className="flex h-full w-[38%] max-w-[150px] flex-col justify-center gap-1 text-right">
            <Sparkline values={k.trend} color={k.color} className="h-7 w-full" />
            <p className="hidden truncate text-[10px] text-muted wide:block">
              {k.note} · <span style={{ color: k.color }}>{k.source}</span>
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
