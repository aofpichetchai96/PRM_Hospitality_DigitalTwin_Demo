// Derived values (PLAN 7: every KPI is derived from the one store, never
// computed twice). Plain functions of state so they work in components
// (with narrow selectors), in useFrame via getState(), and in tests.
import type { AskContext } from "@/data/aiScript";
import { indoorAir, last24h, outdoorAir } from "@/data/airQuality";
import { AHU_READINGS, ASSETS, CHILLER_COP, CONNECTED_FEEDS, isRoofEquipment, roofEquipment } from "@/data/assets";
import { SEVERITY } from "@/data/events";
import { computeEnergy, REFERENCE_FOOTFALL } from "@/data/energy";
import { KPI_HISTORY } from "@/data/kpis";
import { floorSpec, isHotelFloor, TOTAL_KEYS } from "@/data/property";
import { entranceCounts, zoneReadings } from "@/data/publicZones";
import { roomPowers, roomStay } from "@/data/rooms";
import { VIEWS } from "@/data/views";
import { fmt, timeStr } from "@/lib/format";
import type { AssetMetric, Incident, Room, RoomStatus } from "@/types";
import type { AppState } from "./useAppStore";

export type RoomCounts = Record<RoomStatus, number>;

const countsCache = new WeakMap<readonly Room[], RoomCounts>();
export function roomCounts(rooms: readonly Room[]): RoomCounts {
  let c = countsCache.get(rooms);
  if (!c) {
    c = { occupied: 0, reserved: 0, available: 0 };
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

/** kW of every room; the 600 add up to the energy model's hotel load */
export const selectRoomPowers = (s: EnergyInputs) => roomPowers(s.rooms, selectEnergy(s).hotel);

/** Total load of the rooms on one floor (kW) — the same numbers the room cards show */
export function floorPower(s: EnergyInputs, floor: string) {
  const kw = selectRoomPowers(s);
  return s.rooms.reduce((sum, r) => (r.floor === floor ? sum + (kw.get(r.id) ?? 0) : sum), 0);
}

const guestsCache = new WeakMap<readonly Room[], { inHouse: number; arrivals: number; checkedInToday: number }>();
/** Guests in house, rooms still to arrive today and rooms that checked in today */
export function selectGuests(rooms: readonly Room[]) {
  let g = guestsCache.get(rooms);
  if (!g) {
    g = { inHouse: 0, arrivals: 0, checkedInToday: 0 };
    for (const r of rooms) {
      const stay = roomStay(r);
      if (!stay) continue;
      if (stay.expected) g.arrivals++;
      else {
        g.inHouse += stay.guests;
        if (stay.checkIn.day === 0) g.checkedInToday++;
      }
    }
    guestsCache.set(rooms, g);
  }
  return g;
}

/** Case management: Open = new, not yet acknowledged · Pending = acknowledged or in progress · Resolved today */
export function selectCases(incidents: readonly Incident[]) {
  const open = incidents.filter((e) => e.status === 0).length;
  const pending = incidents.filter((e) => e.status === 1 || e.status === 2).length;
  return { open, pending, active: open + pending, resolved: incidents.filter((e) => e.status === 3).length };
}

/** An open high-priority AHU alarm stands for a filter fault, so indoor PM2.5 rises */
export const ahuOk = (incidents: readonly Incident[]) =>
  !openIncidents(incidents).some((e) => e.type === "ahu" && e.priority === "high");

export type AirInputs = Pick<AppState, "time" | "rooms" | "incidents">;

/** An open crowd alarm on the Lobby floor packs the lounge */
export const crowdOnLobby = (incidents: readonly Incident[]) =>
  openIncidents(incidents).some((e) => e.type === "people" && e.floor === "G");

/** Public Area: entrance counts, people and air per zone, the busiest zone and the average zone AQI */
export function selectPublic(s: AirInputs) {
  const zones = zoneReadings(
    s.time,
    roomCounts(s.rooms).occupied / TOTAL_KEYS,
    crowdOnLobby(s.incidents),
    ahuOk(s.incidents),
  );
  const busiest = zones.reduce((a, b) => (b.load > a.load ? b : a));
  const people = zones.reduce((n, z) => n + z.people, 0);
  const avgAqi = Math.round(zones.reduce((n, z) => n + z.air.aqi * z.people, 0) / Math.max(1, people));
  return { zones, busiest, people, avgAqi, entrance: entranceCounts(s.time, people) };
}

/** Indoor vs. outdoor air now, with the AQI of the last 24 h for the sparklines */
export function selectAir(s: AirInputs) {
  const occupancy = roomCounts(s.rooms).occupied / TOTAL_KEYS;
  const ok = ahuOk(s.incidents);
  return {
    outdoor: outdoorAir(s.time),
    indoor: indoorAir(s.time, occupancy, ok),
    ahuOk: ok,
    trend: {
      outdoor: last24h(s.time, (t) => outdoorAir(t).aqi),
      indoor: last24h(s.time, (t) => indoorAir(t, occupancy, ok).aqi),
    },
  };
}

export const floorRooms = (rooms: readonly Room[], floor: string) => rooms.filter((r) => r.floor === floor);

export type KpiValues = ReturnType<typeof selectKpis>;

/** The four KPI cards (prototype updateKpis L353 + spark L355) */
export function selectKpis(s: KpiInputs) {
  const c = roomCounts(s.rooms);
  const e = selectEnergy(s);
  const open = openIncidents(s.incidents);
  const cases = selectCases(s.incidents);
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
      ...cases,
      value: open.length,
      high: open.filter((x) => x.priority === "high").length,
      workOrders: s.workOrders.length,
      trend: [...KPI_HISTORY.incidents, open.length],
    },
  };
}

