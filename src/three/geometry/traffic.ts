// Ambient life around the site: traffic lanes, signals and walking routes.
// Pure data and timing — three/AmbientLife.tsx moves instanced vehicles and
// people along these every frame.
import { createLcg } from "@/lib/random";
import { CAR_COLORS, GROUND_Y, X_ROADS, Z_ROADS } from "./city";
import { LOBBY_DOORS } from "./interiors";
import type { RGBA } from "./builder";

/** Seeded 0–1 random numbers (createLcg returns 32-bit integers) */
export const random = (seed: number) => {
  const next = createLcg(seed);
  return () => next() / 2 ** 32;
};

/** Roads with traffic reach this far from the site centre; beyond it the fog covers the lane ends */
export const TRAFFIC_RADIUS = 440;
/** One vehicle per this many metres of lane, on average */
const SPACING = 58;

/** Road surface height: the avenue runs over the site plinth (−0.08 m), the city streets sit at GROUND_Y */
export function roadY(x: number, z: number) {
  if (z < 39 || z > 69) return GROUND_Y;
  const t = Math.min(1, Math.max(0, (Math.abs(x) - 106) / 8));
  return -0.08 + (GROUND_Y + 0.08) * t;
}

// ------------------------------------------------------------------ vehicles

export type VehicleKind = "sedan" | "hatch" | "suv" | "pickup" | "van" | "bus" | "tuktuk" | "motorbike";

/** Length (m) of each vehicle, for queueing */
export const VEHICLE_LENGTH: Record<VehicleKind, number> = {
  sedan: 4.7,
  hatch: 4.0,
  suv: 4.8,
  pickup: 5.3,
  van: 5.2,
  bus: 11.5,
  tuktuk: 2.9,
  motorbike: 1.9,
};

/** A Bangkok-ish traffic mix: pickups, motorbikes and the odd tuk-tuk and bus */
const MIX: [VehicleKind, number][] = [
  ["sedan", 0.29],
  ["hatch", 0.13],
  ["suv", 0.13],
  ["pickup", 0.15],
  ["van", 0.07],
  ["bus", 0.04],
  ["tuktuk", 0.05],
  ["motorbike", 0.14],
];
const BUS_COLORS: RGBA[] = [
  [0.2, 0.42, 0.66, 1],
  [0.86, 0.86, 0.84, 1],
];
const TUKTUK_COLORS: RGBA[] = [
  [0.16, 0.42, 0.55, 1],
  [0.78, 0.55, 0.18, 1],
];

export interface Vehicle {
  kind: VehicleKind;
  /** Start position along the lane, 0…2·TRAFFIC_RADIUS */
  offset: number;
  color: RGBA;
}

export interface Lane {
  /** Vehicles move along x (east–west road) or z (north–south road) */
  axis: "x" | "z";
  /** The other coordinate: lane centre line */
  at: number;
  /** +1 or −1 along the axis */
  dir: 1 | -1;
  /** Cruising speed, m/s */
  speed: number;
  vehicles: Vehicle[];
  /** Where vehicles have to stop: cross-street centres (and the avenue crosswalk) with their half widths */
  stops: { at: number; half: number; signal: "x" | "z" | "crosswalk" }[];
}

/** The zebra crossing over the avenue in front of the site (site.ts): x −39…−29.5, kerb to kerb (z 39…69) */
export const CROSSWALK = { x: -34.25, half: 4.75, z0: 39, z1: 69 };

/**
 * Two-way roads, left-hand traffic as in Thailand: driving +x keeps to −z,
 * driving +z keeps to +x. The 30 m avenue in front of the site has two lanes
 * each way.
 */
