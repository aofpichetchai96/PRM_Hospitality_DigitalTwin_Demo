"use client";

// Narrow subscriptions for derived values: components re-render only when an
// input changes, never on unrelated state (PLAN R5).
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { roomCounts, selectEnergy, selectKpis } from "./selectors";
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

export function useRoomCounts() {
  return roomCounts(useAppStore((s) => s.rooms));
}

export function useOpenIncidents() {
  const incidents = useAppStore((s) => s.incidents);
  return useMemo(() => incidents.filter((e) => e.status < 3), [incidents]);
}
