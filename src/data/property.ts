// Floor schedule — single source for the exterior, schematic building, pick
// proxies, room grid and camera (docs/3D_PLAN.md section 8, decision A).
import { pad2 } from "@/lib/format";
import { FLOOR_HEIGHT, TOWER_BASE_Y } from "@/three/geometry/exterior";
import type { FloorId, FloorSpec, FloorType, HotelFloorId, PodiumFloorId } from "@/types";

export const TOTAL_KEYS = 600;
export const PODIUM_LEVEL_HEIGHT = 5.2;

const PODIUM_FOOTPRINT = { x: 0, z: 0, w: 87, d: 51 };
const TOWER_FOOTPRINT = { x: 9, z: -6, w: 44, d: 28 };
const NARROW_FOOTPRINT = { x: 19, z: -7, w: 23, d: 25 };
const ROOF_FOOTPRINT = { x: 9, z: -6, w: 45, d: 29 };

const ROOMS: Record<FloorType, number> = { retail: 0, guest: 28, guestNarrow: 17, skyCourt: 0, roof: 0 };

/** Tower floor type by 1-based floor number (bands match the exterior, L186) */
function towerType(n: number): FloorType {
  if (n === 30) return "roof";
  if (n >= 26) return "guestNarrow";
  if ([8, 9, 16, 17, 24, 25].includes(n)) return "skyCourt";
  return "guest";
}

const podium: FloorSpec[] = (["G", "L1", "L2", "L3", "L4"] as PodiumFloorId[]).map((id, level) => ({
  id,
  type: "retail",
  y: level * PODIUM_LEVEL_HEIGHT,
  height: PODIUM_LEVEL_HEIGHT,
  footprint: PODIUM_FOOTPRINT,
  rooms: 0,
}));

const tower: FloorSpec[] = Array.from({ length: 30 }, (_, i) => {
  const type = towerType(i + 1);
  return {
    id: `H${pad2(i + 1)}` as HotelFloorId,
    type,
    y: TOWER_BASE_Y + i * FLOOR_HEIGHT,
    height: FLOOR_HEIGHT,
    footprint: type === "guestNarrow" ? NARROW_FOOTPRINT : type === "roof" ? ROOF_FOOTPRINT : TOWER_FOOTPRINT,
    rooms: ROOMS[type],
  };
});

export const FLOORS: readonly FloorSpec[] = [...podium, ...tower];
export const HOTEL_FLOORS = tower;
/** Floors that hold guest rooms, in order — H01 … H29 without sky courts */
export const GUEST_FLOORS = tower.filter((f) => f.rooms > 0);

const byId = new Map(FLOORS.map((f) => [f.id, f]));
export function floorSpec(id: FloorId) {
  const spec = byId.get(id);
  if (!spec) throw new Error(`Unknown floor ${id}`);
  return spec;
}

export const isHotelFloor = (id: string): id is HotelFloorId => /^H\d{2}$/.test(id);

/** Amenity copy for floors without rooms */
export const FLOOR_AMENITY: Partial<Record<FloorType, string>> = {
  skyCourt: "Sky court · สวนลอยฟ้าและพื้นที่ส่วนกลางสูง 2 ชั้น",
  roof: "Roof terrace · ลานชมวิวและ Crown ของอาคาร",
  retail: "Retail podium · ร้านค้า F&B และพื้นที่ส่วนกลาง",
};

/** Site bounds (m) — every data position must fall inside (tested) */
export const SITE_BOUNDS = { min: [-120, 0, -90], max: [120, 170, 90] } as const;
