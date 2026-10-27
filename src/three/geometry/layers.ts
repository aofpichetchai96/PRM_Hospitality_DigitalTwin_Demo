// Data layers drawn in 3D — prototype L205, L290, L304–306. Built separately
// from the building so toggling a layer never rebuilds the building.
import { FLOORS, isHotelFloor } from "@/data/property";
import type { Layers, Room } from "@/types";
import { GeometryBuilder } from "./builder";
import { RISER } from "./interiors";
import { floorLevel } from "./schematic";

const TOWER = FLOORS.filter((f) => isHotelFloor(f.id) && f.type !== "roof");

/** Security camera positions (prototype L306) — also used by the pick proxies */
export const SECURITY_CAMERAS: [number, number, number][] = [
  [-28, 6.9, 26],
  [29, 7, 26],
  [44, 7, 0],
  [30, 13, 3],
];

/** Chilled-water riser from the plant up the tower core's riser shaft, stopping at the sliced floor */
export function riserPath(explode: boolean, cutFloor?: string): [number, number, number][] {
  const cutIndex = cutFloor ? TOWER.findIndex((f) => f.id === cutFloor) : TOWER.length - 1;
  const last = TOWER[cutIndex];
  const path: [number, number, number][] = [
    [56, 3.3, -12],
    [39, 3.3, -12],
    [39, 27.2, -12],
  ];
  if (last)
    path.push([RISER.x, 27.2, -12], [RISER.x, 27.2, RISER.z], [RISER.x, floorLevel(last.id, explode) + 4, RISER.z]);
  return path;
}

export function buildLayers({
  layers,
  xray,
  explode,
  rooms,
  cutFloor,
}: {
  layers: Layers;
  xray: boolean;
  explode: boolean;
  rooms: readonly Room[];
  /** Sliced floor: nothing is drawn above it, like the building */
  cutFloor?: string;
}) {
  const g = new GeometryBuilder(30517);
  // Tower floors still standing: none when a podium floor is sliced
  const cutIndex = cutFloor ? TOWER.findIndex((f) => f.id === cutFloor) : TOWER.length - 1;
  const tower = TOWER.slice(0, cutIndex + 1);
  const occupied = new Map<string, number>();
  for (const r of rooms) if (r.status === "occupied") occupied.set(r.floor, (occupied.get(r.floor) ?? 0) + 1);

  if (layers.energy) {
    // Heat band on the south face of every tower floor: cooling load follows the
    // floor's occupied rooms (amenity floors run a low base load)
    tower.forEach((spec) => {
      const { x, z, w, d } = spec.footprint;
      const y = floorLevel(spec.id, explode);
      // Colour spans 60–100 % occupancy, where the floors actually differ
      const occ = spec.rooms ? (occupied.get(spec.id) ?? 0) / spec.rooms : 0.5;
      const heat = Math.min(1, Math.max(0, (occ - 0.6) / 0.4));
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
    // Chilled-water riser from the central plant up the core, with ceiling branches every third floor
    const path = riserPath(explode, cutFloor);
    for (let i = 0; i < path.length - 1; i++) g.line(path[i], path[i + 1], 0.7, "blue");
    tower.forEach((spec, i) => {
      if (i % 3 !== 1) return;
      const y = floorLevel(spec.id, explode);
      g.line(
        [RISER.x, y + 3.3, RISER.z],
        [spec.footprint.x + spec.footprint.w / 2 - 2, y + 3.3, RISER.z],
        0.35,
        "blue",
      );
    });
    g.line([39, 8, 0], [-35, 8, 0], 0.55, "blue");
  }

  if (layers.people) {
    // Main walking route; the density itself is the PeopleHeatmap texture
    g.line([-36, 0.6, 31], [0, 0.6, 28], 0.75, "glow");
    g.line([0, 0.6, 28], [0, 0.6, 9], 0.75, "glow");
  }

  if (layers.security) for (const [x, y, z] of SECURITY_CAMERAS) g.sphere(x, y, z, 0.4, 0.4, 0.4, "glow");

  return g.build();
}
