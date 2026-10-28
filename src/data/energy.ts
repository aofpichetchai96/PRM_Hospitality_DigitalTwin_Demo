// Illustrative energy model — prototype energy() (L349), unchanged except
// footfallFactor now follows footfall (PLAN 7). Linear and for demo only.
import type { EnergyInput, EnergyResult } from "@/types";

export const OTHER_LOADS_KW = 1140;
export const HOTEL_COOLING_KW = 900;
export const MALL_COOLING_KW = 720;
export const REFERENCE_SETPOINT = 24;
const WEATHER_PER_DEGREE = 0.025;
const SAVING_PER_DEGREE = 0.045;
const REFERENCE_OUTDOOR = 32;

/** Mall footfall at t0 (14:30); also the reference for mall cooling */
export const REFERENCE_FOOTFALL = 27840;

export const SCENARIO_LIMITS = {
  setpoint: { min: 22, max: 26, step: 0.5 },
  outdoor: { min: 27, max: 38, step: 1 },
  occupancy: { min: 30, max: 100, step: 1 },
  tariff: { min: 0.1, max: 30, step: 0.1 },
} as const;

export function computeEnergy(i: EnergyInput): EnergyResult {
  const weather = 1 + (i.outdoor - REFERENCE_OUTDOOR) * WEATHER_PER_DEGREE;
  const hotelBase = HOTEL_COOLING_KW * i.occupancy * weather;
  const mallBase = MALL_COOLING_KW * i.footfallFactor * weather;
  const factor = 1 - (i.setpoint - REFERENCE_SETPOINT) * SAVING_PER_DEGREE;
  const base = OTHER_LOADS_KW + hotelBase + mallBase;
  const current = OTHER_LOADS_KW + (hotelBase + mallBase) * factor;
  const saved = base - current;
  return {
    base,
    current,
    saved,
    hotel: hotelBase * factor,
    mall: mallBase * factor,
    other: OTHER_LOADS_KW,
    savingPct: (saved / base) * 100,
    dayKwh: saved * i.operatingHours,
    dayCost: saved * i.operatingHours * i.tariff,
  };
}

/** Guest comfort risk of a cooling setpoint (demo rule of thumb, not a comfort model) */
export function comfortRisk(setpoint: number): "low" | "medium" | "high" {
  if (setpoint <= 25) return "low";
  return setpoint < 26 ? "medium" : "high";
}

/** Mall entry counts so far today at a decimal hour (prototype timeline, L451) */
export function footfallAt(time: number) {
  return Math.max(1200, Math.round(REFERENCE_FOOTFALL * Math.pow(Math.max(0, time - 5) / 9.5, 1.22)));
}

/** Footfall split by zone at t0 — sums to REFERENCE_FOOTFALL */
export const FOOTFALL_BY_ZONE: readonly [string, number][] = [
  ["Retail L1", 9820],
  ["F&B L2", 6140],
  ["Arrival G", 5310],
  ["Event hall L3", 3920],
  ["Skywalk", 2650],
];

/** Hourly demand shape 06:00 … 23:00 for charts; 1.0 = current demand (14:30 sits between 14:00 and 15:00) */
export const DEMAND_PROFILE_SHAPE: readonly number[] = [
  0.58, 0.65, 0.73, 0.82, 0.88, 0.91, 0.94, 0.96, 1.0, 1.0, 1.02, 1.03, 1.01, 0.98, 0.93, 0.86, 0.76, 0.67,
];

/**
 * Energy baseline: the average hourly demand of the last 30 days, 06:00 … 23:00 (kW). Assumed for the demo — a real
 * system would take it from the metering history. Fixed, so the what-if setpoint moves today's line, not this one.
 * About 2,540 kW at 14:30, so today (2,616 kW at t0) runs ~3 % above it.
 */
export const DEMAND_BASELINE_30D: readonly number[] = [
  1510, 1690, 1880, 2100, 2250, 2330, 2400, 2450, 2530, 2550, 2580, 2600, 2570, 2500, 2380, 2210, 1980, 1760,
];
