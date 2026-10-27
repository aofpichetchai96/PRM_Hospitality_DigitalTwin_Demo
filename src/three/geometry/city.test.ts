import { describe, expect, it } from "vitest";
import { buildCity, CITY_FOR_TESTS } from "./city";

const { cityRects, SITE, maxHeight } = CITY_FOR_TESTS;

describe("surrounding city", () => {
  const city = buildCity();

  it("keeps out of the project site", () => {
    for (const r of cityRects()) {
      const overlaps = r.x0 < SITE.x1 && r.x1 > SITE.x0 && r.z0 < SITE.z1 && r.z1 > SITE.z0;
      expect(overlaps, JSON.stringify(r)).toBe(false);
    }
  });

  it("stays below the hotel tower and lowest next to the site", () => {
    let top = 0;
    for (const g of city.values()) {
      const p = g.getAttribute("position").array;
      for (let i = 1; i < p.length; i += 3) top = Math.max(top, p[i]);
    }
    expect(top).toBeLessThan(90);
    expect(maxHeight(150)).toBeLessThan(25);
  });

  it("covers the full zoom-out range and has unit normals", () => {
    const box = city.get("road")!.boundingBox!;
    expect(box.min.x).toBeLessThanOrEqual(-1200);
    expect(box.max.z).toBeGreaterThanOrEqual(1200);
    for (const g of city.values()) {
      const n = g.getAttribute("normal").array;
      let worst = 0;
      for (let i = 0; i < n.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1));
      expect(worst).toBeLessThan(1e-4);
    }
  });
});
