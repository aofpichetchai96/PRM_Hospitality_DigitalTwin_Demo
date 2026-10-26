// Schematic building for X-ray / Slice / Explode — port of the prototype's
// schematic branch (L232–297), laid out on the floor schedule instead of the
// prototype's 30 × 20 demo grid (docs/3D_PLAN.md section 8).
import { floorSpec, FLOORS, isHotelFloor, PODIUM_LEVEL_HEIGHT } from "@/data/property";
import type { FloorSelection, FloorSpec, Room, RoomStatus, SceneMode } from "@/types";
import { GeometryBuilder, type RGBA } from "./builder";

/** Extra gap per level when exploded (prototype: podium 2.0 m, tower 1.55 m) */
/** Room cell depth either side of the corridor (m) */
export const ROOM_DEPTH = 5.7;

export const EXPLODE_GAP = { podium: 2.0, tower: 1.55 };

const ROOM_COLOR: Record<RoomStatus, RGBA> = {
  occupied: [0.44, 0.7, 0.62, 1],
  ready: [0.47, 0.63, 0.77, 1],
  cleaning: [0.79, 0.68, 0.43, 1],
  maintenance: [0.81, 0.45, 0.45, 1],
};
/** Prototype room cell width (m); furniture scales to the actual cell */
const CELL = 4.4;

export type SchematicOptions = {
  mode: SceneMode;
  floor: FloorSelection;
  explode: boolean;
  /** Rooms of every hotel floor, used for the furniture status colours */
  rooms: readonly Room[];
};

const PODIUM = FLOORS.filter((f) => f.type === "retail");
const TOWER = FLOORS.filter((f) => isHotelFloor(f.id));

/** Slab level of a floor, including the explode offset */
export function floorLevel(id: string, explode: boolean) {
  const spec = floorSpec(id as never);
  if (!isHotelFloor(id)) {
    const i = PODIUM.indexOf(spec);
    return spec.y + (explode ? i * EXPLODE_GAP.podium : 0);
  }
  const i = TOWER.indexOf(spec);
  return spec.y + (explode ? i * EXPLODE_GAP.tower : 0);
}

/** Room cells in index order: front row (+z) then back row, either side of the corridor */
export function roomSlots(spec: FloorSpec) {
  const { x: tx, z: tz, w: W } = spec.footprint;
  const perSide = Math.ceil(spec.rooms / 2);
  const cell = W / perSide;
  return Array.from({ length: spec.rooms }, (_, k) => {
    const front = k < perSide;
    const col = front ? k : k - perSide;
    return { x: tx - W / 2 + cell / 2 + col * cell, z: tz + (front ? 4.65 : -4.65), front, cell };
  });
}

/** Bed, headboard, status bedspread, desk and partition (prototype roomFurniture, L134) */
function roomFurniture(
  g: GeometryBuilder,
  x: number,
  y: number,
  z: number,
  s: number,
  status: RoomStatus,
  front: boolean,
) {
  const f = front ? 1 : -1;
  g.box(x, y + 0.05, z, 4.05 * s, 0.12, 5.7, "stone", [0.69, 0.68, 0.61, 1]);
  g.box(x, y + 0.65, z + 0.6 * f, 2.0 * Math.min(1, s * 1.1), 1.0, 2.65, "stone", [0.88, 0.89, 0.86, 1]);
  g.box(x, y + 1.22, z - 0.32 * f, 1.8 * Math.min(1, s * 1.1), 0.2, 0.6, "stone", [0.99, 0.96, 0.88, 1]);
  g.box(x, y + 1.18, z + 1.05 * f, 2.04 * Math.min(1, s * 1.1), 0.08, 1.0, "stone", ROOM_COLOR[status]);
  g.box(x + 1.5 * s, y + 0.72, z - 0.5 * f, 0.48 * s, 0.8, 0.65, "wood");
  g.box(x + 2.06 * s, y + 1.3, z, 0.12, 2.6, 6.0, "stone", [0.71, 0.77, 0.79, 1]);
}

