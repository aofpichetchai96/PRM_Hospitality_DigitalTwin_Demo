// Carbon footprint (Scope 1 + 2) of the building, derived from the energy
// model so it moves with the same setpoint / occupancy what-ifs: electricity
// through the Thai grid emission factor, plus the kitchens' LPG and the hot
// water boilers. Each source has a target; the gap to it sets its warning
// level (Standard ≤ 0 % · Excessive 0–5 % · Seriously excessive > 5 %).
// Simulated figures and assumed factors — not a GHG inventory.
import { DEMAND_PROFILE_SHAPE } from "./energy";

/** Thai grid emission factor (kgCO₂e / kWh), TGO published value — assumed for the demo */
export const GRID_EF = 0.4999;
/** Night hours (00:00–06:00) run at about half the daytime demand */
const NIGHT_HOURS_EQ = 6 * 0.5;

export type CarbonPeriod = "day" | "month" | "quarter" | "year";
export const PERIOD_DAYS: Record<CarbonPeriod, number> = { day: 1, month: 30, quarter: 91, year: 365 };
export const PERIOD_LABEL: Record<CarbonPeriod, string> = {
  day: "Day",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export type CarbonLevel = "standard" | "excessive" | "serious";
export const CARBON_LEVEL: Record<CarbonLevel, { label: string; th: string; color: string }> = {
  standard: { label: "Standard (≤ 0%)", th: "ตามเป้า", color: "var(--blue)" },
  excessive: { label: "Excessive (0–5%)", th: "เกินเป้า", color: "var(--gold)" },
  serious: { label: "Seriously excessive (> 5%)", th: "เกินเป้ามาก", color: "var(--red)" },
};
export const carbonLevel = (gapPct: number): CarbonLevel =>
  gapPct <= 0 ? "standard" : gapPct <= 5 ? "excessive" : "serious";

export type CarbonSourceId =
  "chilledWater" | "airHandling" | "lighting" | "lifts" | "tenants" | "otherPower" | "kitchenLpg" | "hotWater";

interface SourceSpec {
  id: CarbonSourceId;
  name: string;
  scope: 1 | 2;
  /** Share of the building's electricity (scope 2), or tCO₂e per day (scope 1 fuels) */
  share?: number;
  perDay?: number;
  /** Cooling sources follow the cooling what-if; the rest are fixed */
  cooling?: boolean;
  /** Gap to target at t0 (%): the target is set from it, so a better setpoint narrows the gap */
  gapT0: number;
}

const SOURCES: readonly SourceSpec[] = [
  // CH-01 runs below its COP (Back of House alarm): chilled water is the source over target
  { id: "chilledWater", name: "Chilled water", scope: 2, share: 0.42, cooling: true, gapT0: 6.2 },
  { id: "airHandling", name: "Air handling", scope: 2, share: 0.14, cooling: true, gapT0: 2.1 },
  { id: "lighting", name: "Lighting", scope: 2, share: 0.11, gapT0: -3.0 },
  { id: "lifts", name: "Lifts & escalators", scope: 2, share: 0.06, gapT0: -1.2 },
  { id: "tenants", name: "Retail tenants", scope: 2, share: 0.15, gapT0: 0.8 },
  { id: "otherPower", name: "Others", scope: 2, share: 0.12, gapT0: -2.0 },
  { id: "kitchenLpg", name: "Kitchen LPG", scope: 1, perDay: 1.9, gapT0: 3.4 },
  { id: "hotWater", name: "Hot water boilers", scope: 1, perDay: 2.6, gapT0: -4.1 },
];

/** Demand at t0 (kW): the scale the targets were set at */
const DEMAND_T0 = 2616;

/** Electricity of a day at this demand (kWh): the 06:00–23:00 profile plus a half-load night */
export const dayKwh = (demandKw: number) =>
  demandKw * (DEMAND_PROFILE_SHAPE.reduce((a, b) => a + b, 0) + NIGHT_HOURS_EQ);

export interface CarbonSource {
  id: CarbonSourceId;
  name: string;
  scope: 1 | 2;
  /** tCO₂e over the period */
  t: number;
  /** Share of the period's total (%) */
  pct: number;
  /** Gap to target (%) */
  gap: number;
  level: CarbonLevel;
}

/**
 * The building's footprint over a period. `demandKw` / `coolingFactor` come from the energy model (current demand and
 * how much the cooling load is scaled by the setpoint what-if, 1 at t0).
 */
export function carbonFootprint(demandKw: number, coolingFactor: number, period: CarbonPeriod) {
  const days = PERIOD_DAYS[period];
  const elecT = (dayKwh(demandKw) * GRID_EF) / 1000;
  const elecT0 = (dayKwh(DEMAND_T0) * GRID_EF) / 1000;
  const raw = SOURCES.map((s) => {
    const perDay = s.scope === 2 ? elecT * s.share! : s.perDay!;
    const perDayT0 = s.scope === 2 ? elecT0 * s.share! : s.perDay!;
    // At t0 the cooling sources sit gapT0 over target; the setpoint what-if scales them by coolingFactor
    const actual = s.cooling ? perDayT0 * coolingFactor : perDay;
    const target = perDayT0 / (1 + s.gapT0 / 100);
    const gap = (actual / target - 1) * 100;
    return { id: s.id, name: s.name, scope: s.scope, t: actual * days, gap };
  });
  const total = raw.reduce((n, s) => n + s.t, 0);
  const sources: CarbonSource[] = raw.map((s) => ({ ...s, pct: (s.t / total) * 100, level: carbonLevel(s.gap) }));
  const scope2 = sources.filter((s) => s.scope === 2).reduce((n, s) => n + s.t, 0);
  return { period, total, scope1: total - scope2, scope2, sources, kwhPerDay: dayKwh(demandKw) };
}
export type CarbonFootprint = ReturnType<typeof carbonFootprint>;

/** Carbon load of each hour today, 06:00 … 23:00 (tCO₂e / h), from the demand profile */
export const hourlyCarbon = (demandKw: number) => DEMAND_PROFILE_SHAPE.map((f) => (f * demandKw * GRID_EF) / 1000);

/** Gross floor area (m²), assumed — for carbon intensity per m² */
export const GFA_M2 = 98_000;

/** Intensity targets (assumed): per occupied room-night, per m² a year, per mall visit, per event guest */
export const INTENSITY_TARGET = { roomNight: 30, m2Year: 110, visit: 0.5, eventGuest: 1.6 } as const;
