// People on the Lobby floor (G) for the Public Area scene: guests at the
// reception counter and in its queue, waiting at the lifts and by the doors
// with luggage, walking between the doors, reception, the lifts and the retail
// link, and standing together in the lounge. One figure stands for
// PEOPLE_PER_FIGURE people of the zone count (data/publicZones.ts), so a busier
// zone shows more figures; figure k of a zone is always the same person.
import type { PublicZoneId } from "@/data/publicZones";
import { LOBBY_DOORS } from "./interiors";
import { dressed, LOBBY_FLOOR_Y, type Person, random, type Vec3 } from "./traffic";

/** People in the zone count per figure drawn */
export const PEOPLE_PER_FIGURE = 4;
/** No zone draws more than this many figures, even when crowded */
const MAX_FIGURES = 40;

const P = (x: number, z: number): Vec3 => [x, LOBBY_FLOOR_Y, z];
/** Facing directions (yaw 0 looks towards +z, the street) */
const TO_STREET = 0;
const TO_BACK = Math.PI;

const DOORS = LOBBY_DOORS.map((d) => (d.x0 + d.x1) / 2);
/** Lift doors on G (interiors.ts podiumG): four cars at z −3, opening towards +z */
const LIFTS = [4.5, 7.5, 10.5, 13.5];

type Figure = { route: Vec3[]; yaw?: number; speed?: number; pause?: number; bag?: number };
type Make = (k: number, r: () => number) => Figure;

/** Random offset within ±s/2 */
const jitter = (r: () => number, s: number) => (r() - 0.5) * s;

const ZONES: Record<PublicZoneId, Make> = {
  // Waiting by the doors with luggage, or walking in through a door
  entrance: (k, r) => {
    const door = DOORS[k % DOORS.length];
    if (k % 3 === 0) return { route: [P(door + jitter(r, 5), 21.4 + r() * 1.6)], yaw: r() * Math.PI * 2, bag: 0.9 };
    return {
      route: [P(door + jitter(r, 2), 23.6), P(door + jitter(r, 4), 20.8 + r() * 0.8)],
      speed: 1.0 + r() * 0.3,
      pause: 1 + r() * 3,
      bag: 0.5,
    };
  },
  // Pairs talking beside the lounge seating, and people crossing the lounge
  lounge: (k, r) => {
    const spots: [number, number][] = [
      [-31, 15],
      [-20.5, 15],
      [-17.5, 19.6],
      [-9.8, 19.2],
      [-28.5, 19.5],
      [-36, 15.2],
    ];
    if (k % 2 === 0) {
      // Figures 0 and 2 of every four make a pair facing each other
      const pair = Math.floor(k / 4);
      const [x, z] = spots[pair % spots.length];
      const row = Math.floor(pair / spots.length);
      const side = k % 4 === 0 ? -1 : 1;
      return { route: [P(x + side * 0.45 + row * 1.4, z - row * 0.9)], yaw: (-side * Math.PI) / 2 };
    }
    const z = 14.6 + r() * 4.8;
    const route = [P(-36 + r() * 3, z), P(-19 + jitter(r, 4), z + jitter(r, 1.5)), P(-4.5 - r() * 2, 14.8 + r() * 4)];
    return { route: k % 4 === 1 ? route : route.reverse(), speed: 0.9 + r() * 0.35, pause: 2 + r() * 5 };
  },
  // Staff behind the counter, guests at it, the queue between the posts, then people leaving for the lifts
  reception: (k, r) => {
    const fixed: Figure[] = [
      { route: [P(-28, 10.6)], yaw: TO_STREET },
      { route: [P(-25, 10.6)], yaw: TO_STREET },
      { route: [P(-22, 10.6)], yaw: TO_STREET },
      { route: [P(-25, 12.75)], yaw: TO_BACK, bag: 0.6 },
      { route: [P(-28.6, 12.75)], yaw: TO_BACK, bag: 0.6 },
      { route: [P(-21.4, 12.75)], yaw: TO_BACK, bag: 0.6 },
      { route: [P(-25, 13.8)], yaw: TO_BACK, bag: 0.7 },
      { route: [P(-25.1, 14.7)], yaw: TO_BACK, bag: 0.7 },
      { route: [P(-24.9, 15.6)], yaw: TO_BACK, bag: 0.7 },
      { route: [P(-25, 16.5)], yaw: TO_BACK, bag: 0.7 },
    ];
    if (k < fixed.length) return fixed[k];
    if (k % 2 === 0) return { route: [P(-31 + r() * 2, 12.8 + r())], yaw: TO_BACK + jitter(r, 1), bag: 0.6 };
    return {
      route: [P(-20.5, 13.2), P(-12, 10.2), P(-4.5, 7.6), P(1.5, 4.2), P(LIFTS[k % 4], 1.6)],
      speed: 1.05 + r() * 0.3,
      pause: 3 + r() * 4,
      bag: 0.6,
    };
  },
  // Rows waiting in front of the four lifts, and people walking out of the lift hall
  liftHall: (k, r) => {
    if (k % 4 !== 3) {
      const slot = k - Math.floor(k / 4);
      const lift = LIFTS[slot % 4];
      const row = Math.floor(slot / 4);
      return { route: [P(lift + jitter(r, 1.2), -1.2 + row * 0.85)], yaw: TO_BACK + jitter(r, 0.6), bag: 0.25 };
    }
    return {
      route: [P(LIFTS[k % 4], -1.4), P(5 + r() * 4, 2.2), P(1.5, 4.4), P(-4.5, 7.6), P(-11 - r() * 4, 10.5)],
      speed: 1.1 + r() * 0.3,
      pause: 2 + r() * 4,
    };
  },
  // Walking between the lobby and the shops, some stopping at a shop front
  retailLink: (k, r) => {
    if (k % 4 === 3) return { route: [P(0.3, 10 + r() * 10)], yaw: Math.PI / 2 };
    const x = -1.7 + r() * 2;
    const route = [P(x, 5.4), P(x + jitter(r, 0.6), 21.8), P(DOORS[2], 23.4)];
    return { route: k % 2 ? route : route.reverse(), speed: 1.05 + r() * 0.35, pause: 1 + r() * 4, bag: 0.45 };
  },
};

const SEED: Record<PublicZoneId, number> = {
  entrance: 101,
  lounge: 202,
  reception: 303,
  liftHall: 404,
  retailLink: 505,
};

/** Figures for each zone's head count (`counts`: people per zone) */
export function lobbyCrowd(counts: Partial<Record<PublicZoneId, number>>): Person[] {
  const list: Person[] = [];
  for (const id of Object.keys(ZONES) as PublicZoneId[]) {
    const n = Math.min(MAX_FIGURES, Math.round((counts[id] ?? 0) / PEOPLE_PER_FIGURE));
    for (let k = 0; k < n; k++) {
      const r = random(SEED[id] * 1009 + k * 7919);
      const f = ZONES[id](k, r);
      list.push({
        route: f.route,
        speed: f.speed ?? 1.1,
        phase: r(),
        pause: f.pause ?? 3,
        yaw: f.yaw,
        ...dressed(r, f.bag ?? 0.2),
      });
    }
  }
  return list;
}
