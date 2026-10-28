// KPI sparkline history (prototype spark L355). The live value is appended
// as the last point by the kpis selector.
import type { ViewId } from "@/types";

export const KPI_HISTORY = {
  occupancy: [68, 74, 72, 81, 77, 84, 82],
  demand: [1400, 1700, 1580, 2050, 2300, 2160, 2500],
  footfall: [1200, 4300, 6200, 12800, 14800, 18900, 23700],
  incidents: [6, 4, 5, 3, 2, 4, 3],
  /** Rooms still to arrive, people on the lobby floor and entrance entries so far (assumed) */
  arrivals: [41, 38, 44, 36, 40, 37],
  lobbyPeople: [92, 120, 168, 190, 176, 198],
  entrance: [180, 820, 1650, 2400, 3100, 3800],
} as const;

/** Same time yesterday (assumed) — the cards show ▲ / ▼ against these */
export const KPI_YESTERDAY = { occupancy: 82, demand: 2580, footfall: 26950, incidents: 4 } as const;

/** Daily hotel occupancy for the overview trend (last value is today) */
export const OCCUPANCY_WEEK: readonly number[] = [78, 81, 83, 80, 86, 88];

/** KPI cards of the strip; each scene shows four (KPI_SETS) */
export type KpiId =
  | "occupancy"
  | "demand"
  | "footfall"
  | "cases"
  | "indoorAir"
  | "roomMix"
  | "hotelPower"
  | "arrivals"
  | "lobbyPeople"
  | "doorCount"
  | "busiestZone";

export const KPI_SETS: Record<ViewId, readonly [KpiId, KpiId, KpiId, KpiId]> = {
  executive: ["occupancy", "demand", "footfall", "cases"],
  twin: ["occupancy", "demand", "footfall", "cases"],
  ioc: ["occupancy", "demand", "footfall", "cases"],
  energy: ["occupancy", "demand", "footfall", "cases"],
  overview: ["occupancy", "demand", "footfall", "cases"],
  rooms: ["occupancy", "roomMix", "hotelPower", "arrivals"],
  public: ["lobbyPeople", "doorCount", "busiestZone", "indoorAir"],
  boh: ["demand", "cases", "indoorAir", "occupancy"],
  ai: ["occupancy", "demand", "footfall", "cases"],
};
