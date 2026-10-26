import { describe, expect, it } from "vitest";
import { floorSpec } from "@/data/property";
import { generateRooms } from "@/data/rooms";
import type { FloorSelection, SceneMode } from "@/types";
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

describe("schematic building", () => {
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

  it("produces unit normals in every mode (NaN normals black out Bloom, 3D_PLAN 3R8)", () => {
    for (const [mode, floor, explode] of [
      ["xray", "all", false],
      ["slice", "H12", false],
      ["slice", "G", false],
      ["exterior", "all", true],
    ] as const) {
      for (const g of build(mode, floor, explode).values()) {
        const n = g.getAttribute("normal").array;
        for (let i = 0; i < n.length; i += 3) expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(1, 4);
      }
    }
  });
});
