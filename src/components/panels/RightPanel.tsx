"use client";

import { AnimatePresence, motion } from "motion/react";
import { fade } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";
import type { ViewId } from "@/types";
import { AssistantIcon } from "@/components/ui/AssistantIcon";
import { AgentPanel } from "./AgentPanel";
import { AlarmPanel } from "./AlarmPanel";
import { CarbonPanel } from "./CarbonPanel";
import { EventHallPanel } from "./EventHallPanel";
import { ServerRoomPanel } from "./ServerRoomPanel";
import { PlanDetails } from "@/components/floorplan/PlanDetails";
import { DetailsPanel } from "./DetailsPanel";
import { EnergyPanel } from "./EnergyPanel";
import { HotelPanel } from "./HotelPanel";
import { OverviewPanel } from "./OverviewPanel";
import { PublicPanel } from "./PublicPanel";

const DETAILS_TAB: Record<ViewId, string> = {
  executive: "Overview",
  twin: "Layers & Asset",
  ioc: "Operations",
  energy: "Energy",
  overview: "Overview",
  rooms: "Guest Room",
  public: "Zones",
  event: "Events",
  boh: "Alarm & Events",
  ict: "Server room",
  ai: "Carbon",
};

/** 320 / 340px panel with an AI Assistant tab and a scene-specific details tab */
export function RightPanel() {
  const view = useAppStore((s) => s.view);
  const panel = useAppStore((s) => s.panel);
  const setPanel = useAppStore((s) => s.setPanel);
  // Picking something in 3D on Overview shows its details instead of the summary
  const picked = useAppStore((s) => s.selectedFloor !== null || s.asset !== "site");
  const plan = useAppStore((s) => s.spatial === "plan");
  const tabs = [
    ["agent", "AI Assistant"],
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
            <span className="flex items-center justify-center gap-1.5">
              {id === "agent" && <AssistantIcon size={18} />}
              {label}
            </span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${view}-${panel}-${plan}`} {...fade} className="flex min-h-0 flex-1 flex-col">
          {panel === "agent" ? (
            <AgentPanel />
          ) : plan ? (
            <PlanDetails />
          ) : view === "rooms" ? (
            <HotelPanel />
          ) : view === "public" ? (
            <PublicPanel />
          ) : view === "boh" || view === "ioc" ? (
            <AlarmPanel />
          ) : view === "event" ? (
            <EventHallPanel />
          ) : view === "ict" ? (
            <ServerRoomPanel />
          ) : view === "ai" ? (
            <CarbonPanel />
          ) : view === "energy" ? (
            <EnergyPanel />
          ) : (view === "overview" || view === "executive") && !picked ? (
            <OverviewPanel />
          ) : (
            <DetailsPanel />
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