/** What is selected in 3D, in words: picked floor › sliced floor › asset › whole building */
export function selectionLabel(s: Pick<AppState, "selectedFloor" | "floor" | "asset">) {
  if (s.selectedFloor) return `ชั้น ${s.selectedFloor}`;
  if (s.floor !== "all") return `ชั้น ${s.floor}`;
  return s.asset === "site" ? "อาคารทั้งหมด" : ASSETS[s.asset].name;
}

/** Context line of the assistant: scene › selection · clock (always the current state) */
export function askContextLabel(s: Pick<AppState, "view" | "selectedFloor" | "floor" | "asset" | "time">) {
  return `${VIEWS[s.view].title} › ${selectionLabel(s)} · ${timeStr(s.time)}`;
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
    // Sum of the floor's rooms, so the card, the floor summary and the room cards agree
    const cooling = floor ? floorPower(s, floor) : e.hotel;
    return {
      name: floor ? `${floor} · Hotel floor` : ASSETS.hotel.name,
      code: floor ? `PRM-${floor}-SPACE` : ASSETS.hotel.code,
      metrics: [
        { label: "Occupied", value: c.occupied, unit: `/ ${capacity}` },
        { label: floor ? "Floor room load" : "Hotel room load", value: fmt(cooling, floor ? 1 : 0), unit: "kW" },
        { label: "Reserved", value: c.reserved, unit: "arriving" },
        { label: "Available", value: c.available, unit: "rooms" },
      ],
    };
  }
  if (isRoofEquipment(s.asset)) {
    const unit = roofEquipment(s.asset);
    const alarms = openIncidents(s.incidents).filter((x) => x.device === s.asset);
    // An open alarm replaces the normal reading it is about
    const metrics = unit.readings.map((m): AssetMetric => {
      const alarm = alarms.find((x) => x.reading?.metric === m.label);
      return alarm?.reading ? { label: m.label, value: alarm.reading.value, status: "alert" } : m;
    });
    const worst = alarms.find((x) => x.priority === "high") ?? alarms[0];
    return {
      name: unit.name,
      code: unit.code,
      metrics: [
        ...metrics,
        {
          label: "Active alarm",
          value: worst ? SEVERITY[worst.priority].label : "None",
          status: worst ? "alert" : "ok",
        },
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
  const card = selectAssetCard({ ...s, floor: s.selectedFloor ?? s.floor });
  const air = selectAir(s);
  const lobby = selectPublic(s);
  return {
    view: s.view,
    time: timeStr(s.time),
    energy: selectEnergy(s),
    energyAt25: selectEnergy({ ...s, setpoint: 25 }),
    counts: roomCounts(s.rooms),
    guests: selectGuests(s.rooms),
    footfall: s.footfall,
    openIncidents: openIncidents(s.incidents),
    cases: selectCases(s.incidents),
    workOrders: s.workOrders,
    air: { indoor: air.indoor, outdoor: air.outdoor },
    lobby: {
      people: lobby.people,
      entrance: lobby.entrance,
      zones: lobby.zones,
      busiest: lobby.busiest,
      avgAqi: lobby.avgAqi,
    },
    scenario: { outdoor: s.outdoor, setpoint: s.setpoint, tariff: s.tariff, operatingHours: s.operatingHours },
    selection: { label: selectionLabel(s), assetName: card.name, assetCode: card.code, metrics: card.metrics },
    plan: { open: s.spatial === "plan", type: s.plan.type, selectedZone: s.plan.zone },
  };
}
