// Data layers drawn in 3D — prototype L205, L290, L304–306. Built separately
// from the building so toggling a layer never rebuilds the building.
import { FLOORS, isHotelFloor } from "@/data/property";
import type { Layers } from "@/types";
import { GeometryBuilder } from "./builder";
import { floorLevel } from "./schematic";

const TOWER = FLOORS.filter((f) => isHotelFloor(f.id) && f.type !== "roof");

/** Security camera positions (prototype L306) — also used by the pick proxies */
export const SECURITY_CAMERAS: [number, number, number][] = [
  [-28, 6.9, 26],
  [29, 7, 26],
  [44, 7, 0],
  [30, 13, 3],
];

export function buildLayers({ layers, xray, explode }: { layers: Layers; xray: boolean; explode: boolean }) {
  const g = new GeometryBuilder(30517);

  if (layers.energy) {
    // Heat band on the south face of every tower floor, warmer higher up
    TOWER.forEach((spec, i) => {
      const { x, z, w, d } = spec.footprint;
      const y = floorLevel(spec.id, explode);
      const heat = i / TOWER.length;
      // Just outside the facade fins (prototype: 0.8 m in front of the tower face)
      const zf = z + d / 2 + 0.8;
      g.quad(
        [x - w / 2, y, zf],
        [x + w / 2, y, zf],
        [x + w / 2, y + spec.height - 0.1, zf],
        [x - w / 2, y + spec.height - 0.1, zf],
        "transparent",
        [0.2 + 0.74 * heat, 0.74 - 0.28 * heat, 0.8 - 0.5 * heat, 0.24],
      );
    });
  }

  if (layers.energy || xray) {
    // Chilled-water risers from the central plant up the core, with branches every third floor
    const top = floorLevel("H29", explode) + 4;
    const path: [number, number, number][] = [
      [56, 3.3, -12],
      [39, 3.3, -12],
      [39, 27.2, -12],
      [9, 27.2, -12],
      [9, top, -12],
    ];
    for (let i = 0; i < path.length - 1; i++) g.line(path[i], path[i + 1], 0.7, "blue");
    TOWER.forEach((spec, i) => {
      if (i % 3 !== 1) return;
      const y = floorLevel(spec.id, explode);
      g.line([9, y, -12], [spec.footprint.x + spec.footprint.w / 2 - 2, y, -12], 0.35, "blue");
    });
    g.line([39, 8, 0], [-35, 8, 0], 0.55, "blue");
  }

  if (layers.people) {
    // Aggregated crowd density at the arrival plaza and the main walking route
    for (let i = 0; i < 36; i++) {
      const x = -32 + g.rand() * 63;
      const z = 6 + g.rand() * 26;
      g.sphere(x, 0.4, z, 2.7, 0.09, 2.7, "transparent", [0.15, 0.77, 0.63, 0.33], 10, 3);
    }
    g.line([-36, 0.6, 31], [0, 0.6, 28], 0.75, "glow");
    g.line([0, 0.6, 28], [0, 0.6, 9], 0.75, "glow");
  }

  if (layers.security) for (const [x, y, z] of SECURITY_CAMERAS) g.sphere(x, y, z, 0.4, 0.4, 0.4, "glow");

  return g.build();
}
