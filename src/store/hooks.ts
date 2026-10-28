"use client";

// Narrow subscriptions for derived values: components re-render only when an
// input changes, never on unrelated state (PLAN R5).
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  roomCounts,
  selectAir,
  selectEnergy,
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
  const input = useAppStore(useShallow((s) => ({ time: s.time, rooms: s.rooms, incidents: s.incidents })));
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
  const input = useAppStore(useShallow((s) => ({ time: s.time, rooms: s.rooms, incidents: s.incidents })));
  return useMemo(() => selectPublic(input), [input]);
}

export function useRoomCounts() {
  return roomCounts(useAppStore((s) => s.rooms));
}

export function useOpenIncidents() {
  const incidents = useAppStore((s) => s.incidents);
  return useMemo(() => incidents.filter((e) => e.status < 3), [incidents]);
}