export function trafficLanes(): Lane[] {
  const rand = random(51207);
  const span = TRAFFIC_RADIUS * 2;
  const lanes: Lane[] = [];
  const pick = (): VehicleKind => {
    let r = rand();
    for (const [k, p] of MIX) if ((r -= p) <= 0) return k;
    return "sedan";
  };
  const add = (axis: Lane["axis"], at: number, dir: Lane["dir"], stops: Lane["stops"]) => {
    const n = Math.round(span / SPACING);
    const vehicles = Array.from({ length: n }, (_, i) => {
      const kind = pick();
      const palette = kind === "bus" ? BUS_COLORS : kind === "tuktuk" ? TUKTUK_COLORS : CAR_COLORS;
      return {
        kind,
        offset: (i / n) * span + rand() * SPACING * 0.3,
        color: palette[Math.floor(rand() * palette.length)],
      };
    });
    lanes.push({ axis, at, dir, speed: 9 + rand() * 4, vehicles, stops });
  };

  const zStops = Z_ROADS.filter((r) => Math.abs(r.z) < TRAFFIC_RADIUS).map((r) => ({
    at: r.z,
    half: r.w / 2,
    signal: "z" as const,
  }));
  const xStops = X_ROADS.filter((x) => Math.abs(x) < TRAFFIC_RADIUS).map((x) => ({
    at: x,
    half: 7,
    signal: "x" as const,
  }));
  for (const x of X_ROADS)
    if (Math.abs(x) < TRAFFIC_RADIUS) {
      add("z", x + 3.5, 1, zStops);
      add("z", x - 3.5, -1, zStops);
    }
  for (const { z, w } of Z_ROADS)
    if (Math.abs(z) < TRAFFIC_RADIUS) {
      const avenue = w > 20;
      const stops = avenue
        ? [...xStops, { at: CROSSWALK.x, half: CROSSWALK.half, signal: "crosswalk" as const }]
        : xStops;
      for (const o of avenue ? [4, 10.5] : [3.5]) {
        add("x", z - o, 1, stops);
        add("x", z + o, -1, stops);
      }
    }
  return lanes;
}

// ------------------------------------------------------------------- signals

/** Signal cycle (s): east–west green 0–12, amber to 14, north–south green 15–27, amber to 29, all red to 30 */
export const SIGNAL_CYCLE = 30;
export type Light = "green" | "amber" | "red";

