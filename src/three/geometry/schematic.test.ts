import { describe, expect, it } from "vitest";
import { floorSpec } from "@/data/property";
import { generateRooms } from "@/data/rooms";
import type { FloorSelection, SceneMode } from "@/types";
import { buildLayers } from "./layers";
import { buildSchematic } from "./schematic";

const rooms = generateRooms(84);
const build = (mode: SceneMode, floor: FloorSelection, explode = false) =>
  buildSchematic({ mode, floor, explode, rooms });

function maxY(batches: ReturnType<typeof buildSchematic>) {
  let max = -Infinity;
  for (const g of batches.values()) {
    const p = g.getAttribute("position").array;
    for (let i = 1; i < p.length; i += 3) max = Math.max(max, p[i]);
  }
  return max;
}

describe("schematic building", { timeout: 30_000 }, () => {
  it("cuts everything above the sliced hotel floor", () => {
    const h12 = floorSpec("H12");
    expect(maxY(build("slice", "H12"))).toBeLessThan(h12.y + h12.height);
    expect(maxY(build("xray", "all"))).toBeGreaterThan(floorSpec("H30").y);
  });

  it("shows only the podium up to a sliced retail floor", () => {
    expect(maxY(build("slice", "L2"))).toBeLessThan(floorSpec("L3").y + 1);
  });

  it("lays out 17 rooms on a narrow floor and marks the selection", () => {
    const narrow = build("slice", "H27");
    expect(narrow.get("glow")).toBeDefined();
    expect(maxY(narrow)).toBeLessThan(floorSpec("H28").y);
  });

  it("produces unit normals in every mode and floor programme (NaN normals black out Bloom, 3D_PLAN 3R8)", () => {
    for (const [mode, floor, explode] of [
      ["xray", "all", false],
      ["slice", "H12", false],
      ["slice", "H27", false],
      ["slice", "H08", false],
      ["slice", "H09", false],
      ["slice", "H16", false],
      ["slice", "H17", false],
      ["slice", "H24", false],
      ["slice", "H25", false],
      ["slice", "H30", false],
      ["slice", "G", false],
      ["slice", "L1", false],
      ["slice", "L2", false],
      ["slice", "L3", false],
      ["slice", "L4", false],
      ["exterior", "all", true],
    ] as const) {
      for (const g of build(mode, floor, explode).values()) {
        const n = g.getAttribute("normal").array;
        let worst = 0;
        for (let i = 0; i < n.length; i += 3)
          worst = Math.max(worst, Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1));
        expect(worst, `${mode} ${floor}`).toBeLessThan(1e-4);
      }
    }
  });
});

describe("floor fit-out", () => {
  const vertices = (b: ReturnType<typeof buildSchematic>) =>
    [...b.values()].reduce((n, g) => n + g.getAttribute("position").count, 0);

  it("furnishes the sliced guest floor: rooms, core and corridors", () => {
    // Vertices on H12 itself, sliced (fitted out) vs. X-ray (status tiles)
    const h12 = floorSpec("H12");
    const onFloor = (b: ReturnType<typeof buildSchematic>) => {
      let n = 0;
      for (const g of b.values()) {
        const p = g.getAttribute("position").array;
        for (let i = 1; i < p.length; i += 3) if (p[i] > h12.y + 0.15 && p[i] < h12.y + h12.height) n++;
      }
      return n;
    };
    expect(onFloor(build("slice", "H12"))).toBeGreaterThan(20 * onFloor(build("xray", "all")));
  });

  it("keeps the exploded stack within the GPU budget (lite rooms, < 1.5 M vertices)", () => {
    const t0 = performance.now();
    const n = vertices(build("exterior", "all", true));
    expect(n).toBeLessThan(1_500_000);
    // Rebuilt when a room changes status — must not stall the frame noticeably
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});

describe("data layers", () => {
  const layers = { energy: true, security: false, people: false, assets: false };
  it("stop at the sliced floor like the building", () => {
    const top = (cutFloor?: string) => maxY(buildLayers({ layers, xray: true, explode: false, rooms, cutFloor }));
    expect(top("H12")).toBeLessThan(floorSpec("H13").y);
    expect(top("L2")).toBeLessThan(floorSpec("H01").y);
    expect(top()).toBeGreaterThan(floorSpec("H29").y);
  });
});