export function buildSchematic({ mode, floor, explode, rooms }: SchematicOptions) {
  const g = new GeometryBuilder(52011);
  const cut = mode === "slice" && floor !== "all";
  const podiumSelected = cut && !isHotelFloor(floor) ? PODIUM.findIndex((f) => f.id === floor) : -1;
  const hotelSelected = cut && isHotelFloor(floor) ? TOWER.findIndex((f) => f.id === floor) : -1;

  // Retail podium: slab, translucent volume, columns, shop units, concourse + escalators
  PODIUM.forEach((spec, i) => {
    if (podiumSelected >= 0 && i > podiumSelected) return;
    const y = floorLevel(spec.id, explode) + PODIUM_LEVEL_HEIGHT / 2;
    const selected = i === podiumSelected;
    g.box(0, y - 2.35, 0, 86, 0.55, 50, "stone", selected ? [0.71, 0.89, 0.88, 1] : [0.69, 0.74, 0.77, 1]);
    g.box(0, y + 0.1, 0, 83, 4.5, 47, "transparent", [0.25, 0.55, 0.62, 0.09]);
    for (let x = -37; x <= 38; x += 15)
      for (const z of [-19, 19]) g.box(x, y, z, 0.8, 4.6, 0.8, "stone", [0.61, 0.71, 0.77, 1]);
    for (let x = -30; x <= 30; x += 12) {
      const c: RGBA = g.rand() < 0.4 ? [0.32, 0.68, 0.72, 1] : [0.5, 0.62, 0.72, 1];
      g.box(x, y - 1.8, -12, 9, 0.3, 13, "stone", c);
      g.box(x, y - 1.8, 12, 9, 0.3, 13, "stone", c);
      g.box(x - 4.5, y - 0.6, -12, 0.18, 2.5, 13, "stone", [0.6, 0.69, 0.73, 1]);
    }
    g.box(0, y - 1.73, 0, 78, 0.14, 8, "stone", [0.71, 0.75, 0.75, 1]);
    g.box(-4, y - 0.5, 0, 2, 1.2, 11, "metal");
    g.box(4, y - 0.5, 0, 2, 1.2, 11, "metal");
    if (selected) g.outline(0, y - 2.0, 0, 88, 52);
  });
  if (podiumSelected >= 0) return g.build();

  // Podium roof garden and glazed pavilion
  const roofY = 26.3 + (explode ? PODIUM.length * EXPLODE_GAP.podium : 0);
  g.box(0, roofY, 0, 87, 0.7, 51, "stone", [0.78, 0.81, 0.81, 1]);
  g.box(-23, roofY + 1.7, -3, 25, 3.0, 18, "glass", [0.37, 0.5, 0.56, 1]);
  g.box(-23, roofY + 3.33, -3, 25.5, 0.25, 18.5, "metal");
  for (let x = -34; x < 39; x += 10) {
    g.box(x, roofY + 0.6, 19, 4, 0.9, 2.4, "stone", [0.48, 0.53, 0.48, 1]);
    g.tree(x, 19, roofY + 0.9, 0.5);
  }

  // Hotel tower on the floor schedule — up to the selected floor in Slice
  const top = hotelSelected >= 0 ? hotelSelected + 1 : TOWER.length;
  for (let i = 0; i < top; i++) {
    const spec = TOWER[i];
    const { x: tx, z: tz, w: W, d: D } = spec.footprint;
    const yy = floorLevel(spec.id, explode);
    const selected = i === hotelSelected;
    g.box(tx, yy, tz, W + 0.6, 0.28, D + 0.5, "stone", selected ? [0.71, 0.89, 0.88, 1] : [0.51, 0.65, 0.73, 1]);
    g.box(tx, yy + 1.5, tz - 1.1, W, 0.12, 0.13, "glow", [0.25, 0.71, 0.7, 0.6]);
    for (const x of [tx - W / 2 + 0.7, tx, tx + W / 2 - 0.7])
      for (const z of [tz - D / 2 + 0.6, tz + D / 2 - 0.6]) g.box(x, yy + 1.85, z, 0.45, 3.7, 0.45, "metal");

    const showInterior = selected || explode || i === top - 1;
    if (spec.type === "skyCourt" || spec.type === "roof") {
      // Amenity floors: deck and planting instead of rooms
      g.box(tx, yy + 0.2, tz, W - 2, 0.12, D - 2, "deck");
      if (showInterior)
        for (let x = tx - W / 2 + 4; x < tx + W / 2 - 2; x += 6) g.tree(x, tz + D / 2 - 4, yy + 0.3, 0.55);
    } else if (showInterior) {
      const slots = roomSlots(spec);
      rooms
        .filter((r) => r.floor === spec.id)
        .forEach((r, k) => {
          const { x, z, front, cell } = slots[k];
          roomFurniture(g, x, yy + 0.2, z, cell / CELL, r.status, front);
        });
      g.box(tx, yy + 0.25, tz, W, 0.1, 2.4, "stone", [0.6, 0.72, 0.74, 1]);
    } else {
      g.box(tx, yy + 0.06, tz, W, 0.12, D, "stone", [0.3, 0.55, 0.65, 0.9]);
    }
    if (selected) g.outline(tx, yy + 0.45, tz, W + 1.8, D + 1.8);
  }
  return g.build();
}