/** Light shown to traffic moving along `axis` */
export function signalFor(axis: "x" | "z", t: number): Light {
  const c = ((t % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  if (axis === "x") return c < 12 ? "green" : c < 14 ? "amber" : "red";
  return c >= 15 && c < 27 ? "green" : c >= 27 && c < 29 ? "amber" : "red";
}

/**
 * Crosswalk cycle (s): the avenue holds for the first 26 s while people cross
 * (they start within 2 s and take under 24 s), then runs for 49 s — short
 * enough holds that the queue in front of the hotel clears between them.
 */
export const CROSSWALK_CYCLE = 75;
export const CROSSWALK_HOLD = 26;
export const crosswalkOpen = (t: number) =>
  ((t % CROSSWALK_CYCLE) + CROSSWALK_CYCLE) % CROSSWALK_CYCLE < CROSSWALK_HOLD;

/** Traffic-light heads near the site: one per approach at each corner */
export function signalHeads() {
  const heads: { x: number; z: number; axis: "x" | "z"; yaw: number }[] = [];
  for (const x of X_ROADS)
    for (const { z, w } of Z_ROADS) {
      if (Math.abs(x) > 380 || Math.abs(z) > 400) continue;
      const hx = 7 + 1.5;
      const hz = w / 2 + 1.5;
      // Facing traffic arriving along x (from −x and +x) and along z
      heads.push({ x: x - hx, z: z - hz, axis: "x", yaw: -Math.PI / 2 });
      heads.push({ x: x + hx, z: z + hz, axis: "x", yaw: Math.PI / 2 });
      heads.push({ x: x + hx, z: z - hz, axis: "z", yaw: Math.PI });
      heads.push({ x: x - hx, z: z + hz, axis: "z", yaw: 0 });
    }
  return heads;
}

// -------------------------------------------------------------------- people

export type Vec3 = [number, number, number];

export interface Person {
  /** Walking route; one point = standing still */
  route: Vec3[];
  /** Metres per second */
  speed: number;
  /** 0–1 start phase along the route */
  phase: number;
  /** Seconds standing at the far end before walking back (a trip there and back) */
  pause: number;
  /** Waits for the crosswalk and crosses only while it is open */
  crossing?: { delay: number };
  /** Facing direction for people standing still */
  yaw?: number;
  height: number;
  shirt: RGBA;
  trousers: RGBA;
  skin: RGBA;
  hair: RGBA;
  bag?: RGBA;
}

/** Plaza top (site.ts) and skywalk deck top — where people walk */
const PLAZA_Y = 0.13;
const SKYWALK_Y = 9.53;
/** Sidewalks on both sides of the avenue, level with the plaza (site.ts) */
const SIDEWALK_Y = 0.13;
/** Arrival hall doors under the canopy (exterior.ts): podium front at z 24.5, canopy x −27…3 */
const DOOR_Z = 25.2;
/** Just inside the G street front (z 24.45), on the lobby floor */
const LOBBY_Z = 23.2;
/** Lobby floor finish on G (interiors.ts) — where people stand and walk inside */
export const LOBBY_FLOOR_Y = 0.555;

const SHIRTS: RGBA[] = [
  [0.86, 0.86, 0.84, 1],
  [0.2, 0.27, 0.4, 1],
  [0.62, 0.22, 0.22, 1],
  [0.15, 0.16, 0.18, 1],
  [0.38, 0.52, 0.44, 1],
  [0.85, 0.7, 0.38, 1],
  [0.5, 0.62, 0.78, 1],
  [0.78, 0.48, 0.55, 1],
];
const TROUSERS: RGBA[] = [
  [0.16, 0.18, 0.24, 1],
  [0.27, 0.32, 0.42, 1],
  [0.12, 0.12, 0.13, 1],
  [0.66, 0.6, 0.5, 1],
  [0.42, 0.42, 0.44, 1],
];
const SKINS: RGBA[] = [
  [0.86, 0.68, 0.53, 1],
  [0.76, 0.57, 0.42, 1],
  [0.62, 0.44, 0.32, 1],
  [0.92, 0.76, 0.64, 1],
];
const HAIR: RGBA[] = [
  [0.07, 0.06, 0.06, 1],
  [0.14, 0.1, 0.08, 1],
  [0.32, 0.24, 0.17, 1],
  [0.6, 0.6, 0.6, 1],
];
const BAGS: RGBA[] = [
  [0.9, 0.9, 0.88, 1],
  [0.66, 0.2, 0.24, 1],
  [0.86, 0.72, 0.36, 1],
  [0.24, 0.42, 0.56, 1],
];

/**
 * People walking in and out of the arrival hall from both ends of the plaza,
 * strolling past, crossing the avenue at the zebra, crossing the skywalk, and
 * a few standing in pairs.
 */
/** Seeded looks: height, clothes, skin, hair and sometimes a bag (`bag`: chance of one) */
export function dressed(rand: () => number, bag = 0.3) {
  const one = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  return {
    height: 0.9 + rand() * 0.18,
    shirt: one(SHIRTS),
    trousers: one(TROUSERS),
    skin: one(SKINS),
    hair: one(HAIR),
    bag: rand() < bag ? one(BAGS) : undefined,
  };
}

export function people(): Person[] {
  const rand = random(80431);
  const list: Person[] = [];
  const person = (route: Vec3[], extra: Partial<Person> = {}) =>
    list.push({
      route,
      speed: 1.15 + rand() * 0.45,
      phase: rand(),
      pause: 2 + rand() * 6,
      ...dressed(rand),
      ...extra,
    });

  // To and from the arrival doors: from either end of the plaza, through the
  // canopy and a door, one step into the lobby (its own crowd is in lobbyLife)
  for (let i = 0; i < 28; i++) {
    const side = i % 2 ? 1 : -1;
    const door = LOBBY_DOORS[i % LOBBY_DOORS.length];
    const doorX = (door.x0 + door.x1) / 2 + (rand() - 0.5) * (door.x1 - door.x0 - 1.4);
    person([
      [side * (56 + rand() * 4), PLAZA_Y, 31 + rand() * 4],
      [doorX + side * (6 + rand() * 10), PLAZA_Y, 29 + rand() * 4],
      [doorX, PLAZA_Y, DOOR_Z + 1],
      [doorX, LOBBY_FLOOR_Y, LOBBY_Z],
    ]);
  }
  // Passers-by along the plaza edge, end to end of the site
  for (let i = 0; i < 12; i++) {
    const z = 34 + rand() * 2;
    const route: Vec3[] = [
      [-104, SIDEWALK_Y, z + 3],
      [-60, PLAZA_Y, z],
      [60, PLAZA_Y, z],
      [104, SIDEWALK_Y, z + 3],
    ];
    person(i % 2 ? route : route.reverse());
  }
  // Across the avenue at the zebra, only while it is open
  for (let i = 0; i < 10; i++) {
    const x = CROSSWALK.x + (rand() - 0.5) * 7;
    const route: Vec3[] = [
      [x, SIDEWALK_Y, CROSSWALK.z0 - 0.4 - rand() * 1.2],
      [x, -0.08, CROSSWALK.z0 + 0.6],
      [x, -0.08, CROSSWALK.z1 - 0.6],
      [x, SIDEWALK_Y, CROSSWALK.z1 + 0.4 + rand() * 1.2],
    ];
    person(i % 2 ? route : route.reverse(), { crossing: { delay: rand() * 2 }, speed: 1.45 + rand() * 0.3 });
  }
  // Skywalk: inside the station (x −126) ↔ inside the podium (x −40)
  for (let i = 0; i < 14; i++) {
    const z = 11.4 + rand() * 3.2;
    const route: Vec3[] = [
      [-126, SKYWALK_Y, z],
      [-40, SKYWALK_Y, z],
    ];
    person(i % 2 ? route : route.reverse());
  }
  // Standing in pairs, facing each other
  for (const [x, z] of [
    [-34, 31],
    [12, 30],
    [26, 33],
    [-48, 28],
  ] as const) {
    person([[x - 0.45, PLAZA_Y, z]], { yaw: Math.PI / 2 });
    person([[x + 0.45, PLAZA_Y, z]], { yaw: -Math.PI / 2 });
  }
  return list;
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[2] - a[2]);
export const routeLength = (route: Vec3[]) => route.slice(1).reduce((n, p, i) => n + dist(route[i], p), 0);

/** Point and heading `d` metres along a route */
export function along(route: Vec3[], d: number): { p: Vec3; yaw: number } {
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const l = dist(a, b);
    if (d <= l || i === route.length - 1) {
      const k = l > 0 ? Math.min(1, Math.max(0, d / l)) : 0;
      return {
        p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
        yaw: Math.atan2(b[0] - a[0], b[2] - a[2]),
      };
    }
    d -= l;
  }
  return { p: route[0], yaw: 0 };
}

/**
 * Where a person is at time t: distance along the route (0…length), walking
 * or not, and whether they're on the return leg. Out, pause, back, pause.
 * Crossers wait at the kerb until the crosswalk opens.
 */
export function personAt(p: Person, length: number, t: number): { d: number; walking: boolean; back: boolean } {
  if (length === 0) return { d: 0, walking: false, back: false };
  if (p.crossing) {
    // One crossing per crosswalk cycle, alternating direction
    const c = ((t % (CROSSWALK_CYCLE * 2)) + CROSSWALK_CYCLE * 2) % (CROSSWALK_CYCLE * 2);
    const back = c >= CROSSWALK_CYCLE;
    const local = (back ? c - CROSSWALK_CYCLE : c) - p.crossing.delay;
    const d = Math.min(length, Math.max(0, local * p.speed));
    const walking = local > 0 && d < length;
    return { d: back ? length - d : d, walking, back };
  }
  const leg = length / p.speed;
  const cycle = 2 * (leg + p.pause);
  const c = (((t + p.phase * cycle) % cycle) + cycle) % cycle;
  if (c < leg) return { d: c * p.speed, walking: true, back: false };
  if (c < leg + p.pause) return { d: length, walking: false, back: false };
  if (c < 2 * leg + p.pause) return { d: length - (c - leg - p.pause) * p.speed, walking: true, back: true };
  return { d: 0, walking: false, back: true };
}
