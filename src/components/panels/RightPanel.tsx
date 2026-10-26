"use client";

import { AnimatePresence, motion } from "motion/react";
import { fade } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";
import type { ViewId } from "@/types";
import { AgentPanel } from "./AgentPanel";
import { PlanDetails } from "@/components/floorplan/PlanDetails";
import { DetailsPanel } from "./DetailsPanel";
import { EnergyPanel } from "./EnergyPanel";
import { HotelPanel } from "./HotelPanel";
import { IocPanel } from "./IocPanel";
import { OverviewPanel } from "./OverviewPanel";

const DETAILS_TAB: Record<ViewId, string> = {
  overview: "ภาพรวม",
  twin: "Layers & Asset",
  ioc: "Operations",
  energy: "Energy",
  hotel: "Hotel",
  ai: "Layers & Asset",
};

/** 320 / 340px panel with an AI Agent tab and a view-specific details tab */
export function RightPanel() {
  const view = useAppStore((s) => s.view);
  const panel = useAppStore((s) => s.panel);
  const setPanel = useAppStore((s) => s.setPanel);
  // Picking something in 3D on Overview shows its details instead of the summary
  const picked = useAppStore((s) => s.selectedFloor !== null || s.asset !== "site");
  const plan = useAppStore((s) => s.spatial === "plan");
  const tabs = [
    ["agent", "AI Agent"],
    ["details", DETAILS_TAB[view]],
  ] as const;

  return (
    <aside
      aria-label="Operations and asset details"
      className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel wide:w-[340px]"
    >
      <div role="tablist" className="grid grid-cols-2 gap-1 border-b border-line p-2 text-[13px]">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={panel === id}
            onClick={() => setPanel(id)}
            className={`rounded-[var(--radius-button)] py-1.5 transition-colors ${
              panel === id ? "bg-accent/12 text-accent" : "text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${view}-${panel}-${plan}`} {...fade} className="flex min-h-0 flex-1 flex-col">
          {panel === "agent" ? (
            <AgentPanel />
          ) : plan ? (
            <PlanDetails />
          ) : view === "hotel" ? (
            <HotelPanel />
          ) : view === "ioc" ? (
            <IocPanel />
          ) : view === "energy" ? (
            <EnergyPanel />
          ) : view === "overview" && !picked ? (
            <OverviewPanel />
          ) : (
            <DetailsPanel />
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
