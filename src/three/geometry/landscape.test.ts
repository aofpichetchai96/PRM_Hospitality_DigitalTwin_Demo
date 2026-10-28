import { describe, expect, it } from "vitest";
import { GeometryBuilder } from "./builder";
import { buildCity } from "./city";
import { GARDENS, SITE_LAMPS } from "./landscape";
import { buildSite } from "./site";

type Geo = { getAttribute(n: string): { count: number; array: ArrayLike<number> } };
const vertices = (gs: Map<string, Geo>) => [...gs.values()].reduce((n, g) => n + g.getAttribute("position").count, 0);
const overlaps = (a: (typeof GARDENS)[number], b: { x0: number; x1: number; z0: number; z1: number }) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

describe("site landscape", () => {
  it("keeps the gardens on the plinth, off the plaza, the plant house and the avenue", () => {
    const plaza = { x0: -60.5, x1: 60.5, z0: -36.5, z1: 36.5 };
    const plant = { x0: 48, x1: 66, z0: -31.5, z1: -8.5 };
    const avenue = { x0: -110, x1: 110, z0: 29, z1: 74 };
    for (const r of GARDENS) {
      expect(r.x0).toBeGreaterThanOrEqual(-110);
      expect(r.x1).toBeLessThanOrEqual(110);
      expect(r.z0).toBeGreaterThanOrEqual(-76);
      for (const other of [plaza, plant, avenue]) expect(overlaps(r, other)).toBe(false);
    }
    for (let i = 0; i < GARDENS.length; i++)
      for (let j = i + 1; j < GARDENS.length; j++) expect(overlaps(GARDENS[i], GARDENS[j])).toBe(false);
  });

  it("lights the gardens and both avenue sidewalks, never on the zebra or the road", () => {
    expect(SITE_LAMPS.length).toBeGreaterThan(60);
    for (const l of SITE_LAMPS) {
      expect(l.z < 39 || l.z > 69).toBe(true);
      if (l.z > 36) expect(l.x < -44 || l.x > -24).toBe(true);
    }
  });

  it("builds trees with unit normals and no NaN, and keeps the site and city within budget", () => {
    const g = new GeometryBuilder(7);
    for (let i = 0; i < 30; i++) g.tree(i * 10, 0, 0, 1);
    for (const geo of g.build().values()) {
      const n = geo.getAttribute("normal").array;
      for (let i = 0; i < n.length; i += 3)
        expect(Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1)).toBeLessThan(1e-4);
    }
    // Was 11.6 k (site) and 961 k (city) before the landscape and the smoother trees
    expect(vertices(buildSite() as unknown as Map<string, Geo>)).toBeLessThan(400_000);
    expect(vertices(buildCity() as unknown as Map<string, Geo>)).toBeLessThan(961_000);
  });
});
