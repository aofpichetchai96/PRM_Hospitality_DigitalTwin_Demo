// Derived values (PLAN 7: every KPI is derived from the one store, never
// computed twice). Plain functions of state so they work in components
// (with narrow selectors), in useFrame via getState(), and in tests.
import type { AskContext } from "@/data/aiScript";
import { AHU_READINGS, ASSETS, CHILLER_COP, CONNECTED_FEEDS } from "@/data/assets";
import { computeEnergy, REFERENCE_FOOTFALL } from "@/data/energy";
import { KPI_HISTORY } from "@/data/kpis";
import { floorSpec, isHotelFloor, TOTAL_KEYS } from "@/data/property";
import { fmt, timeStr } from "@/lib/format";
import type { AssetMetric, Incident, Room, RoomStatus } from "@/types";
import type { AppState } from "./useAppStore";

export type RoomCounts = Record<RoomStatus, number>;

const countsCache = new WeakMap<readonly Room[], RoomCounts>();
export function roomCounts(rooms: readonly Room[]): RoomCounts {
  let c = countsCache.get(rooms);
  if (!c) {
    c = { occupied: 0, ready: 0, cleaning: 0, maintenance: 0 };
    for (const r of rooms) c[r.status]++;
    countsCache.set(rooms, c);
  }
  return c;
}

export const occupancyPct = (rooms: readonly Room[]) => (roomCounts(rooms).occupied / TOTAL_KEYS) * 100;

export type EnergyInputs = Pick<AppState, "rooms" | "setpoint" | "outdoor" | "tariff" | "footfall" | "operatingHours">;
export type KpiInputs = EnergyInputs & Pick<AppState, "incidents" | "workOrders">;

export function selectEnergy(s: EnergyInputs) {
  return computeEnergy({
    occupancy: roomCounts(s.rooms).occupied / TOTAL_KEYS,
    setpoint: s.setpoint,
    outdoor: s.outdoor,
    tariff: s.tariff,
    footfallFactor: s.footfall / REFERENCE_FOOTFALL,
    operatingHours: s.operatingHours,
  });
}

export const openIncidents = (incidents: readonly Incident[]) => incidents.filter((e) => e.status < 3);

export const floorRooms = (rooms: readonly Room[], floor: string) => rooms.filter((r) => r.floor === floor);

export type KpiValues = ReturnType<typeof selectKpis>;

/** The four KPI cards (prototype updateKpis L353 + spark L355) */
export function selectKpis(s: KpiInputs) {
  const c = roomCounts(s.rooms);
  const e = selectEnergy(s);
  const open = openIncidents(s.incidents);
  const occupancy = c.occupied / 6;
  return {
    occupancy: {
      value: occupancy,
      occupied: c.occupied,
      trend: [...KPI_HISTORY.occupancy, occupancy],
    },
    demand: {
      value: e.current,
      savingPct: e.savingPct,
      trend: [...KPI_HISTORY.demand, e.current],
    },
    footfall: { value: s.footfall, trend: [...KPI_HISTORY.footfall, s.footfall] },
    incidents: {
      value: open.length,
      high: open.filter((x) => x.priority === "high").length,
      workOrders: s.workOrders.length,
      trend: [...KPI_HISTORY.incidents, open.length],
    },
  };
}

/** Label of what is selected in 3D */
export function selectionLabel(s: AppState) {
  if (s.floor !== "all") return s.floor;
  return s.zone === "all" ? "อาคารทั้งหมด" : s.zone;
}

/** Asset card for the current selection (prototype assetHtml L363) */
export type AssetCardInputs = EnergyInputs & Pick<AppState, "asset" | "floor" | "incidents">;

export function selectAssetCard(s: AssetCardInputs): { name: string; code: string; metrics: AssetMetric[] } {
  const e = selectEnergy(s);
  const floor = s.floor !== "all" && isHotelFloor(s.floor) ? s.floor : null;
  if (floor || s.asset === "hotel") {
    const scope = floor ? floorRooms(s.rooms, floor) : s.rooms;
    const c = roomCounts(scope);
    const capacity = floor ? floorSpec(floor).rooms : TOTAL_KEYS;
    // Cooling per floor: hotel load shared by the guest floors' keys
    const cooling = floor ? (e.hotel * capacity) / TOTAL_KEYS : e.hotel;
    return {
      name: floor ? `${floor} · Hotel floor` : ASSETS.hotel.name,
      code: floor ? `PRM-${floor}-SPACE` : ASSETS.hotel.code,
      metrics: [
        { label: "Occupied", value: c.occupied, unit: `/ ${capacity}` },
        { label: floor ? "Floor cooling" : "Hotel cooling", value: fmt(cooling), unit: "kW" },
        { label: "Housekeeping", value: c.cleaning, unit: "pending" },
        { label: "Out of service", value: c.maintenance, unit: "rooms", status: c.maintenance ? "warn" : "ok" },
      ],
    };
  }
  if (s.asset === "plant")
    return {
      name: ASSETS.plant.name,
      code: ASSETS.plant.code,
      metrics: [
        { label: "Cooling load", value: fmt(e.mall + e.hotel), unit: "kW" },
        { label: "Chiller COP", value: CHILLER_COP.toFixed(1), unit: "demo" },
        { label: "Asset health", value: ASSETS.plant.health, unit: "/ 100", status: "warn" },
        {
          label: "Open advisory",
          value: openIncidents(s.incidents).filter((x) => x.type === "plant").length,
        },
      ],
    };
  if (s.asset === "ahu")
    return {
      name: ASSETS.ahu.name,
      code: ASSETS.ahu.code,
      metrics: [
        { label: "Supply air", value: AHU_READINGS.supplyAir, unit: "°C", status: "warn" },
        { label: "Target band", value: AHU_READINGS.targetBand, unit: "°C" },
        { label: "Filter ΔP", value: AHU_READINGS.filterDp, unit: "Pa" },
        { label: "Asset health", value: ASSETS.ahu.health, unit: "/ 100" },
      ],
    };
  const asset = ASSETS[s.asset];
  return {
    name: asset.name,
    code: asset.code,
    metrics: [
      { label: "Connected feeds", value: CONNECTED_FEEDS, unit: "demo" },
      { label: "Hotel inventory", value: TOTAL_KEYS, unit: "keys" },
      { label: "Asset health", value: asset.health, unit: "/ 100" },
      { label: "Open incidents", value: openIncidents(s.incidents).length },
    ],
  };
}

export function buildAskContext(s: AppState): AskContext {
  const card = selectAssetCard(s);
  return {
    time: timeStr(s.time),
    energy: selectEnergy(s),
    counts: roomCounts(s.rooms),
    footfall: s.footfall,
    openIncidents: openIncidents(s.incidents),
    workOrders: s.workOrders,
    scenario: { outdoor: s.outdoor, setpoint: s.setpoint, tariff: s.tariff, operatingHours: s.operatingHours },
    selection: { label: selectionLabel(s), assetName: card.name, assetCode: card.code, metrics: card.metrics },
    plan: { open: s.spatial === "plan", type: s.plan.type, selectedZone: s.plan.zone },
  };
}
