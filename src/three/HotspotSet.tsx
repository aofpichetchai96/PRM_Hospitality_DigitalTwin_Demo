"use client";

// Hotspots from the prototype's updateHotspots (L321), with positions and
// visibility driven by the store. Pins turn amber / red only while a matching
// incident is open. Each view shows only the pins that belong to its story, so
// labels don't pile up (review 27 Oct 2026).
import type { RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import { floorSpec, isHotelFloor } from "@/data/property";
import { fmt } from "@/lib/format";
import { roomCounts } from "@/store/selectors";
import type { HotspotId } from "@/store/twinSlice";
import { useAppStore } from "@/store/useAppStore";
import type { IncidentType, Vec3, ViewId } from "@/types";
import { Hotspot, type HotspotTone } from "./Hotspot";

type Spot = { id: HotspotId; position: Vec3; title: string; detail: string; tone: HotspotTone; visible: boolean };

const VIEW_SPOTS: Record<ViewId, readonly HotspotId[]> = {
  executive: ["hotel", "mall"],
  twin: ["hotel", "mall", "plant", "security", "ahu", "people"],
  ioc: ["security", "plant", "ahu", "people"],
  energy: ["plant", "ahu", "hotel"],
  overview: ["hotel", "mall", "security"],
  // The plan view keeps the rooms and their kW clear of pins
  rooms: [],
  public: ["security"],
  // The alarm callout (AlarmCallout) labels the alarmed unit, so no CH-01 pin on top of it
  boh: ["ahu"],
  ai: ["hotel", "mall", "plant"],
};

export function HotspotSet({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const s = useAppStore(
    useShallow((st) => ({
      view: st.view,
      mode: st.mode,
      floor: st.floor,
      explode: st.explode,
      layers: st.layers,
      rooms: st.rooms,
      incidents: st.incidents,
      presentation: st.presentation,
    })),
  );
  const activate = useAppStore((st) => st.activateHotspot);

  const openTypes = new Set<IncidentType>(s.incidents.filter((e) => e.status < 3).map((e) => e.type));
  const sliceFloor = s.mode === "slice" && s.floor !== "all" ? s.floor : null;
  const podiumSlice = sliceFloor !== null && !isHotelFloor(sliceFloor);
  const hotelY = sliceFloor && isHotelFloor(sliceFloor) ? floorSpec(sliceFloor).y + 2 : 118 + (s.explode ? 31 : 0);
  const occupancy = fmt(roomCounts(s.rooms).occupied / 6);

  const spots: Spot[] = [
    {
      id: "hotel",
      position: [31, hotelY, 3],
      title: "HOTEL · 600 KEYS",
      detail: `${occupancy}% occupied · PMS demo`,
      tone: "info",
      visible: !podiumSlice,
    },
    {
      id: "mall",
      position: [-31, 19, 26],
      title: "RETAIL PODIUM",
      detail: "People flow + tenant operations",
      tone: "info",
      visible: true,
    },
    {
      id: "plant",
      position: [56, 6, -26],
      title: "CH-01 · CENTRAL PLANT",
      detail: "Energy + asset health",
      tone: openTypes.has("plant") || openTypes.has("leak") ? "warning" : "info",
      visible: s.layers.energy || s.layers.assets,
    },
    {
      id: "security",
      position: [38, 10, 24],
      title: "SECURITY EVENT",
      detail: "L2 service access · Demo",
      tone: "alert",
      visible: s.layers.security && openTypes.has("security"),
    },
    {
      id: "ahu",
      position: [-12, 78 + (s.explode ? 16 : 0), 3],
      title: "AHU-H12",
      detail: "Temperature advisory",
      tone: openTypes.has("ahu") ? "warning" : "info",
      visible: s.layers.assets && !podiumSlice,
    },
    {
      id: "people",
      position: [-24, 5, 32],
      title: "PEOPLE FLOW",
      detail: "Aggregated entry counts · Demo",
      tone: openTypes.has("people") ? "warning" : "info",
      visible: s.layers.people,
    },
  ];

  return spots
    .filter((h) => h.visible && VIEW_SPOTS[s.view].includes(h.id))
    .map((h) => (
      <Hotspot
        key={h.id}
        position={h.position}
        title={h.title}
        detail={h.detail}
        tone={h.tone}
        onClick={() => activate(h.id)}
        portal={portal}
      />
    ));
}
