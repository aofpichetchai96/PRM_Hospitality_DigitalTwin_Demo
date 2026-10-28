import { describe, expect, it } from "vitest";
import { aqiBand, co2Band, indoorAir, last24h, outdoorAir, pm25ToAqi } from "./airQuality";

describe("air quality model", () => {
  it("converts PM2.5 to AQI on the EPA breakpoints", () => {
    expect(pm25ToAqi(0)).toBe(0);
    expect(pm25ToAqi(9)).toBe(50);
    expect(pm25ToAqi(35.4)).toBe(100);
    expect(pm25ToAqi(55.4)).toBe(150);
    expect(aqiBand(50).id).toBe("good");
    expect(aqiBand(51).id).toBe("moderate");
    expect(aqiBand(120).id).toBe("sensitive");
    expect(aqiBand(180).id).toBe("unhealthy");
    expect(co2Band(750).id).toBe("good");
    expect(co2Band(950).id).toBe("moderate");
  });

  it("is fixed at t0: outdoor moderate, indoor good behind the filters", () => {
    const out = outdoorAir(14.5);
    const inside = indoorAir(14.5, 0.84);
    expect(out).toEqual({ aqi: 92, pm25: 30.9, co2: 420 });
    expect(inside).toEqual({ aqi: 44, pm25: 8, co2: 746 });
    expect(aqiBand(out.aqi).id).toBe("moderate");
    expect(aqiBand(inside.aqi).id).toBe("good");
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
