"use client";

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
import { NAV, ZONES } from "@/data/nav";
import { useOpenIncidents } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import type { ViewId, ZoneId } from "@/types";

const VIEW_ICON: Record<ViewId, LucideIcon> = {
  overview: LayoutGrid,
  twin: Box,
  ioc: MonitorDot,
  energy: Zap,
  hotel: BedDouble,
  ai: Sparkles,
};
const ZONE_ICON: Record<ZoneId, LucideIcon> = {
  all: Building,
  mall: Store,
  hotel: BedDouble,
  plant: Factory,
  arrival: Car,
};

/** 72px icon rail; 220px with labels and the property explorer from 1440px wide */
export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const zone = useAppStore((s) => s.zone);
  const floor = useAppStore((s) => s.floor);
  const setView = useAppStore((s) => s.setView);
  const selectZone = useAppStore((s) => s.selectZone);
  const open = useOpenIncidents().length;

  return (
    <aside className="flex w-[72px] shrink-0 flex-col gap-1 border-r border-line px-3 py-3 wide:w-[220px]">
      <p className="hidden px-2 pb-1 text-[11px] tracking-[0.18em] text-muted wide:block">WORKSPACE</p>
      <nav className="flex flex-col gap-1" aria-label="Workspace">
        {NAV.map(({ id, label }) => {
          const Icon = VIEW_ICON[id];
          const active = id === view;
          return (
            <button
              key={id}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={() => setView(id)}
              className={`relative flex h-11 items-center justify-center gap-3 rounded-[var(--radius-card)] border text-[13px] transition-colors wide:justify-start wide:px-3 ${
                active ? "border-accent/40 bg-accent/10 text-accent" : "border-transparent text-muted hover:text-text"
              }`}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span className="hidden wide:inline">{label}</span>
              {id === "ioc" && open > 0 && (
                <b className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-red text-[10px] text-bg wide:static wide:ml-auto">
                  {open}
                </b>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 hidden flex-col gap-0.5 wide:flex">
        <p className="px-2 pb-1 text-[11px] tracking-[0.18em] text-muted">PROPERTY EXPLORER</p>
        {ZONES.map(({ id, label, tag }) => {
          const Icon = ZONE_ICON[id];
          const active = id === zone && floor === "all";
          return (
            <button
              key={id}
              aria-pressed={active}
              onClick={() => selectZone(id)}
              className={`flex h-9 items-center gap-3 rounded-[var(--radius-button)] px-3 text-[13px] transition-colors ${
                active ? "bg-panel-2 text-text" : "text-muted hover:text-text"
              }`}
            >
              <Icon size={16} strokeWidth={1.6} />
              {label}
              <span className="ml-auto font-mono text-[10px] text-muted">{tag}</span>
            </button>
          );
        })}
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
