import {
  BedDouble,
  Box,
  Building,
  Car,
  Factory,
  LayoutGrid,
  type LucideIcon,
  MonitorDot,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";

export type ViewId = "overview" | "twin" | "ioc" | "energy" | "hotel" | "ai";

const NAV: [ViewId, LucideIcon, string][] = [
  ["overview", LayoutGrid, "Executive overview"],
  ["twin", Box, "Digital Twin"],
  ["ioc", MonitorDot, "IOC operations"],
  ["energy", Zap, "Energy Lab"],
  ["hotel", BedDouble, "Hotel · 600 keys"],
  ["ai", Sparkles, "AI Assistant"],
];

// Property Explorer — hidden in the prototype, shown on wide screens (PLAN 8)
const ZONES: [LucideIcon, string, string][] = [
  [Building, "Entire property", "SITE"],
  [Store, "Retail podium", "MALL"],
  [BedDouble, "Hotel tower", "600"],
  [Factory, "Central plant", "MEP"],
  [Car, "Arrival & skywalk", "G"],
];

/** 72px icon rail; 220px with labels and the property explorer from 1440px wide */
export function Sidebar({ active, openIncidents }: { active: ViewId; openIncidents: number }) {
  return (
    <aside className="flex w-[72px] shrink-0 flex-col gap-1 border-r border-line px-3 py-3 wide:w-[220px]">
      <p className="hidden px-2 pb-1 text-[11px] tracking-[0.18em] text-muted wide:block">WORKSPACE</p>
      {NAV.map(([id, Icon, label]) => (
        <button
          key={id}
          title={label}
          aria-current={id === active ? "page" : undefined}
          className={`relative flex h-11 items-center justify-center gap-3 rounded-[var(--radius-card)] border text-[13px] wide:justify-start wide:px-3 ${
            id === active
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          <Icon size={20} strokeWidth={1.6} />
          <span className="hidden wide:inline">{label}</span>
          {id === "ioc" && (
            <b className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-red text-[10px] text-bg wide:static wide:ml-auto">
              {openIncidents}
            </b>
          )}
        </button>
      ))}

      <div className="mt-5 hidden flex-col gap-0.5 wide:flex">
        <p className="px-2 pb-1 text-[11px] tracking-[0.18em] text-muted">PROPERTY EXPLORER</p>
        {ZONES.map(([Icon, label, tag], i) => (
          <button
            key={label}
            className={`flex h-9 items-center gap-3 rounded-[var(--radius-button)] px-3 text-[13px] ${
              i === 0 ? "bg-panel-2 text-text" : "text-muted hover:text-text"
            }`}
          >
            <Icon size={16} strokeWidth={1.6} />
            {label}
            <span className="ml-auto font-mono text-[10px] text-muted">{tag}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto hidden border-t border-line px-2 pt-3 text-[11px] text-muted wide:block">
        <p className="flex items-center gap-2 text-green">
          <span className="size-1.5 rounded-full bg-green" />
          Demo data engine · 12 feeds
        </p>
        <p className="mt-1">Local only · No real system control</p>
        <p className="mt-3 font-semibold tracking-wider text-text">PIRAMID SOLUTIONS</p>
        <p className="tracking-wider">CONSULT & DESIGN</p>
      </div>
    </aside>
  );
}
