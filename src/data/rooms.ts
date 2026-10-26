// 600 simulated rooms laid out on the floor schedule (PLAN 7). Status mix and
// shuffle follow the prototype's makeRooms (L347) so t0 is 504 / 62 / 28 / 6.
import { pad2 } from "@/lib/format";
import { seededShuffle } from "@/lib/random";
import type { Room, RoomStatus, RoomType } from "@/types";
import { GUEST_FLOORS, TOTAL_KEYS } from "./property";

const SHUFFLE_SEED = 48765;
/** Fixed order in which rooms are booked / released when occupancy changes */
const OCCUPANCY_ORDER_SEED = 91411;
const MAINTENANCE_ROOMS = 6;
const CLEANING_ROOMS = 28;

export const STATUS_LABEL: Record<RoomStatus, string> = {
  occupied: "Occupied · มีผู้เข้าพัก",
  ready: "Ready / vacant · พร้อมขาย",
  cleaning: "Housekeeping · กำลังทำความสะอาด",
  maintenance: "Out of service · ปิดซ่อม",
};

function roomType(index: number, perFloor: number): RoomType {
  if (index === 1 || index === perFloor) return "Suite";
  return perFloor < 28 ? "Premier" : "Deluxe";
}

/** Room slots in floor order: H01-01 … H29-17 */
const SLOTS = GUEST_FLOORS.flatMap((f) =>
  Array.from({ length: f.rooms }, (_, i) => ({
    id: `${f.id}-${pad2(i + 1)}`,
    floor: f.id as Room["floor"],
    index: i + 1,
    type: roomType(i + 1, f.rooms),
  })),
);

export const occupiedFor = (pct: number) => Math.round((TOTAL_KEYS * pct) / 100);

/** Seeded room inventory for an occupancy percentage — identical on every load */
export function generateRooms(pct: number): Room[] {
  const occupied = occupiedFor(pct);
  const remaining = TOTAL_KEYS - occupied;
  const maintenance = Math.min(MAINTENANCE_ROOMS, remaining);
  const cleaning = Math.min(CLEANING_ROOMS, remaining - maintenance);
  const ready = remaining - cleaning - maintenance;
  const statuses = seededShuffle<RoomStatus>(
    [
      ...Array<RoomStatus>(occupied).fill("occupied"),
      ...Array<RoomStatus>(ready).fill("ready"),
      ...Array<RoomStatus>(cleaning).fill("cleaning"),
      ...Array<RoomStatus>(maintenance).fill("maintenance"),
    ],
    SHUFFLE_SEED,
  );
  return SLOTS.map((slot, i) => ({ ...slot, status: statuses[i] }));
}

const ORDER = seededShuffle(
  SLOTS.map((_, i) => i),
  OCCUPANCY_ORDER_SEED,
);
// Rooms that can be sold when occupancy goes up, best first
const BOOKABLE: RoomStatus[] = ["ready", "cleaning", "maintenance"];

/**
 * Move occupancy to `pct` by changing as few rooms as possible: book vacant
 * rooms or release occupied ones in a fixed order. Other manual status edits
 * survive, unlike the prototype which regenerated all 600 rooms (PLAN 7).
 */
export function adjustOccupancy(rooms: readonly Room[], pct: number): Room[] {
  const next = rooms.slice();
  let delta = occupiedFor(pct) - rooms.filter((r) => r.status === "occupied").length;
  if (delta > 0) {
    for (const status of BOOKABLE)
      for (const i of ORDER) {
        if (delta === 0) return next;
        if (next[i].status === status) {
          next[i] = { ...next[i], status: "occupied" };
          delta--;
        }
      }
  } else {
    for (let k = ORDER.length - 1; k >= 0 && delta < 0; k--) {
      const i = ORDER[k];
      if (next[i].status === "occupied") {
        next[i] = { ...next[i], status: "ready" };
        delta++;
      }
    }
  }
  return next;
}
