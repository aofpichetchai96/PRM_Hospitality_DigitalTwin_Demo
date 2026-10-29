// Sidebar: the workspace pages and the property explorer's seven scenes
import type { SceneId, ViewId } from "@/types";

export const WORKSPACE: readonly { id: ViewId; label: string }[] = [
  { id: "executive", label: "Executive overview" },
  { id: "twin", label: "Digital Twin" },
  { id: "ioc", label: "IOC operations" },
  { id: "energy", label: "Energy Lab" },
  { id: "ai", label: "AI Assistant" },
];

/** In the order keys 1–7 and ← / → open them */
export const SCENES: readonly { id: SceneId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "rooms", label: "Guest Room" },
  { id: "public", label: "Public Area" },
  { id: "event", label: "Event Hall" },
  { id: "boh", label: "Back of House" },
  { id: "ict", label: "ICT" },
  { id: "ai", label: "AI Assistant" },
];

export const SCENE_IDS = SCENES.map((s) => s.id);
