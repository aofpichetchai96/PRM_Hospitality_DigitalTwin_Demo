import { describe, expect, it } from "vitest";
import { createRng, GeometryBuilder } from "./builder";
import { buildExterior } from "./exterior";
import { buildSite } from "./site";

const vertexCount = (geos: ReturnType<GeometryBuilder["build"]>) =>
  [...geos.values()].reduce((n, g) => n + g.getAttribute("position").count, 0);

describe("createRng", () => {
  it("matches the prototype LCG sequence and stays in [0, 1)", () => {
    const a = createRng(74021),
      b = createRng(74021);
    const seq = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seq);
    // First value of the prototype's rand() with seed 74021
    expect(seq[0]).toBeCloseTo(((Math.imul(1664525, 74021) + 1013904223) >>> 0) / 4294967296, 12);
    for (const v of seq) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("GeometryBuilder", () => {
  it("emits 6 vertices per quad and 36 per box, bucketed by material", () => {
    const g = new GeometryBuilder(1);
    g.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], "stone");
    g.box(0, 0, 0, 1, 1, 1, "metal");
    const out = g.build();
    expect(out.get("stone")!.getAttribute("position").count).toBe(6);
    expect(out.get("metal")!.getAttribute("position").count).toBe(36);
  });

  it("builds a rounded solid from a 36-point outline (wall quad + top and bottom fan per edge)", () => {
    const g = new GeometryBuilder(1);
    expect(g.roundedPath(0, 0, 10, 6, 2)).toHaveLength(36);
    g.roundedSolid(0, 0, 0, 10, 2, 6, 2, "ivory");
    expect(g.build().get("ivory")!.getAttribute("position").count).toBe(36 * 12);
  });

  it("stores vertex colours in linear space with alpha", () => {
    const g = new GeometryBuilder(1);
    g.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], "line");
    const color = g.build().get("line")!.getAttribute("color");
    expect(color.itemSize).toBe(4);
    expect(color.getX(0)).toBeLessThan(0.5); // sRGB 0.5 → ~0.21 linear
    expect(color.getW(0)).toBeCloseTo(0.35);
  });

  it("never emits zero-length normals (NaN in shaders, black frame with bloom)", () => {
    const g = new GeometryBuilder(1);
    // One collapsed edge (a === b): still a valid triangle, normal must be +z
    g.quad([0, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0], "stone");
    // Fully degenerate quad and triangle: skipped
    g.quad([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], "metal");
    g.tri([0, 0, 0], [1, 0, 0], [2, 0, 0], "metal");
    const out = g.build();
    const n = out.get("stone")!.getAttribute("normal");
    expect([n.getX(0), n.getY(0), n.getZ(0)].map((v) => v + 0)).toEqual([0, 0, 1]); // + 0 folds -0
    expect(out.has("metal")).toBe(false);
    for (const geos of [buildExterior(), buildSite()])
      for (const geo of geos.values()) {
        const nn = geo.getAttribute("normal");
        for (let i = 0; i < nn.count; i++) expect(Math.hypot(nn.getX(i), nn.getY(i), nn.getZ(i))).toBeCloseTo(1, 5);
      }
  });

  it("points quad normals along the winding", () => {
    const g = new GeometryBuilder(1);
    g.quad([0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], "stone");
    const n = g.build().get("stone")!.getAttribute("normal");
    expect([n.getX(0), n.getY(0), n.getZ(0)].map((v) => v + 0)).toEqual([0, 0, 1]); // + 0 folds -0
  });
});

describe("scene builders", () => {
  it("are deterministic", () => {
    expect(vertexCount(buildExterior())).toBe(vertexCount(buildExterior()));
    expect(vertexCount(buildSite())).toBe(vertexCount(buildSite()));
  });

  it("generate lit windows for dusk and keep the arrival sign", () => {
    const ext = buildExterior();
    expect(ext.get("windowLight")!.getAttribute("position").count).toBeGreaterThan(0);
    expect(ext.get("sign")!.getAttribute("position").count).toBe(6);
  });

  it("keeps every vertex inside the site and below the crown", () => {
    for (const geos of [buildExterior(), buildSite()])
      for (const g of geos.values()) {
        const box = g.boundingBox!;
        expect(box.max.y).toBeLessThanOrEqual(162);
        expect(box.min.x).toBeGreaterThanOrEqual(-215);
        expect(box.max.x).toBeLessThanOrEqual(215);
      }
  });
});
