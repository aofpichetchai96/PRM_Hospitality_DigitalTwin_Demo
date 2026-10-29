"use client";

// Narrow subscriptions for derived values: components re-render only when an
// input changes, never on unrelated state (PLAN R5).
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { CarbonPeriod } from "@/data/carbon";
import { serverRoomAt } from "@/data/serverRoom";
import {
  roomCounts,
  type CarbonReading,
  selectAir,
  selectCarbon,
  selectEnergy,
  selectEventHall,
  selectGuests,
  selectKpis,
  selectPublic,
  selectRoomPowers,
} from "./selectors";
import { useAppStore } from "./useAppStore";

export function useKpis() {
  const input = useAppStore(
    useShallow((s) => ({
      rooms: s.rooms,
      setpoint: s.setpoint,
      outdoor: s.outdoor,
      tariff: s.tariff,
      footfall: s.footfall,
      operatingHours: s.operatingHours,
      incidents: s.incidents,
      workOrders: s.workOrders,
    })),
  );
  return useMemo(() => selectKpis(input), [input]);
}

export function useEnergy() {
  const input = useAppStore(
    useShallow((s) => ({
      rooms: s.rooms,
      setpoint: s.setpoint,
      outdoor: s.outdoor,
      tariff: s.tariff,
      footfall: s.footfall,
      operatingHours: s.operatingHours,
    })),
  );
  return useMemo(() => selectEnergy(input), [input]);
}

export function useAir() {
  const input = useAppStore(
    useShallow((s) => ({ time: s.time, rooms: s.rooms, incidents: s.incidents, season: s.season })),
  );
  return useMemo(() => selectAir(input), [input]);
}

/** kW of every room (Map by room id) */
export function useRoomPowers() {
  const input = useAppStore(
    useShallow((s) => ({
      rooms: s.rooms,
      setpoint: s.setpoint,
      outdoor: s.outdoor,
      tariff: s.tariff,
      footfall: s.footfall,
      operatingHours: s.operatingHours,
    })),
  );
  return useMemo(() => selectRoomPowers(input), [input]);
}

export function useGuests() {
  return selectGuests(useAppStore((s) => s.rooms));
}

export function usePublic() {
  const input = useAppStore(
    useShallow((s) => ({ time: s.time, rooms: s.rooms, incidents: s.incidents, season: s.season })),
  );
  return useMemo(() => selectPublic(input), [input]);
}

export function useEventHall() {
  const time = useAppStore((s) => s.time);
  return useMemo(() => selectEventHall({ time }), [time]);
}

/** Carbon footprint over `period` (CarbonPanel, AI scene bottom panel) */
export function useCarbon(period: CarbonPeriod): CarbonReading {
  const input = useAppStore(
    useShallow((s) => ({
      rooms: s.rooms,
      setpoint: s.setpoint,
      outdoor: s.outdoor,
      tariff: s.tariff,
      footfall: s.footfall,
      operatingHours: s.operatingHours,
      time: s.time,
    })),
  );
  return useMemo(() => selectCarbon(input, period), [input, period]);
}

/** The ICT server room now (racks, temperatures, power, ports) */
export function useServerRoom() {
  const time = useAppStore((s) => s.time);
  return useMemo(() => serverRoomAt(time), [time]);
}

export function useRoomCounts() {
  return roomCounts(useAppStore((s) => s.rooms));
}

export function useOpenIncidents() {
  const incidents = useAppStore((s) => s.incidents);
  return useMemo(() => incidents.filter((e) => e.status < 3), [incidents]);
}
