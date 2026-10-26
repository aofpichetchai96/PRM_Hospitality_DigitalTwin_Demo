// Sidebar navigation and property explorer (prototype NAV L344, tree L356)
import type { ViewId, ZoneId } from "@/types";

export const NAV: readonly { id: ViewId; label: string }[] = [
  { id: "overview", label: "Executive overview" },
  { id: "twin", label: "Digital Twin" },
  { id: "ioc", label: "IOC operations" },
  { id: "energy", label: "Energy Lab" },
  { id: "hotel", label: "Hotel · 600 keys" },
  { id: "ai", label: "AI Assistant" },
];

export const ZONES: readonly { id: ZoneId; label: string; tag: string }[] = [
  { id: "all", label: "Entire property", tag: "SITE" },
  { id: "mall", label: "Retail podium", tag: "MALL" },
  { id: "hotel", label: "Hotel tower", tag: "600" },
  { id: "plant", label: "Central plant", tag: "MEP" },
  { id: "arrival", label: "Arrival & skywalk", tag: "G" },
];
