// 600 simulated rooms laid out on the floor schedule (PLAN 7). The shuffle
// follows the prototype's makeRooms (L347); t0 is 504 occupied / 34 reserved /
// 62 available (84 %). Stay details (guests, check-in / out) are derived from
// the room id, so they never change between loads. No real guest data.
import { pad2 } from "@/lib/format";
import { createLcg, seededShuffle } from "@/lib/random";
import type { Room, RoomStatus, RoomType } from "@/types";
import { GUEST_FLOORS, TOTAL_KEYS } from "./property";

const SHUFFLE_SEED = 48765;
/** Fixed order in which rooms are booked / released when occupancy changes */
const OCCUPANCY_ORDER_SEED = 91411;
/** Booked rooms whose guests arrive later today */
const RESERVED_ROOMS = 34;

export const STATUS_LABEL: Record<RoomStatus, string> = {
  occupied: "Occupied · มีผู้เข้าพัก",
  reserved: "Reserved · จองแล้ว ยังไม่เข้าพัก",
  available: "Available · ว่าง พร้อมขาย",
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
  const reserved = Math.min(RESERVED_ROOMS, remaining);
  const available = remaining - reserved;
  // Fill order keeps the prototype's shuffle: the vacant rooms land where its "ready" rooms were
  const statuses = seededShuffle<RoomStatus>(
    [
      ...Array<RoomStatus>(occupied).fill("occupied"),
      ...Array<RoomStatus>(available).fill("available"),
      ...Array<RoomStatus>(reserved).fill("reserved"),
    ],
    SHUFFLE_SEED,
  );
  return SLOTS.map((slot, i) => ({ ...slot, status: statuses[i] }));
}

const ORDER = seededShuffle(
  SLOTS.map((_, i) => i),
  OCCUPANCY_ORDER_SEED,
);
// Rooms that fill first when occupancy goes up: booked guests arrive, then walk-ins
const BOOKABLE: RoomStatus[] = ["reserved", "available"];

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
        next[i] = { ...next[i], status: "available" };
        delta++;
      }
    }
  }
  return next;
}

// ------------------------------------------------------------------- stays

/** Small stable hash of a room id, so each room keeps its own stay details */
function roomSeed(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface Stay {
  guests: number;
  /** Day offset from today (0 = today, −1 = yesterday) and decimal hour */
  checkIn: { day: number; hour: number };
  checkOut: { day: number; hour: number };
  /** Reserved: the guests have not arrived yet, check-in is the expected arrival */
  expected: boolean;
}

/** Simulated PMS stay of an occupied or reserved room; available rooms have none */
export function roomStay(room: Pick<Room, "id" | "status">): Stay | null {
  if (room.status === "available") return null;
  const next = createLcg(roomSeed(room.id));
  const pick = (n: number) => next() % n;
  const guests = 1 + pick(3);
  const nights = 1 + pick(4);
  if (room.status === "reserved")
    return {
      guests,
      checkIn: { day: 0, hour: 15 + pick(14) / 2 },
      checkOut: { day: nights, hour: 12 },
      expected: true,
    };
  // In house: arrived today (14:00–14:15) or on one of the last three days, leaving tomorrow at the earliest
  const day = -pick(4);
  const hour = day === 0 ? 14 + pick(2) / 4 : 14 + pick(16) / 2;
  return { guests, checkIn: { day, hour }, checkOut: { day: Math.max(1, day + nights), hour: 12 }, expected: false };
}

/** "วันนี้ 15:30" · "เมื่อวาน 18:00" · "อีก 2 วัน 12:00" */
export function stayDayLabel({ day, hour }: { day: number; hour: number }) {
  const h = `${pad2(Math.floor(hour))}:${pad2(Math.round((hour % 1) * 60))}`;
  const d =
    day === 0
      ? "วันนี้"
      : day === -1
        ? "เมื่อวาน"
        : day === 1
          ? "พรุ่งนี้"
          : day < 0
            ? `${-day} วันก่อน`
            : `อีก ${day} วัน`;
  return `${d} ${h}`;
}

/** Guests in the room right now (seeded); when they are out the room sets back */
export function guestPresent(room: Pick<Room, "id" | "status">, time: number) {
  if (room.status !== "occupied") return false;
  // Most guests are out in the middle of the day and back in the evening
  const share = time >= 18 || time < 9 ? 0.85 : 0.4;
  return (roomSeed(room.id) % 100) / 100 < share;
}

// ------------------------------------------------------------------- energy

/** Pre-cooling a reserved room before its guests arrive (kW) */
export const PRECOOL_KW = 0.6;
/** Vacant room on standby: minibar, fan coil on eco, corridor share (kW) */
export const STANDBY_KW = 0.15;

const roomWeight = (r: Pick<Room, "id">) => 0.8 + (roomSeed(r.id) % 41) / 100;
const powerCache = new WeakMap<readonly Room[], Map<number, Map<string, number>>>();

/**
 * Electric load of every room (kW). Reserved and available rooms draw fixed
 * pre-cool / standby loads; occupied rooms share the rest of the hotel load by
 * a seeded weight, so the 600 rooms add up exactly to `hotelKw`.
 */
export function roomPowers(rooms: readonly Room[], hotelKw: number): Map<string, number> {
  let byKw = powerCache.get(rooms);
  if (!byKw) powerCache.set(rooms, (byKw = new Map()));
  const cached = byKw.get(hotelKw);
  if (cached) return cached;

  let fixed = 0;
  let weights = 0;
  for (const r of rooms) {
    if (r.status === "occupied") weights += roomWeight(r);
    else fixed += r.status === "reserved" ? PRECOOL_KW : STANDBY_KW;
  }
  const perWeight = weights ? Math.max(0, hotelKw - fixed) / weights : 0;
  const map = new Map<string, number>();
  for (const r of rooms)
    map.set(
      r.id,
      r.status === "occupied" ? roomWeight(r) * perWeight : r.status === "reserved" ? PRECOOL_KW : STANDBY_KW,
    );
  if (byKw.size > 8) byKw.clear();
  byKw.set(hotelKw, map);
  return map;
}

const bump = (t: number, at: number, w: number) => Math.exp(-((t - at) ** 2) / (2 * w * w));

/** Shape of an occupied room's load over the day: evening and early-morning peaks, low at midday */
function occupiedShape(t: number) {
  return 0.75 + 0.4 * bump(t, 21, 2.5) + 0.2 * bump(t, 7, 1.5) - 0.25 * bump(t, 13, 2.5);
}

/** The room's load for each of the last 12 hours, ending at `kwNow` */
export function roomTrend(room: Pick<Room, "status">, time: number, kwNow: number): number[] {
  const hours = Array.from({ length: 12 }, (_, i) => time - 11 + i);
  if (room.status === "occupied") return hours.map((t) => (kwNow * occupiedShape(t)) / occupiedShape(time));
  // Reserved rooms started pre-cooling two hours ago; standby before that
  if (room.status === "reserved") return hours.map((t) => (time - t < 2 ? kwNow : STANDBY_KW));
  return hours.map(() => kwNow);
}

/** Room control state the GRMS would report */
export function roomControl(room: Pick<Room, "id" | "status">, time: number, setpoint: number) {
  if (room.status === "reserved") return { hvac: `Pre-cool · ${setpoint + 1} °C`, lights: "Off", present: false };
  if (room.status === "available") return { hvac: "Eco · 27 °C", lights: "Off", present: false };
  const present = guestPresent(room, time);
  return present
    ? { hvac: `Cooling · ${setpoint} °C`, lights: "On", present }
    : { hvac: "Setback · 26 °C (keycard out)", lights: "Off", present };
}
