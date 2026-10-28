import { describe, expect, it } from "vitest";
import { aqiBand, co2Band, indoorAir, last24h, outdoorAir, pm25ToAqi } from "./airQuality";
import { DEMAND_BASELINE_30D, DEMAND_PROFILE_SHAPE } from "./energy";

describe("air quality model", () => {
  it("converts PM2.5 to the Thai AQI and its five bands", () => {
    expect(pm25ToAqi(0)).toBe(0);
    // Thai AQI bands (Pollution Control Department): 0–25 · 26–50 · 51–100 · 101–200 · 201+
    expect([0, 25, 26, 50, 51, 100, 101, 200, 201, 250].map((v) => aqiBand(v).id)).toEqual([
      "excellent",
      "excellent",
      "satisfactory",
      "satisfactory",
      "moderate",
      "moderate",
      "unhealthy",
      "unhealthy",
      "veryUnhealthy",
      "veryUnhealthy",
    ]);
    // PM2.5 breakpoints: 15 → 25, 25 → 50, 37.5 → 100, 75 → 200
    expect([15, 25, 37.5, 75].map(pm25ToAqi)).toEqual([25, 50, 100, 200]);
    expect(co2Band(750).id).toBe("good");
    expect(co2Band(950).id).toBe("elevated");
  });

  it("is fixed at t0: outdoor moderate, indoor excellent behind the filters", () => {
    const out = outdoorAir(14.5);
    const inside = indoorAir(14.5, 0.84);
    expect(out).toEqual({ aqi: 74, pm25: 30.9, co2: 420 });
    expect(inside).toEqual({ aqi: 13, pm25: 8, co2: 746 });
    expect(aqiBand(out.aqi).id).toBe("moderate");
    expect(aqiBand(inside.aqi).id).toBe("excellent");
  });

  it("lets more PM2.5 in with an AHU filter fault and more CO₂ with more guests", () => {
    expect(indoorAir(14.5, 0.84, false).pm25).toBeGreaterThan(indoorAir(14.5, 0.84).pm25);
    expect(indoorAir(14.5, 1).co2).toBeGreaterThan(indoorAir(14.5, 0.5).co2);
  });

  it("peaks outdoors in the morning rush", () => {
    expect(outdoorAir(8).pm25).toBeGreaterThan(outdoorAir(14.5).pm25);
    expect(outdoorAir(8).pm25).toBeGreaterThan(outdoorAir(3).pm25);
  });

  it("gives 24 h of hourly values ending at now", () => {
    const series = last24h(14.5, (t) => outdoorAir(t).aqi);
    expect(series).toHaveLength(25);
    expect(series.at(-1)).toBe(outdoorAir(14.5).aqi);
    expect(series[0]).toBe(series.at(-1));
  });
});

describe("energy baseline", () => {
  it("covers 06:00–23:00 like today's profile and sits a little under today's demand at t0", () => {
    expect(DEMAND_BASELINE_30D).toHaveLength(DEMAND_PROFILE_SHAPE.length);
    // 14:30 is between 14:00 (index 8) and 15:00 (index 9); t0 demand is 2,616 kW
    const at = (DEMAND_BASELINE_30D[8] + DEMAND_BASELINE_30D[9]) / 2;
    expect(2616 / at - 1).toBeGreaterThan(0.01);
    expect(2616 / at - 1).toBeLessThan(0.06);
  });
});
