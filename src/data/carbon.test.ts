import { describe, expect, it } from "vitest";
import { carbonFootprint, carbonLevel, hourlyCarbon, PERIOD_DAYS } from "./carbon";

describe("carbon footprint", () => {
  it("is fixed at t0 and adds its sources up to the total", () => {
    const m = carbonFootprint(2616, 1, "month");
    expect(Math.round(m.total)).toBe(Math.round(carbonFootprint(2616, 1, "day").total * 30));
    expect(m.sources.reduce((n, s) => n + s.t, 0)).toBeCloseTo(m.total);
    expect(m.sources.reduce((n, s) => n + s.pct, 0)).toBeCloseTo(100);
    expect(m.scope1 + m.scope2).toBeCloseTo(m.total);
    // Chilled water (CH-01 below its COP) is the one seriously over target at t0
    const chw = m.sources.find((s) => s.id === "chilledWater")!;
    expect(chw.level).toBe("serious");
    expect(chw.gap).toBeCloseTo(6.2, 1);
  });

  it("brings chilled water back towards target when the cooling load drops (setpoint what-if)", () => {
    const chw = (f: number) => carbonFootprint(2550, f, "day").sources.find((s) => s.id === "chilledWater")!;
    expect(chw(0.95).gap).toBeLessThan(chw(1).gap);
    expect(chw(0.9).level).not.toBe("serious");
  });

  it("scales by period and bands the gap to target", () => {
    const d = carbonFootprint(2616, 1, "day").total;
    expect(carbonFootprint(2616, 1, "year").total).toBeCloseTo(d * PERIOD_DAYS.year);
    expect([-1, 0, 0.1, 5, 5.1].map(carbonLevel)).toEqual([
      "standard",
      "standard",
      "excessive",
      "excessive",
      "serious",
    ]);
    expect(hourlyCarbon(2616)).toHaveLength(18);
  });
});

describe("carbon intensity", () => {
  it("sits near its assumed targets at t0 (80–110 %)", async () => {
    const { selectCarbon } = await import("@/store/selectors");
    const { useAppStore } = await import("@/store/useAppStore");
    useAppStore.getState().resetDemo();
    for (const i of selectCarbon(useAppStore.getState(), "month").intensity) {
      const share = i.value / i.target;
      expect(share, i.label).toBeGreaterThan(0.8);
      expect(share, i.label).toBeLessThan(1.1);
    }
  });
});
