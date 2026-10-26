"use client";

import {
  BedDouble,
  Box,
  Building,
  Car,
  Factory,
  LayoutGrid,
  type LucideIcon,
  MessageSquareText,
  MonitorDot,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { NAV, ZONES } from "@/data/nav";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useOpenIncidents } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import type { ViewId, ZoneId } from "@/types";

const VIEW_ICON: Record<ViewId, LucideIcon> = {
  overview: LayoutGrid,
  twin: Box,
  ioc: MonitorDot,
  energy: Zap,
  hotel: BedDouble,
  ai: MessageSquareText,
};
const ZONE_ICON: Record<ZoneId, LucideIcon> = {
  all: Building,
  mall: Store,
  hotel: BedDouble,
  plant: Factory,
  arrival: Car,
};

const STORAGE_KEY = "prm.sidebarExpanded";

/**
 * 72px icon rail or 220px with labels and the property explorer. Full from
 * 1440px wide by default; the toggle overrides it and is remembered per browser.
 */
export function Sidebar() {
  const wide = useMediaQuery("(min-width: 1440px)");
  const choice = useAppStore((s) => s.sidebarExpanded);
  const setChoice = useAppStore((s) => s.setSidebarExpanded);
  const expanded = choice ?? wide;

  // Restore the presenter's last choice (browser storage may be unavailable)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setChoice(saved === "true");
    } catch {}
  }, [setChoice]);

  function toggle() {
    setChoice(!expanded);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(!expanded));
    } catch {}
  }

  const view = useAppStore((s) => s.view);
  const zone = useAppStore((s) => s.zone);
  const floor = useAppStore((s) => s.floor);
  const setView = useAppStore((s) => s.setView);
  const selectZone = useAppStore((s) => s.selectZone);
  const open = useOpenIncidents().length;

  return (
    <aside
      className={`flex shrink-0 flex-col gap-1 overflow-hidden border-r border-line px-3 py-3 transition-[width] duration-200 motion-reduce:transition-none ${
        expanded ? "w-[220px]" : "w-[72px]"
      }`}
    >
      <div className={`flex items-center pb-1 ${expanded ? "justify-between pl-2" : "justify-center"}`}>
        {expanded && <p className="text-[11px] tracking-[0.18em] whitespace-nowrap text-muted">WORKSPACE</p>}
        <button
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "หุบเมนู" : "กางเมนู"}
          title={expanded ? "หุบเมนู" : "กางเมนู"}
          className="grid size-8 place-items-center rounded-[var(--radius-button)] text-muted hover:bg-panel-2 hover:text-text"
        >
          {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>
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
              className={`relative flex h-11 items-center justify-center gap-3 rounded-[var(--radius-card)] border text-[13px] whitespace-nowrap transition-colors ${expanded ? "justify-start px-3" : ""} ${
                active ? "border-accent/40 bg-accent/10 text-accent" : "border-transparent text-muted hover:text-text"
              }`}
            >
              <Icon size={20} strokeWidth={1.6} />
              {expanded && <span>{label}</span>}
              {id === "ioc" && open > 0 && (
                <b
                  className={`grid size-4 place-items-center rounded-full bg-red text-[10px] text-bg ${
                    expanded ? "ml-auto" : "absolute top-1 right-1"
                  }`}
                >
                  {open}
                </b>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`mt-5 flex-col gap-0.5 whitespace-nowrap ${expanded ? "flex" : "hidden"}`}>
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

      <div
        className={`mt-auto border-t border-line px-2 pt-3 text-[11px] whitespace-nowrap text-muted ${expanded ? "block" : "hidden"}`}
      >
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
