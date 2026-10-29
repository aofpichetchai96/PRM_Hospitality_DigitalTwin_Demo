// Simulated air quality. Outdoor PM2.5 follows the time of day (traffic peaks
// in the morning and evening); indoor air is the outdoor air through the AHU
// filters plus CO₂ from the people inside. Pure functions of the clock, so the
// 24 h sparklines are computed rather than stored and t0 is always the same.
// Demo model only: no sensor is read.
import type { Season } from "@/types";

export interface AirReading {
  /** Thai AQI (Pollution Control Department) from PM2.5 */
  aqi: number;
  /** µg/m³ */
  pm25: number;
  /** ppm */
  co2: number;
}

export type AirBandId = "excellent" | "satisfactory" | "moderate" | "unhealthy" | "veryUnhealthy";
export interface AirBand {
  id: AirBandId;
  label: string;
  th: string;
  color: string;
  /** Face icon under public/icon_AQI (the Thai AQI pictograms) */
  icon: `/${string}`;
}

/** Thai AQI bands (กรมควบคุมมลพิษ): colours and faces as on air4thai */
export const AIR_BANDS: Record<AirBandId, AirBand> = {
  excellent: { id: "excellent", label: "Excellent", th: "ดีมาก", color: "#3bccff", icon: "/icon_AQI/excellent.png" },
  satisfactory: {
    id: "satisfactory",
    label: "Satisfactory",
    th: "ดี",
    color: "#92d050",
    icon: "/icon_AQI/satisfactory.png",
  },
  moderate: { id: "moderate", label: "Moderate", th: "ปานกลาง", color: "#ffdc3c", icon: "/icon_AQI/moderate.png" },
  unhealthy: {
    id: "unhealthy",
    label: "Unhealthy",
    th: "เริ่มมีผลกระทบต่อสุขภาพ",
    color: "#ff9f30",
    icon: "/icon_AQI/unhealthy.png",
  },
  veryUnhealthy: {
    id: "veryUnhealthy",
    label: "Very unhealthy",
    th: "มีผลกระทบต่อสุขภาพ",
    color: "#ff5050",
    icon: "/icon_AQI/very_unhealthy.png",
  },
};

/** PM2.5 (µg/m³) → Thai AQI breakpoints (Pollution Control Department, 2023): 0–25 · 26–50 · 51–100 · 101–200 · 201+ */
const PM25_BREAKPOINTS: readonly [number, number, number, number][] = [
  [0, 15, 0, 25],
  [15.1, 25, 26, 50],
  [25.1, 37.5, 51, 100],
  [37.6, 75, 101, 200],
  [75.1, 150, 201, 300],
];

export function pm25ToAqi(pm25: number): number {
  const c = Math.max(0, Math.floor(pm25 * 10) / 10);
  const row = PM25_BREAKPOINTS.find(([lo, hi]) => c >= lo && c <= hi) ?? PM25_BREAKPOINTS.at(-1)!;
  const [lo, hi, aqiLo, aqiHi] = row;
  return Math.round(Math.min(aqiHi, aqiLo + ((aqiHi - aqiLo) * (c - lo)) / (hi - lo)));
}

export function aqiBand(aqi: number): AirBand {
  if (aqi <= 25) return AIR_BANDS.excellent;
  if (aqi <= 50) return AIR_BANDS.satisfactory;
  if (aqi <= 100) return AIR_BANDS.moderate;
  if (aqi <= 200) return AIR_BANDS.unhealthy;
  return AIR_BANDS.veryUnhealthy;
}

export type Co2BandId = "good" | "elevated" | "high";
/** Indoor CO₂ levels (ventilation rule of thumb, not a health limit) */
export const CO2_BANDS: Record<Co2BandId, { id: Co2BandId; label: string; color: string }> = {
  good: { id: "good", label: "Fresh", color: "var(--green)" },
  elevated: { id: "elevated", label: "Elevated", color: "var(--gold)" },
  high: { id: "high", label: "Stuffy", color: "var(--orange)" },
};
export function co2Band(ppm: number) {
  if (ppm <= 800) return CO2_BANDS.good;
  if (ppm <= 1000) return CO2_BANDS.elevated;
  return CO2_BANDS.high;
}

const peak = (time: number, at: number, width: number) => {
  // Distance on the 24 h clock, so the evening peak also lifts the small hours a little
  const d = Math.min(Math.abs(time - at), 24 - Math.abs(time - at));
  return Math.exp(-(d * d) / (2 * width * width));
};
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Outdoor PM2.5 by season: rain washes the dust out; the dry-season haze (burning, inversions) multiplies it */
export const SEASON_PM: Record<Season, number> = { summer: 1, rainy: 0.5, haze: 2.6 };

/** Outdoor air at a decimal hour, in a season (the hot season is the reference) */
export function outdoorAir(time: number, season: Season = "summer"): AirReading {
  const pm25 = round1(
    (24 + 15 * peak(time, 8, 1.6) + 12 * peak(time, 18.5, 1.8) + 6 * peak(time, 14, 3)) * SEASON_PM[season],
  );
  const co2 = Math.round(418 + 22 * peak(time, 8, 1.6) + 18 * peak(time, 18.5, 1.8));
  return { aqi: pm25ToAqi(pm25), pm25, co2 };
}

/** Share of outdoor PM2.5 that gets past the AHU filters (demo assumption) */
export const FILTER_PASS = { ok: 0.22, fault: 0.5 } as const;
const INDOOR_PM_BASE = 1.2;
/** Indoor CO₂ at the outdoor level plus this much per unit of occupancy × activity */
const CO2_PER_LOAD = 360;

/** How busy the building is at a decimal hour (0–1): low overnight, highest mid-afternoon */
export function activityAt(time: number) {
  return 0.35 + 0.6 * peak(time, 15, 4);
}

/**
 * Indoor air of the whole building: filtered outdoor PM2.5 and CO₂ that rises
 * with occupancy (0–1) and the time of day. `ahuOk` false = an AHU filter fault.
 */
export function indoorAir(time: number, occupancy: number, ahuOk = true, season: Season = "summer"): AirReading {
  const out = outdoorAir(time, season);
  const pm25 = round1(out.pm25 * (ahuOk ? FILTER_PASS.ok : FILTER_PASS.fault) + INDOOR_PM_BASE);
  const co2 = Math.round(out.co2 + 40 + CO2_PER_LOAD * occupancy * activityAt(time));
  return { aqi: pm25ToAqi(pm25), pm25, co2 };
}

/** One value per hour for the 24 h up to `time` (oldest first, last = now) */
export function last24h(time: number, read: (t: number) => number): number[] {
  return Array.from({ length: 25 }, (_, i) => read((time - 24 + i + 24) % 24));
}
