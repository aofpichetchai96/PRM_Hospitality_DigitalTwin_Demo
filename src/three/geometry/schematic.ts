// Schematic building for X-ray / Slice / Explode — port of the prototype's
// schematic branch (L232–297), laid out on the floor schedule instead of the
// prototype's 30 × 20 demo grid (docs/3D_PLAN.md section 8). Floor fit-out
// (rooms, core, amenities, podium programme) lives in interiors.ts.
import { floorSpec, FLOORS, isHotelFloor, PODIUM_LEVEL_HEIGHT } from "@/data/property";
import type { FloorSelection, FloorSpec, Room, SceneMode } from "@/types";
import { GeometryBuilder, type RGBA } from "./builder";
import {
  type Detail,
  guestFloor,
  guestPlan,
  MEZZANINE_EDGE,
  PODIUM_ATRIUM,
  podiumFloor,
  roofFloor,
  ROOM_COLOR,
  type RoomSlot,
  skyCourtFloor,
} from "./interiors";

/** Extra gap per level when exploded (prototype: podium 2.0 m, tower 1.55 m) */
export const EXPLODE_GAP = { podium: 2.0, tower: 1.55 };

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

/** Room cells in index order: front row (+z) then back row, from the corridor to the facade */
export function roomSlots(spec: FloorSpec): RoomSlot[] {
  const { x: tx, z: tz, w: W } = spec.footprint;
  const { core, corridor, depth } = guestPlan(spec);
  const perSide = Math.ceil(spec.rooms / 2);
  const cell = W / perSide;
  const off = core / 2 + corridor + depth / 2;
  return Array.from({ length: spec.rooms }, (_, k) => {
    const front = k < perSide;
    const col = front ? k : k - perSide;
    return { x: tx - W / 2 + cell / 2 + col * cell, z: tz + (front ? off : -off), front, cell, depth, col };
  });
}

export function buildSchematic({ mode, floor, explode, rooms }: SchematicOptions) {
  const g = new GeometryBuilder(52011);
  const cut = mode === "slice" && floor !== "all";
  const podiumSelected = cut && !isHotelFloor(floor) ? PODIUM.findIndex((f) => f.id === floor) : -1;
  const hotelSelected = cut && isHotelFloor(floor) ? TOWER.findIndex((f) => f.id === floor) : -1;

  // Retail podium: slab (open at the atrium above G), translucent volume, programme
  PODIUM.forEach((spec, i) => {
    if (podiumSelected >= 0 && i > podiumSelected) return;
    const base = floorLevel(spec.id, explode);
    const y = base + PODIUM_LEVEL_HEIGHT / 2;
    const selected = i === podiumSelected;
    const slab: RGBA = selected ? [0.71, 0.89, 0.88, 1] : [0.69, 0.74, 0.77, 1];
    if (i === 0) g.box(0, y - 2.35, 0, 86, 0.55, 50, "stone", slab);
    else {
      const { x0, x1, z0, z1 } = PODIUM_ATRIUM;
      g.box((-43 + x0) / 2, y - 2.35, 0, x0 + 43, 0.55, 50, "stone", slab);
      g.box((x1 + 43) / 2, y - 2.35, 0, 43 - x1, 0.55, 50, "stone", slab);
      g.box((x0 + x1) / 2, y - 2.35, (-25 + z0) / 2, x1 - x0, 0.55, z0 + 25, "stone", slab);
      g.box((x0 + x1) / 2, y - 2.35, (z1 + 25) / 2, x1 - x0, 0.55, 25 - z1, "stone", slab);
    }
    g.box(0, y + 0.1, 0, 83, 4.5, 47, "transparent", [0.25, 0.55, 0.62, 0.06]);
    podiumFloor(g, spec.id, y - 2.075, selected);
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
    const slab: RGBA = selected ? [0.71, 0.89, 0.88, 1] : [0.51, 0.65, 0.73, 1];
    // Upper level of a two-storey sky court: a mezzanine over the back half
    const mezzanine = spec.type === "skyCourt" && Number(spec.id.slice(1)) % 2 === 1;
    if (mezzanine) {
      const z0 = tz - D / 2 - 0.25;
      const z1 = tz + MEZZANINE_EDGE;
      g.box(tx, yy, (z0 + z1) / 2, W + 0.6, 0.28, z1 - z0, "stone", slab);
    } else g.box(tx, yy, tz, W + 0.6, 0.28, D + 0.5, "stone", slab);
    for (const x of [tx - W / 2 + 0.7, tx, tx + W / 2 - 0.7])
      for (const z of [tz - D / 2 + 0.6, tz + D / 2 - 0.6]) g.box(x, yy + 1.85, z, 0.45, 3.7, 0.45, "metal");

    // Fitted out: the sliced floor, the top floor in X-ray, every floor when exploded
    const detail: Detail | null =
      selected || (!explode && i === top - 1) || (explode && floor === spec.id) ? "full" : explode ? "lite" : null;
    const y = yy + 0.14;
    if (spec.type === "skyCourt" || spec.type === "roof") {
      if (detail && spec.type === "roof") roofFloor(g, spec, y);
      else if (detail) skyCourtFloor(g, spec, y);
      else g.box(tx, yy + 0.2, tz, W - 2, 0.12, D - 2, "deck");
    } else if (detail) {
      guestFloor(
        g,
        spec,
        y,
        rooms.filter((r) => r.floor === spec.id),
        roomSlots(spec),
        detail,
      );
    } else {
      g.box(tx, yy + 1.5, tz - 1.1, W, 0.12, 0.13, "glow", [0.25, 0.71, 0.7, 0.6]);
      g.box(tx, yy + 0.06, tz, W, 0.12, D, "stone", [0.3, 0.55, 0.65, 0.9]);
      g.box(tx, yy + 0.3, tz, W - 1, 0.3, guestPlan(spec).core, "stone", [0.6, 0.64, 0.66, 1]);
      // Floors without furniture still show every room as a status tile, so
      // occupancy reads from a distance (simplified semantic zoom, 3D_PLAN 5.4)
      const slots = roomSlots(spec);
      rooms
        .filter((r) => r.floor === spec.id)
        .forEach((r, k) => {
          const { x, z, cell, depth } = slots[k];
          g.box(x, yy + 0.2, z, cell * 0.86, 0.16, depth * 0.86, "stone", ROOM_COLOR[r.status]);
        });
    }
    if (selected) g.outline(tx, yy + 0.45, tz, W + 1.8, D + 1.8);
  }
  return g.build();
}
