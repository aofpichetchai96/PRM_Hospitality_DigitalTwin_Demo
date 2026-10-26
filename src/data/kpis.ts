// KPI sparkline history (prototype spark L355). The live value is appended
// as the last point by the kpis selector.
export const KPI_HISTORY = {
  occupancy: [68, 74, 72, 81, 77, 84, 82],
  demand: [1400, 1700, 1580, 2050, 2300, 2160, 2500],
  footfall: [1200, 4300, 6200, 12800, 14800, 18900, 23700],
  incidents: [6, 4, 5, 3, 2, 4, 3],
} as const;

/** Daily hotel occupancy for the overview trend (last value is today) */
export const OCCUPANCY_WEEK: readonly number[] = [78, 81, 83, 80, 86, 88];
