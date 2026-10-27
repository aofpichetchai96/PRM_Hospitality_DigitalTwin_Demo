// Floor interiors for the schematic building (X-ray / Slice / Explode): fitted
// guest rooms, the tower core with its plant rooms, sky-court amenities, the
// roof plant and the podium programme (G lobby, L1 retail, L2 F&B, L3 event
// hall, L4 co-working). Everything is cut at a ~2.9 m section height like an
// architectural section, so a sliced floor reads from above. All parts are
// boxes / cylinders on the GeometryBuilder, i.e. still one mesh per material.
import type { FloorSpec, Room, RoomStatus } from "@/types";
import type { MaterialKey } from "../materials";
import type { GeometryBuilder, RGBA } from "./builder";

type G = GeometryBuilder;
/** "full" = every fitting; "lite" = room blocks only (exploded stack of 25 floors) */
export type Detail = "full" | "lite";
/** Facing direction: +z, +x, −z, −x */
type Dir = 0 | 1 | 2 | 3;

/** Section height: walls, shafts and stairs stop here so the plan reads from above */
const CUT = 2.9;

export const ROOM_COLOR: Record<RoomStatus, RGBA> = {
  occupied: [0.44, 0.7, 0.62, 1],
  ready: [0.47, 0.63, 0.77, 1],
  cleaning: [0.79, 0.68, 0.43, 1],
  maintenance: [0.81, 0.45, 0.45, 1],
};
/** Door status light beside every room door (unlit, so it reads at dusk too) */
const STATUS_LIGHT: Record<RoomStatus, RGBA> = {
  occupied: [0.4, 0.92, 0.72, 1],
  ready: [0.45, 0.78, 1, 1],
  cleaning: [1, 0.8, 0.38, 1],
  maintenance: [1, 0.42, 0.42, 1],
};

const C = {
  wall: [0.9, 0.9, 0.87, 1],
  concrete: [0.64, 0.66, 0.66, 1],
  coreFloor: [0.74, 0.75, 0.74, 1],
  carpet: [0.75, 0.68, 0.57, 1],
  corridor: [0.37, 0.33, 0.39, 1],
  runner: [0.55, 0.43, 0.35, 1],
  lobbyFloor: [0.87, 0.83, 0.75, 1],
  mallFloor: [0.84, 0.85, 0.84, 1],
  tile: [0.85, 0.87, 0.88, 1],
  white: [0.97, 0.97, 0.95, 1],
  linen: [0.98, 0.96, 0.91, 1],
  headboard: [0.4, 0.34, 0.31, 1],
  curtain: [0.86, 0.82, 0.74, 1],
  fabric: [0.42, 0.47, 0.53, 1],
  fabricWarm: [0.73, 0.56, 0.42, 1],
  fabricGreen: [0.42, 0.56, 0.47, 1],
  woodLight: [0.68, 0.52, 0.36, 1],
  woodDark: [0.36, 0.26, 0.19, 1],
  stoneDark: [0.3, 0.31, 0.33, 1],
  dark: [0.14, 0.15, 0.17, 1],
  panelGrey: [0.5, 0.53, 0.56, 1],
  steel: [0.78, 0.8, 0.82, 1],
  lift: [0.55, 0.58, 0.63, 1],
  fireDoor: [0.46, 0.49, 0.52, 1],
  fire: [0.82, 0.17, 0.14, 1],
  brass: [0.8, 0.64, 0.38, 1],
  orange: [0.96, 0.55, 0.16, 1],
  yellow: [0.96, 0.8, 0.25, 1],
  screen: [0.36, 0.66, 0.92, 1],
  videoWall: [0.24, 0.5, 0.7, 1],
  water: [0.3, 0.64, 0.8, 1],
  pipeSupply: [0.28, 0.55, 0.86, 1],
  pipeReturn: [0.55, 0.72, 0.9, 1],
  tank: [0.7, 0.76, 0.8, 1],
  solar: [0.12, 0.19, 0.32, 1],
  rubber: [0.2, 0.26, 0.24, 1],
  cardboard: [0.72, 0.56, 0.38, 1],
} satisfies Record<string, RGBA>;

/** Merchandise / book spines / mats — picked with the builder's seeded rng */
const GOODS: RGBA[] = [
  [0.82, 0.35, 0.3, 1],
  [0.3, 0.52, 0.72, 1],
  [0.9, 0.78, 0.42, 1],
  [0.4, 0.62, 0.45, 1],
  [0.92, 0.9, 0.86, 1],
  [0.55, 0.4, 0.62, 1],
  [0.24, 0.26, 0.3, 1],
];
const BRAND: RGBA[] = [
  [0.85, 0.42, 0.32, 1],
  [0.24, 0.46, 0.62, 1],
  [0.86, 0.72, 0.38, 1],
  [0.32, 0.56, 0.48, 1],
  [0.62, 0.38, 0.52, 1],
  [0.2, 0.22, 0.26, 1],
];
const pick = <T>(g: G, list: readonly T[]) => list[Math.floor(g.rand() * list.length) % list.length];

// ------------------------------------------------------------------ helpers

/** Box standing on `y0` */
function block(
  g: G,
  x: number,
  y0: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: MaterialKey = "stone",
  col?: RGBA,
) {
  g.box(x, y0 + h / 2, z, w, h, d, mat, col);
}

/**
 * Local frame for oriented furniture: u = lateral, v = forward (the way the
 * item faces). Boxes stay axis-aligned, so only the four cardinal directions.
 */
function frame(g: G, ox: number, y: number, oz: number, dir: Dir) {
  const swap = dir % 2 === 1;
  const at = (u: number, v: number): [number, number] =>
    dir === 0 ? [u, v] : dir === 1 ? [v, -u] : dir === 2 ? [-u, -v] : [-v, u];
  return {
    part(u: number, v: number, y0: number, w: number, h: number, d: number, mat: MaterialKey = "stone", col?: RGBA) {
      const [dx, dz] = at(u, v);
      g.box(ox + dx, y + y0 + h / 2, oz + dz, swap ? d : w, h, swap ? w : d, mat, col);
    },
    cyl(u: number, v: number, y0: number, r: number, h: number, mat: MaterialKey = "metal", col?: RGBA, n = 8) {
      const [dx, dz] = at(u, v);
      g.cylinder(ox + dx, y + y0, oz + dz, r, h, mat, col, n);
    },
    /** World position of a local point */
    world(u: number, v: number): [number, number] {
      const [dx, dz] = at(u, v);
      return [ox + dx, oz + dz];
    },
    /** World direction of a local facing direction */
    turn(local: Dir): Dir {
      return ((dir + local) % 4) as Dir;
    },
  };
}
type Frame = ReturnType<typeof frame>;

/** Glass panel visible from both sides (transparent materials render front faces only) */
function pane(
  g: G,
  a: [number, number, number],
  b: [number, number, number],
  h: number,
  mat: MaterialKey = "balconyGlass",
  col?: RGBA,
) {
  const a2: [number, number, number] = [a[0], a[1] + h, a[2]];
  const b2: [number, number, number] = [b[0], b[1] + h, b[2]];
  g.quad(a, b, b2, a2, mat, col);
  g.quad(b, a, a2, b2, mat, col);
}

// ---------------------------------------------------------------- furniture

function chair(g: G, x: number, y: number, z: number, dir: Dir, col: RGBA = C.fabric) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, 0.46, 0.46, 0.46, "stone", col);
  f.part(0, -0.2, 0.46, 0.46, 0.42, 0.07, "stone", col);
}

function table(g: G, x: number, y: number, z: number, w: number, d: number, col: RGBA = C.woodLight, h = 0.74) {
  block(g, x, y + h - 0.05, z, w, 0.05, d, "wood", col);
  block(g, x, y, z, Math.min(0.5, w * 0.3), h - 0.05, Math.min(0.5, d * 0.3), "metal", C.dark);
}

function roundTable(g: G, x: number, y: number, z: number, r: number, h = 0.74, col: RGBA = C.woodLight) {
  g.cylinder(x, y + h - 0.05, z, r, 0.05, "wood", col, 14);
  g.cylinder(x, y, z, 0.07, h - 0.05, "metal", C.dark, 6);
}

/** Square table with a chair on each side */
function diningSet(g: G, x: number, y: number, z: number, col: RGBA = C.fabricWarm) {
  table(g, x, y, z, 0.9, 0.9);
  chair(g, x, y, z - 0.68, 0, col);
  chair(g, x, y, z + 0.68, 2, col);
  chair(g, x - 0.68, y, z, 1, col);
  chair(g, x + 0.68, y, z, 3, col);
}

/** Round banquet table with eight chairs facing the centre */
function banquet(g: G, x: number, y: number, z: number) {
  roundTable(g, x, y, z, 0.9, 0.74, C.linen);
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8;
    const c = Math.cos(a),
      s = Math.sin(a);
    const dir: Dir = Math.abs(c) > Math.abs(s) ? (c > 0 ? 3 : 1) : s > 0 ? 2 : 0;
    chair(g, x + c * 1.35, y, z + s * 1.35, dir, C.fabricWarm);
  }
}

function sofa(g: G, x: number, y: number, z: number, dir: Dir, len: number, col: RGBA = C.fabric) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, len, 0.42, 0.85, "stone", col);
  f.part(0, -0.33, 0.42, len, 0.4, 0.2, "stone", col);
  for (const s of [-1, 1]) f.part(s * (len / 2 - 0.1), 0.05, 0.42, 0.2, 0.2, 0.75, "stone", col);
}

function rug(g: G, x: number, y: number, z: number, w: number, d: number, col: RGBA) {
  block(g, x, y, z, w, 0.02, d, "stone", col);
}

function plant(g: G, x: number, y: number, z: number, s = 1) {
  g.cylinder(x, y, z, 0.3 * s, 0.55 * s, "planter", undefined, 8);
  g.sphere(x, y + 1.0 * s, z, 0.5 * s, 0.6 * s, 0.5 * s, "foliage", undefined, 6, 4);
}

/** Lounge cluster: rug, sofa, two armchairs and a coffee table */
function lounge(g: G, x: number, y: number, z: number, col: RGBA = C.fabric) {
  rug(g, x, y, z, 4.2, 3.4, [0.66, 0.6, 0.52, 1]);
  sofa(g, x, y, z - 1.1, 0, 2.2, col);
  sofa(g, x - 1.65, y, z + 0.2, 1, 0.9, C.fabricWarm);
  sofa(g, x + 1.65, y, z + 0.2, 3, 0.9, C.fabricWarm);
  block(g, x, y, z + 0.2, 1.2, 0.4, 0.7, "wood", C.woodDark);
}

function counter(
  g: G,
  x: number,
  y: number,
  z: number,
  dir: Dir,
  len: number,
  col: RGBA = C.woodDark,
  top: RGBA = C.white,
) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, len, 0.95, 0.65, "wood", col);
  f.part(0, 0.02, 0.95, len + 0.05, 0.05, 0.72, "stone", top);
}

/** Wall shelving with merchandise on three levels */
function shelf(
  g: G,
  x: number,
  y: number,
  z: number,
  dir: Dir,
  len: number,
  h = 2.0,
  col: RGBA = C.woodLight,
  goods?: RGBA,
) {
  const f = frame(g, x, y, z, dir);
  f.part(0, -0.2, 0, len, h, 0.06, "wood", col);
  f.part(0, 0, 0, len, 0.12, 0.42, "wood", col);
  for (const lv of [0.62, 1.12, 1.62].filter((l) => l < h - 0.2)) f.part(0, 0, lv, len, 0.03, 0.42, "wood", col);
  for (const lv of [0.13, 0.66, 1.16].filter((l) => l < h - 0.4))
    f.part(0, 0.02, lv, len - 0.12, 0.3, 0.32, "stone", goods ?? pick(g, GOODS));
}

/** Double-sided store gondola */
function gondola(g: G, x: number, y: number, z: number, alongX: boolean, len: number) {
  const f = frame(g, x, y, z, alongX ? 0 : 1);
  f.part(0, 0, 0, len, 0.12, 0.95, "metal", C.steel);
  f.part(0, 0, 0, len, 1.5, 0.06, "metal", C.steel);
  for (const s of [-1, 1]) {
    for (const lv of [0.55, 1.0]) f.part(0, s * 0.24, lv, len, 0.03, 0.42, "metal", C.steel);
    for (const lv of [0.13, 0.58, 1.03]) f.part(0, s * 0.25, lv, len - 0.1, 0.3, 0.34, "stone", pick(g, GOODS));
  }
}

function clothesRack(g: G, x: number, y: number, z: number, dir: Dir, len: number) {
  const f = frame(g, x, y, z, dir);
  for (const s of [-1, 1]) f.part((s * len) / 2, 0, 0, 0.05, 1.5, 0.05, "metal", C.dark);
  f.part(0, 0, 1.45, len, 0.04, 0.04, "metal", C.dark);
  for (let u = -len / 2 + 0.12; u < len / 2 - 0.05; u += 0.16)
    f.part(u, 0, 0.55, 0.07, 0.85, 0.48, "stone", pick(g, GOODS));
}

function mannequin(g: G, x: number, y: number, z: number) {
  g.cylinder(x, y, z, 0.22, 0.03, "metal", C.dark, 8);
  g.cylinder(x, y, z, 0.03, 0.9, "metal", C.dark, 6);
  block(g, x, y + 0.9, z, 0.42, 0.65, 0.24, "stone", pick(g, GOODS));
  g.sphere(x, y + 1.72, z, 0.12, 0.15, 0.12, "stone", C.white, 6, 4);
}

function treadmill(g: G, x: number, y: number, z: number, dir: Dir) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, 0.8, 0.22, 1.9, "stone", C.dark);
  f.part(0, 0.85, 0.22, 0.8, 1.1, 0.08, "metal", C.steel);
  f.part(0, 0.8, 1.2, 0.5, 0.3, 0.04, "glow", C.screen);
}

function bike(g: G, x: number, y: number, z: number, dir: Dir) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, 0.5, 0.08, 1.1, "stone", C.dark);
  f.part(0, -0.15, 0.08, 0.14, 0.75, 0.6, "stone", C.dark);
  f.part(0, -0.3, 0.83, 0.28, 0.08, 0.32, "stone", C.dark);
  f.part(0, 0.42, 0.08, 0.1, 1.05, 0.1, "metal", C.steel);
  f.part(0, 0.42, 1.13, 0.45, 0.06, 0.12, "metal", C.steel);
}

function weightBench(g: G, x: number, y: number, z: number, dir: Dir) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, 0.32, 0.45, 1.3, "stone", C.dark);
  for (const s of [-1, 1]) f.part(s * 0.6, 0.5, 0, 0.08, 1.5, 0.08, "metal", C.steel);
  f.part(0, 0.5, 1.2, 1.8, 0.05, 0.05, "metal", C.steel);
  for (const s of [-1, 1]) f.cyl(s * 0.78, 0.5, 1.0, 0.22, 0.45, "stone", C.dark, 8);
}

function lounger(g: G, x: number, y: number, z: number, dir: Dir, col: RGBA = C.white) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, 0.7, 0.3, 1.9, "stone", col);
  f.part(0, -0.72, 0.3, 0.7, 0.45, 0.4, "stone", col);
}

function umbrella(g: G, x: number, y: number, z: number) {
  g.cylinder(x, y, z, 0.04, 2.3, "metal", C.dark, 6);
  g.sphere(x, y + 2.35, z, 1.5, 0.26, 1.5, "stone", C.curtain, 8, 3);
}

/** Desk with monitor and chair; `dir` is where the seated person looks */
function workstation(g: G, x: number, y: number, z: number, dir: Dir) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0.71, 1.4, 0.04, 0.7, "wood", C.white);
  for (const s of [-1, 1]) f.part(s * 0.66, 0, 0, 0.05, 0.71, 0.62, "metal", C.dark);
  f.part(0, 0.24, 0.92, 0.6, 0.36, 0.04, "glow", C.screen);
  f.part(0, -0.62, 0, 0.48, 0.46, 0.48, "stone", C.dark);
  f.part(0, -0.84, 0.46, 0.48, 0.5, 0.07, "stone", C.dark);
}

/** Long table with chairs on both sides and a screen at the head */
function boardroom(g: G, x: number, y: number, z: number, alongX: boolean, len: number) {
  const f = frame(g, x, y, z, alongX ? 1 : 0);
  f.part(0, 0, 0.71, 1.3, 0.05, len, "wood", C.woodDark);
  f.part(0, 0, 0, 0.5, 0.71, len - 0.8, "metal", C.dark);
  for (let v = -len / 2 + 0.6; v < len / 2 - 0.3; v += 0.9) {
    const [ax, az] = f.world(-1.05, v);
    const [bx, bz] = f.world(1.05, v);
    chair(g, ax, y, az, f.turn(1), C.dark);
    chair(g, bx, y, bz, f.turn(3), C.dark);
  }
}

// ---------------------------------------------------------- building systems

/** Lift: shaft behind the door face at (x, z), opening towards `dir` */
function lift(g: G, x: number, y: number, z: number, dir: Dir, depth = 2.6) {
  const f = frame(g, x, y, z, dir);
  f.part(0, -depth / 2, 0, 2.4, CUT, depth, "stone", C.lift);
  f.part(0, 0.02, 0, 1.1, 2.15, 0.04, "metal", C.steel);
  f.part(0, 0.03, 2.15, 1.4, 0.12, 0.05, "metal", C.brass);
  f.part(0, 0.05, 2.42, 0.42, 0.08, 0.03, "glow", C.screen);
  f.part(0.85, 0.05, 1.05, 0.09, 0.16, 0.03, "glow", C.screen);
}

/** Fire stair: enclosure, two flights, fire door and exit sign facing `dir` */
function stairCore(g: G, cx: number, y: number, cz: number, w: number, d: number, dir: Dir, detail: Detail = "full") {
  const f = frame(g, cx, y, cz, dir);
  if (detail === "lite") {
    f.part(0, 0, 0, w, CUT, d, "stone", C.concrete);
    return;
  }
  const t = 0.15;
  f.part(0, -d / 2, 0, w, CUT, t, "stone", C.concrete);
  for (const s of [-1, 1]) f.part((s * w) / 2, 0, 0, t, CUT, d, "stone", C.concrete);
  const du = w / 2 - 0.8;
  const left = du - 0.5 + w / 2;
  f.part(-w / 2 + left / 2, d / 2, 0, left, CUT, t, "stone", C.concrete);
  f.part(w / 2 - 0.15, d / 2, 0, 0.3, CUT, t, "stone", C.concrete);
  f.part(du, d / 2, 2.15, 1.0, CUT - 2.15, t, "stone", C.concrete);
  f.part(du, d / 2, 0, 0.95, 2.1, 0.06, "metal", C.fireDoor);
  f.part(du, d / 2 + 0.1, 2.32, 0.36, 0.14, 0.04, "green");
  // Two flights either side of a spine wall, rising to the section height
  const fw = w / 2 - 0.25;
  const run = (d - 2.4) / 10;
  f.part(0, -0.1, 0, 0.12, CUT, d - 2.4, "stone", C.concrete);
  for (let i = 0; i < 10; i++) {
    const v = d / 2 - 1.2 - (i + 0.5) * run;
    f.part(-w / 4, v, 0, fw, Math.min(CUT, (i + 1) * 0.2), run, "stone", C.tile);
    f.part(w / 4, -v, 0, fw, Math.min(CUT, 2.0 + (i + 1) * 0.2), run, "stone", C.tile);
  }
  f.part(0, -d / 2 + 0.6, 0, w - 0.3, 2.0, 1.05, "stone", C.tile);
}

function fireCabinet(g: G, x: number, y: number, z: number, dir: Dir) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0.12, 0.75, 0.75, 0.9, 0.22, "stone", C.fire);
  f.part(0, 0.24, 0.85, 0.6, 0.7, 0.02, "glass");
  f.cyl(0.6, 0.12, 0, 0.09, 0.6, "stone", C.fire, 8);
}

function cctv(g: G, x: number, y: number, z: number, h = 2.75) {
  block(g, x, y + h + 0.05, z, 0.05, 0.2, 0.05, "metal");
  g.sphere(x, y + h, z, 0.15, 0.12, 0.15, "metal", C.dark, 6, 3);
  g.box(x, y + h - 0.1, z, 0.05, 0.05, 0.05, "red");
}

function ahu(g: G, x: number, y: number, z: number, dir: Dir, len = 3.2) {
  const f = frame(g, x, y, z, dir);
  f.part(0, 0, 0, len + 0.1, 0.12, 1.7, "stone", C.concrete);
  f.part(0, 0, 0.12, len, 1.75, 1.6, "metal", C.steel);
  f.part(len / 2 - 0.55, 0.81, 0.4, 0.75, 1.0, 0.03, "stone", C.dark);
  f.part(-len / 4, 0.81, 0.35, len / 3, 1.2, 0.03, "stone", C.panelGrey);
  f.part(-len / 2 + 0.6, 0, 1.87, 0.9, CUT - 1.87, 0.75, "metal", C.steel);
  f.cyl(len / 2 - 0.3, -0.55, 0, 0.09, CUT, "metal", C.pipeSupply);
  f.cyl(len / 2 - 0.6, -0.55, 0, 0.09, CUT, "metal", C.pipeReturn);
}

/** Row of electrical cabinets with status LEDs */
function panels(g: G, x: number, y: number, z: number, dir: Dir, n: number) {
  const f = frame(g, x, y, z, dir);
  for (let i = 0; i < n; i++) {
    const u = (i - (n - 1) / 2) * 0.82;
    f.part(u, 0, 0, 0.78, 2.0, 0.45, "stone", C.panelGrey);
    f.part(u, 0.23, 1.72, 0.5, 0.05, 0.02, "green");
  }
}

function pump(g: G, x: number, y: number, z: number) {
  block(g, x, y, z, 0.9, 0.15, 1.3, "stone", C.concrete);
  g.cylinder(x, y + 0.15, z - 0.25, 0.3, 0.55, "metal", C.pipeSupply, 10);
  block(g, x, y + 0.15, z + 0.35, 0.5, 0.45, 0.55, "metal", C.steel);
}

function coolingTower(g: G, x: number, y: number, z: number) {
  block(g, x, y, z, 5.4, 0.4, 5.4, "stone", C.concrete);
  block(g, x, y + 0.4, z, 5, 3.2, 5, "metal", C.steel);
  for (let i = 0; i < 6; i++)
    for (const s of [-1, 1]) block(g, x, y + 0.7 + i * 0.42, z + s * 2.52, 4.6, 0.12, 0.06, "stone", C.panelGrey);
  g.cylinder(x, y + 3.6, z, 1.9, 0.9, "metal", C.steel, 16);
  g.cylinder(x, y + 4.5, z, 1.7, 0.03, "stone", C.dark, 16);
  g.cylinder(x, y + 4.53, z, 0.3, 0.12, "metal", C.panelGrey, 8);
}

// ------------------------------------------------------------ hotel tower

/** Tower floor plan: core strip on the long axis, a corridor either side, rooms to the facade */
export function guestPlan(spec: FloorSpec) {
  const core = spec.type === "guestNarrow" ? 5 : 6;
  const corridor = 2;
  return { core, corridor, depth: spec.footprint.d / 2 - core / 2 - corridor - 0.3 };
}

export type RoomSlot = { x: number; z: number; front: boolean; cell: number; depth: number; col: number };

type CoreModule = {
  kind: "stair" | "ahu" | "linen" | "lifts" | "service" | "vending" | "elec";
  u0: number;
  u1: number;
};
// Offsets from the floor centre (m). The electrical room holds the chilled-water
// riser at world x 21 / z −6 on every tower floor (layers.ts riserPath).
const GUEST_CORE: CoreModule[] = [
  { kind: "stair", u0: -21.6, u1: -17.6 },
  { kind: "ahu", u0: -17.4, u1: -11.4 },
  { kind: "linen", u0: -11.2, u1: -7.2 },
  { kind: "lifts", u0: -6.4, u1: 6.4 },
  { kind: "service", u0: 6.6, u1: 9.2 },
  { kind: "vending", u0: 9.4, u1: 10.8 },
  { kind: "elec", u0: 11, u1: 17.4 },
  { kind: "stair", u0: 17.6, u1: 21.6 },
];
const NARROW_CORE: CoreModule[] = [
  { kind: "stair", u0: -11.1, u1: -7.6 },
  { kind: "lifts", u0: -7.4, u1: -2 },
  { kind: "service", u0: -1.8, u1: 0.6 },
  { kind: "elec", u0: 0.8, u1: 7.4 },
  { kind: "stair", u0: 7.6, u1: 11.1 },
];
export const RISER = { x: 21, z: -6 };

const LITE_CORE_COLOR: Record<CoreModule["kind"], RGBA> = {
  stair: C.concrete,
  lifts: C.lift,
  ahu: C.panelGrey,
  linen: C.wall,
  service: C.lift,
  vending: C.wall,
  elec: C.panelGrey,
};

/** Walls of a core room: sides at u0 / u1, a door on the `door` side (+1 front, −1 back) */
function coreRoom(g: G, tx: number, y: number, tz: number, cd: number, m: CoreModule, door: 1 | -1) {
  const t = 0.15;
  const w = m.u1 - m.u0;
  const mid = tx + (m.u0 + m.u1) / 2;
  for (const u of [m.u0, m.u1]) block(g, tx + u, y, tz, t, CUT, cd, "stone", C.concrete);
  block(g, mid, y, tz - door * (cd / 2), w, CUT, t, "stone", C.concrete);
  const dz = tz + door * (cd / 2);
  const side = (w - 1.0) / 2;
  for (const s of [-1, 1]) block(g, mid + s * (0.5 + side / 2), y, dz, side, CUT, t, "stone", C.concrete);
  block(g, mid, y, dz, 0.95, 2.1, 0.06, "metal", C.fireDoor);
  block(g, mid, y + 2.1, dz, 1.0, CUT - 2.1, t, "stone", C.concrete);
}

function towerCore(g: G, spec: FloorSpec, y: number, detail: Detail, opts: { roof?: boolean } = {}) {
  const { x: tx, z: tz, w: W } = spec.footprint;
  const cd = guestPlan(spec).core;
  const mods = spec.type === "guestNarrow" ? NARROW_CORE : GUEST_CORE;
  block(g, tx, y, tz, W - 0.8, 0.03, cd, "stone", C.coreFloor);
  for (const m of mods) {
    const w = m.u1 - m.u0;
    const mid = tx + (m.u0 + m.u1) / 2;
    if (opts.roof) {
      // Roof: stair exits and the lift motor room only
      if (m.kind === "stair") stairCore(g, mid, y, tz, w, cd - 0.1, m.u0 < 0 ? 0 : 2, "lite");
      if (m.kind === "lifts") {
        block(g, mid, y, tz, w + 0.4, 3.2, cd, "stone", C.concrete);
        for (let i = 0; i < 5; i++)
          block(g, mid, y + 0.9 + i * 0.4, tz + cd / 2 + 0.03, w - 2, 0.1, 0.06, "stone", C.dark);
      }
      continue;
    }
    if (detail === "lite") {
      block(g, mid, y, tz, w - 0.1, CUT, cd - 0.1, "stone", LITE_CORE_COLOR[m.kind]);
      continue;
    }
    switch (m.kind) {
      case "stair": {
        const dir: Dir = m.u0 < 0 ? 0 : 2;
        const f = dir === 0 ? 1 : -1;
        stairCore(g, mid, y, tz, w, cd - 0.1, dir);
        fireCabinet(g, mid + (m.u0 < 0 ? 2.6 : -2.6), y, tz + f * (cd / 2 + 0.08), dir);
        break;
      }
      case "ahu":
        coreRoom(g, tx, y, tz, cd, m, -1);
        ahu(g, mid, y, tz + 0.7, 2, w - 1.6);
        panels(g, mid - w / 2 + 0.8, y, tz - cd / 2 + 0.5, 0, 1);
        break;
      case "linen":
        coreRoom(g, tx, y, tz, cd, m, 1);
        shelf(g, mid, y, tz - cd / 2 + 0.45, 0, w - 0.6, 2.2, C.steel, C.linen);
        block(g, mid - 0.6, y, tz + 0.6, 0.7, 1.1, 1.1, "metal", C.steel);
        block(g, mid - 0.6, y + 1.1, tz + 0.6, 0.6, 0.25, 1.0, "stone", C.linen);
        block(g, mid + w / 2 - 0.65, y, tz + 0.4, 0.8, CUT, 0.8, "metal", C.steel);
        break;
      case "lifts": {
        const n = Math.max(1, Math.floor(w / 3.6));
        const depth = Math.min(2.6, cd / 2 - 0.2);
        for (let i = 0; i < n; i++) {
          const x = tx + m.u0 + (i + 0.5) * (w / n);
          lift(g, x, y, tz + cd / 2, 0, depth);
          lift(g, x, y, tz - cd / 2, 2, depth);
        }
        block(g, mid, y, tz, w, CUT, cd - 2 * depth, "stone", C.concrete);
        for (const f of [1, -1]) block(g, mid, y + 0.05, tz + f * (cd / 2 + 1), w, 0.03, 1.9, "stone", C.lobbyFloor);
        break;
      }
      case "service": {
        const depth = Math.min(2.6, cd - 1);
        lift(g, mid, y, tz - cd / 2, 2, depth);
        block(g, mid, y, tz - cd / 2 + depth + (cd - depth) / 2, w - 0.1, CUT, cd - depth, "stone", C.concrete);
        break;
      }
      case "vending":
        block(g, mid, y, tz + cd / 2 - 0.45, w - 0.2, 1.8, 0.75, "stone", C.dark);
        block(g, mid, y + 0.95, tz + cd / 2 - 0.06, w - 0.5, 0.7, 0.02, "glow", C.screen);
        block(g, mid, y, tz - 0.5, w - 0.1, CUT, cd - 1, "stone", C.concrete);
        break;
      case "elec":
        coreRoom(g, tx, y, tz, cd, m, -1);
        panels(g, mid - 0.6, y, tz + cd / 2 - 0.4, 2, Math.max(2, Math.floor((w - 2.4) / 0.82)));
        for (const [dx, col] of [
          [-0.3, C.pipeSupply],
          [0.3, C.pipeReturn],
        ] as const)
          g.cylinder(RISER.x + dx, y, RISER.z, 0.15, CUT, "metal", col, 10);
        g.cylinder(RISER.x + 0.9, y, RISER.z, 0.1, CUT, "stone", C.fire, 8);
        block(g, RISER.x - 0.7, y, RISER.z, 0.3, CUT, 0.3, "metal", C.panelGrey);
        block(g, tx + m.u1 - 0.12, y + 1.0, tz - 0.6, 0.04, 0.6, 0.9, "glow", C.screen);
        break;
    }
  }
}

/** One guest room, entered from the corridor; bathroom side alternates so bathrooms pair up */
function guestRoom(g: G, slot: RoomSlot, y: number, status: RoomStatus, detail: Detail) {
  const { x, z, front, cell: w, depth: dp } = slot;
  const f = front ? 1 : -1;
  const m = slot.col % 2 ? 1 : -1;
  const z0 = z - (f * dp) / 2;
  const P = (
    u: number,
    v: number,
    y0: number,
    sw: number,
    h: number,
    sd: number,
    mat: MaterialKey = "stone",
    col?: RGBA,
  ) => g.box(x + m * u, y + y0 + h / 2, z0 + f * v, sw, h, sd, mat, col);
  const bw = Math.min(1.8, w * 0.56);
  const bd = 2.3;
  const ub = w / 2 - bw / 2;
  const pw = w - bw;
  const dw = Math.min(0.95, pw - 0.1);
  const ud = -w / 2 + pw - dw / 2 - 0.05;
  const bedW = Math.min(1.8, w - 1.0);

  // Shell: party walls, corridor wall with the door, facade glazing
  block(g, x + w / 2, y, z, 0.12, 2.6, dp, "stone", C.wall);
  if (slot.col === 0) block(g, x - w / 2, y, z, 0.12, 2.6, dp, "stone", C.wall);
  P(0, dp / 2, 0, w - 0.12, 0.04, dp - 0.05, "stone", C.carpet);
  P(ub, 0, 0, bw, 2.6, 0.1, "stone", C.wall);
  P(-w / 2 + (pw - dw - 0.05) / 2, 0, 0, pw - dw - 0.05, 2.6, 0.1, "stone", C.wall);
  P(ud, 0, 2.1, dw + 0.1, 0.5, 0.1, "stone", C.wall);
  P(ud, 0, 0, dw, 2.1, 0.07, "wood", C.woodLight);
  P(ud + dw / 2 + 0.12, -0.08, 1.35, 0.06, 0.1, 0.03, "glow", STATUS_LIGHT[status]);
  P(0, dp - 0.04, 0.1, w - 0.12, 2.5, 0.05, "balconyGlass");
  P(0, dp - 0.04, 0, w - 0.12, 0.1, 0.12, "metal");

  // Bathroom pod behind the corridor wall
  if (detail === "lite") {
    P(ub, bd / 2, 0, bw, 2.4, bd, "stone", C.tile);
  } else {
    P(ub, bd / 2, 0.04, bw - 0.1, 0.03, bd - 0.1, "stone", C.tile);
    P(ub, bd, 0, bw, 2.5, 0.1, "stone", C.wall);
    P(w / 2 - bw, bd / 2, 0, 0.1, 2.5, bd, "stone", C.wall);
    P(ub, 0.55, 0.04, bw - 0.2, 0.06, 0.8, "stone", C.white);
    P(ub, 1.0, 0.05, bw - 0.2, 2.0, 0.04, "balconyGlass");
    P(w / 2 - 0.32, 1.65, 0, 0.5, 0.85, 0.9, "stone", C.stoneDark);
    P(w / 2 - 0.32, 1.65, 0.85, 0.36, 0.08, 0.42, "stone", C.white);
    P(w / 2 - 0.08, 1.65, 1.1, 0.03, 0.8, 0.8, "glass");
    P(w / 2 - bw + 0.35, bd - 0.35, 0, 0.38, 0.42, 0.55, "stone", C.white);
    P(w / 2 - bw + 0.35, bd - 0.12, 0, 0.42, 0.8, 0.18, "stone", C.white);
    // Wardrobe in the entry passage, fan-coil unit above it
    if (pw >= 1.3) P(-w / 2 + 0.33, 1.4, 0, 0.55, 2.2, 1.5, "wood", C.woodLight);
    P(-w / 2 + pw / 2, 1.2, 2.55, Math.min(0.9, pw - 0.2), 0.3, 0.6, "metal", C.steel);
    P(-w / 2 + pw / 2, 1.52, 2.55, Math.min(0.7, pw - 0.3), 0.3, 0.04, "stone", C.dark);
  }

  // Bed against the bathroom wall, facing the window
  P(0, bd + 1.13, 0, bedW + 0.08, 0.3, 2.1, "wood", C.woodDark);
  P(0, bd + 1.13, 0.3, bedW, 0.22, 2.0, "stone", C.linen);
  P(0, bd + 1.45, 0.52, bedW + 0.04, 0.06, 1.35, "stone", ROOM_COLOR[status]);
  P(0, bd + 0.1, 0, bedW + 0.5, 1.2, 0.1, "stone", C.headboard);
  P(-w / 2 + 0.27, bd + 3.6, 0, 0.45, 0.75, 1.6, "wood", C.woodLight);
  if (detail === "lite") return;
  for (const s of [-1, 1]) P((s * bedW) / 4, bd + 0.42, 0.52, bedW / 2 - 0.1, 0.16, 0.4, "stone", C.white);
  P(0, bd + 1.92, 0.55, bedW + 0.06, 0.03, 0.35, "stone", C.headboard);
  const side = (w - bedW) / 2 - 0.12;
  if (side >= 0.38)
    for (const s of [-1, 1]) {
      const u = s * (bedW / 2 + side / 2 + 0.04);
      P(u, bd + 0.35, 0, side - 0.04, 0.55, 0.45, "wood", C.woodDark);
      P(u, bd + 0.33, 0.55, 0.16, 0.32, 0.16, "warm");
    }
  // Desk / TV console on the party wall, desk chair, armchair by the window
  P(-w / 2 + 0.07, bd + 3.6, 1.05, 0.04, 0.62, 1.1, "glass", C.dark);
  P(-w / 2 + 0.75, bd + 3.9, 0, 0.45, 0.45, 0.45, "stone", C.fabric);
  P(-w / 2 + 0.98, bd + 3.9, 0.45, 0.07, 0.42, 0.45, "stone", C.fabric);
  P(w / 2 - 0.6, dp - 1.05, 0, 0.75, 0.42, 0.75, "stone", C.fabricWarm);
  P(w / 2 - 0.6, dp - 0.75, 0.42, 0.75, 0.45, 0.14, "stone", C.fabricWarm);
  const [tx2, tz2] = [x + m * (w / 2 - 1.3), z0 + f * (dp - 1.05)];
  if (w > 2.8) g.cylinder(tx2, y, tz2, 0.22, 0.55, "wood", C.woodDark, 10);
  for (const s of [-1, 1]) P(s * (w / 2 - 0.22), dp - 0.18, 0.05, 0.32, 2.4, 0.12, "stone", C.curtain);

  // Housekeeping cart / maintenance cone in the corridor outside the door
  if (status === "cleaning") {
    P(ud, -0.6, 0, 0.55, 1.0, 1.1, "metal", C.steel);
    P(ud, -0.6, 1.0, 0.5, 0.2, 1.0, "stone", C.linen);
  } else if (status === "maintenance") {
    g.cylinder(x + m * (ud + 0.55), y, z0 - f * 0.5, 0.17, 0.5, "stone", C.orange, 8);
    P(ud - 0.2, -0.45, 0, 0.5, 0.75, 0.04, "stone", C.yellow);
  }
}

export function guestFloor(
  g: G,
  spec: FloorSpec,
  y: number,
  rooms: readonly Room[],
  slots: RoomSlot[],
  detail: Detail,
) {
  const { x: tx, z: tz, w: W } = spec.footprint;
  const plan = guestPlan(spec);
  for (const f of [1, -1]) {
    const cz = tz + f * (plan.core / 2 + plan.corridor / 2);
    block(g, tx, y, cz, W - 0.4, 0.05, plan.corridor, "stone", C.corridor);
    if (detail === "full") {
      block(g, tx, y + 0.05, cz, W - 1.4, 0.01, 0.9, "stone", C.runner);
      for (const s of [-1, 1]) {
        cctv(g, tx + s * (W / 2 - 1.5), y, cz);
        block(g, tx + s * (W / 2 - 0.25), y, cz, 0.06, 2.6, plan.corridor - 0.1, "balconyGlass");
      }
    }
  }
  towerCore(g, spec, y, detail);
  const perSide = Math.ceil(spec.rooms / 2);
  rooms.forEach((r, i) => guestRoom(g, slots[i], y, r.status, detail));
  // Narrow floors: the odd cell at the end of the back row is a housekeeping pantry
  const back = slots.filter((s) => !s.front);
  if (back.length && back.length < perSide) {
    const s = back[0];
    const x = tx - W / 2 + s.cell / 2 + (perSide - 1) * s.cell;
    block(g, x, y, s.z, s.cell - 0.12, 0.04, s.depth, "stone", C.coreFloor);
    if (detail === "full") shelf(g, x, y, s.z - s.depth / 2 + 3.5, 2, s.cell - 0.5, 2.0, C.steel, C.linen);
  }
}

// ---------------------------------------------------------------- sky courts

/** Two-storey sky courts: lower level programme and the mezzanine above it */
export function skyCourtFloor(g: G, spec: FloorSpec, y: number) {
  const { x: tx, z: tz, w: W, d: D } = spec.footprint;
  const n = Number(spec.id.slice(1));
  towerCore(g, spec, y, "full");
  const front = tz + 3.2 + (D / 2 - 3.5) / 2; // centre of the band between core and facade
  const back = tz - 3.2 - (D / 2 - 3.5) / 2;
  const upper = n % 2 === 1;
  if (upper) {
    // Mezzanine edge: glass balustrade over the double-height court
    block(g, tx, y, tz + MEZZANINE_EDGE, W - 0.8, 1.1, 0.05, "balconyGlass");
    block(g, tx, y + 1.1, tz + MEZZANINE_EDGE, W - 0.8, 0.06, 0.1, "metal");
  }
  switch (n) {
    case 8:
      poolDeck(g, tx, y, tz, front, back);
      break;
    case 9:
      libraryLounge(g, tx, y, tz, back);
      break;
    case 16:
      gym(g, tx, y, tz, front, back);
      break;
    case 17:
      spa(g, tx, y, back);
      break;
    case 24:
      restaurant(g, tx, y, tz, front, back);
      break;
    case 25:
      skyBar(g, tx, y, tz, back);
      break;
  }
}
/** Mezzanine slab edge on the upper sky-court level, from the floor centre (m) */
export const MEZZANINE_EDGE = 5.2;

function poolDeck(g: G, tx: number, y: number, tz: number, front: number, back: number) {
  // Infinity pool along the facade, loungers and umbrellas on the deck
  block(g, tx, y, front, 43, 0.06, 10, "deck");
  const pz = tz + 10.3;
  block(g, tx - 4, y, pz, 28, 0.14, 5.4, "glass", C.water);
  for (const s of [-1, 1]) {
    block(g, tx - 4, y, pz + s * 2.85, 28.6, 0.22, 0.3, "stone", C.white);
    block(g, tx - 4 + s * 14.15, y, pz, 0.3, 0.22, 5.4, "stone", C.white);
  }
  for (let i = 0; i < 11; i++) {
    const x = tx - 16 + i * 2.4;
    lounger(g, x, y, tz + 5.4, 0);
    if (i % 2 === 1) umbrella(g, x + 1.2, y, tz + 5.4);
  }
  g.cylinder(tx + 15.5, y, tz + 10, 2.1, 0.3, "stone", C.white, 16);
  g.cylinder(tx + 15.5, y, tz + 10, 1.8, 0.36, "glass", C.water, 16);
  counter(g, tx + 16, y, tz + 5.4, 0, 4.5, C.woodLight);
  for (let i = 0; i < 4; i++) g.cylinder(tx + 14.4 + i * 1.05, y, tz + 6.3, 0.2, 0.75, "stone", C.fabric, 8);
  for (const x of [tx - 20.5, tx + 20.5]) g.tree(x, tz + 7, y, 0.42);
  // Changing rooms with lockers, showers, towel station, pool plant room
  bandRoom(g, y, tx - 21.6, tx - 8.4, back, 10, 1, C.wall);
  for (const dz of [-3, 1.5]) {
    block(g, tx - 15, y, back + dz, 11, 2.0, 0.55, "wood", C.woodLight);
    block(g, tx - 15, y, back + dz + 1.1, 9, 0.45, 0.4, "wood", C.woodDark);
  }
  for (let i = 0; i < 4; i++) {
    const x = tx - 6.6 + i * 1.5;
    block(g, x, y, back - 3, 1.2, 2.2, 1.2, "balconyGlass");
    block(g, x, y, back - 3, 1.1, 0.06, 1.1, "stone", C.white);
  }
  counter(g, tx + 2.5, y, back - 0.5, 0, 3.5, C.woodLight);
  shelf(g, tx + 2.5, y, back - 4.4, 0, 3.5, 2.0, C.woodLight, C.linen);
  bandRoom(g, y, tx + 6, tx + 21.6, back, 10, 1, C.concrete);
  for (let i = 0; i < 3; i++) g.cylinder(tx + 8.5 + i * 1.6, y, back - 3, 0.6, 1.6, "stone", C.tank, 12);
  for (let i = 0; i < 2; i++) pump(g, tx + 14 + i * 1.6, y, back - 3);
  block(g, tx + 19.5, y, back - 3, 2.2, 1.5, 1.2, "metal", C.steel);
  g.cylinder(tx + 19.5, y + 1.5, back - 3, 0.5, 0.15, "stone", C.dark, 12);
  for (let i = 0; i < 3; i++) g.cylinder(tx + 8.5 + i * 0.7, y, back + 2.5, 0.25, 0.9, "stone", C.white, 8);
  panels(g, tx + 15, y, back + 3.5, 2, 3);
}

/** Walls of a room in a sky-court band, with a door gap on the `door` side (+1 = towards +z) */
function bandRoom(g: G, y: number, x0: number, x1: number, cz: number, d: number, door: 1 | -1, col: RGBA) {
  const t = 0.12;
  const w = x1 - x0;
  const mid = (x0 + x1) / 2;
  for (const x of [x0, x1]) block(g, x, y, cz, t, 2.6, d, "stone", col);
  block(g, mid, y, cz - (door * d) / 2, w, 2.6, t, "stone", col);
  const side = (w - 1.2) / 2;
  for (const s of [-1, 1]) block(g, mid + s * (0.6 + side / 2), y, cz + (door * d) / 2, side, 2.6, t, "stone", col);
}

function libraryLounge(g: G, tx: number, y: number, tz: number, back: number) {
  for (let i = 0; i < 6; i++) shelf(g, tx - 18.5 + i * 3.8, y, back - 4.6, 0, 3.6, 2.4, C.woodDark);
  for (const [dx, dz] of [
    [-14, 0.2],
    [-6.5, 0.2],
    [1.5, 0.2],
  ])
    lounge(g, tx + dx, y, back + dz, C.fabricGreen);
  counter(g, tx - 13.5, y, tz + MEZZANINE_EDGE - 0.6, 0, 7, C.woodDark);
  for (let i = 0; i < 6; i++)
    g.cylinder(tx - 16.3 + i * 1.15, y, tz + MEZZANINE_EDGE - 1.4, 0.2, 0.75, "stone", C.fabric, 8);
  counter(g, tx + 15, y, back - 1.5, 0, 6, C.woodLight);
  block(g, tx + 15, y, back - 4.2, 6, 2.0, 0.6, "metal", C.steel);
  for (let i = 0; i < 3; i++) diningSet(g, tx + 10 + i * 3.4, y, back + 3, C.fabricGreen);
  for (const x of [tx - 20.5, tx + 10.6]) plant(g, x, y, back + 3.6, 1.2);
}

function gym(g: G, tx: number, y: number, tz: number, front: number, back: number) {
  block(g, tx, y, front, 43, 0.04, 10, "stone", C.rubber);
  for (let i = 0; i < 14; i++) treadmill(g, tx - 19 + i * 1.6, y, tz + 11.6, 0);
  for (let i = 0; i < 14; i++) bike(g, tx - 19 + i * 1.6, y, tz + 8.4, 0);
  // Functional training rig
  block(g, tx + 14.5, y, front, 13, 0.03, 9, "stone", [0.28, 0.4, 0.34, 1]);
  for (const dx of [-3, 3])
    for (const dz of [-1, 1]) block(g, tx + 14.5 + dx, y, front + dz, 0.12, 2.7, 0.12, "metal", C.dark);
  for (const dz of [-1, 1]) block(g, tx + 14.5, y + 2.6, front + dz, 6.2, 0.1, 0.1, "metal", C.dark);
  for (let i = 0; i < 4; i++) block(g, tx + 10 + i * 1.5, y, front + 3.2, 0.6, 0.5, 0.6, "wood", C.woodLight);
  block(g, tx - 12.5, y, tz + 4.4, 3.2, 0.95, 0.65, "wood", C.woodDark);
  // Free weights and mirror wall, studio, lockers
  for (let i = 0; i < 3; i++) weightBench(g, tx - 18 + i * 3.6, y, back + 1, 0);
  for (let i = 0; i < 2; i++) {
    const x = tx - 16 + i * 6;
    block(g, x, y, back - 4.2, 2, 0.8, 0.5, "metal", C.steel);
    block(g, x, y + 0.8, back - 4.2, 1.9, 0.14, 0.36, "stone", C.dark);
  }
  block(g, tx - 13, y + 0.2, back - 4.85, 14, 2.2, 0.03, "glass", [0.62, 0.7, 0.74, 1]);
  bandRoom(g, y, tx - 5, tx + 6, back - 1, 8, 1, [0.6, 0.72, 0.76, 1]);
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 5; i++)
      block(g, tx - 3.4 + i * 1.9, y, back - 3 + r * 2.6, 0.7, 0.02, 1.8, "stone", pick(g, GOODS));
  for (const dz of [-3, 0.5]) block(g, tx + 14, y, back + dz, 12, 2.0, 0.55, "wood", C.woodLight);
  for (const x of [tx - 20.5, tx + 20.5]) plant(g, x, y, tz + 4.6, 1.1);
}

function spa(g: G, tx: number, y: number, back: number) {
  for (let i = 0; i < 4; i++) {
    const x0 = tx - 21.6 + i * 4.1;
    bandRoom(g, y, x0, x0 + 4, back - 1.6, 6.6, 1, [0.86, 0.82, 0.74, 1]);
    const x = x0 + 2;
    block(g, x, y, back - 2.4, 0.8, 0.68, 2.0, "stone", C.linen);
    block(g, x, y + 0.68, back - 2.4, 0.82, 0.06, 2.02, "stone", [0.78, 0.86, 0.82, 1]);
    block(g, x + 1.3, y, back - 3.8, 0.6, 0.8, 0.5, "wood", C.woodLight);
    block(g, x + 1.3, y + 0.8, back - 3.8, 0.15, 0.25, 0.15, "warm");
  }
  block(g, tx - 2.5, y, back - 2.4, 3.2, 2.5, 2.6, "wood", C.woodLight);
  block(g, tx - 2.5, y, back - 1.08, 0.8, 2.0, 0.04, "glass");
  block(g, tx + 1.5, y, back - 2.4, 3.0, 2.5, 2.6, "balconyGlass");
  block(g, tx + 1.5, y, back - 2.4, 2.8, 0.45, 0.6, "stone", C.tile);
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 5; i++) lounger(g, tx + 7 + i * 2.2, y, back + 0.3 - r * 3.3, 0, [0.82, 0.78, 0.7, 1]);
  block(g, tx + 18.5, y, back - 3.4, 3.2, 0.4, 2.2, "stone", C.white);
  block(g, tx + 18.5, y, back - 3.4, 2.8, 0.44, 1.8, "glass", C.water);
  counter(g, tx - 9.2, y, back + 4, 0, 3, C.woodLight);
  plant(g, tx + 11, y, back + 4.2, 1.1);
}

function restaurant(g: G, tx: number, y: number, tz: number, front: number, back: number) {
  block(g, tx, y, front, 43, 0.04, 10, "wood", [0.52, 0.4, 0.3, 1]);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 10; i++) diningSet(g, tx - 19 + i * 3.3, y, tz + 5.6 + r * 3);
  counter(g, tx - 13, y, tz + 4.3, 0, 1.4, C.woodDark);
  // Open kitchen east of the lift lobby: pass, cooking line under the hood, prep islands, cold room
  counter(g, tx + 13.5, y, back + 3, 0, 13, C.stoneDark, C.steel);
  for (let i = 0; i < 4; i++) block(g, tx + 9 + i * 3, y + 1.7, back + 3, 0.6, 0.1, 0.4, "warm");
  block(g, tx + 10.5, y, back - 4.4, 11, 0.9, 0.9, "metal", C.steel);
  block(g, tx + 10.5, y + 2.1, back - 4.4, 11, 0.6, 1.2, "metal", C.steel);
  for (let i = 0; i < 4; i++) block(g, tx + 6.6 + i * 2.6, y + 0.9, back - 4.4, 0.6, 0.04, 0.6, "stone", C.dark);
  for (const dx of [8, 13.5]) block(g, tx + dx, y, back - 0.6, 4.5, 0.9, 1.2, "metal", C.steel);
  block(g, tx + 18.8, y, back - 2.6, 3.4, CUT - 0.2, 4.2, "stone", C.white);
  // Wine wall and private dining room
  bandRoom(g, y, tx - 21.6, tx - 5.4, back, 10, 1, [0.62, 0.7, 0.74, 1]);
  for (let i = 0; i < 4; i++)
    shelf(g, tx - 19.5 + i * 3.8, y, back - 4.6, 0, 3.6, 2.4, C.woodDark, [0.32, 0.12, 0.16, 1]);
  boardroom(g, tx - 13.5, y, back + 0.4, true, 7);
}

function skyBar(g: G, tx: number, y: number, tz: number, back: number) {
  block(g, tx, y, back, 43, 0.04, 10, "wood", [0.32, 0.26, 0.22, 1]);
  counter(g, tx - 1, y, back - 1.8, 0, 18, C.woodDark, C.stoneDark);
  block(g, tx - 1, y, back - 4.3, 18, 2.3, 0.55, "wood", C.woodDark);
  for (const lv of [0.95, 1.45, 1.95]) block(g, tx - 1, y + lv, back - 4.0, 17.4, 0.2, 0.1, "warm");
  for (let i = 0; i < 12; i++) g.cylinder(tx - 9 + i * 1.45, y, back - 0.75, 0.2, 0.78, "stone", C.brass, 8);
  for (const dx of [-16, -12, 12.5, 16.5, 20]) {
    const x = tx + dx;
    g.cylinder(x, y + 1.0, tz + MEZZANINE_EDGE - 1.4, 0.4, 0.05, "stone", C.stoneDark, 12);
    g.cylinder(x, y, tz + MEZZANINE_EDGE - 1.4, 0.06, 1.0, "metal", C.dark, 6);
    for (const s of [-1, 1]) g.cylinder(x + s * 0.8, y, tz + MEZZANINE_EDGE - 1.4, 0.19, 0.78, "stone", C.brass, 8);
  }
  for (const dx of [14, 19]) lounge(g, tx + dx - 2, y, back + 1.2, [0.3, 0.32, 0.4, 1]);
  counter(g, tx - 17, y, back - 2, 0, 3, C.dark, C.dark);
  for (const s of [-1, 1]) block(g, tx - 17 + s * 0.7, y + 1.0, back - 2, 0.5, 0.03, 0.5, "glow", C.screen);
  for (const x of [tx - 20.5, tx + 20.5]) plant(g, x, y, back + 3.5, 1.2);
}

// ---------------------------------------------------------------------- roof

export function roofFloor(g: G, spec: FloorSpec, y: number) {
  const { x: tx, z: tz, w: W, d: D } = spec.footprint;
  // The roof keeps the tower core's stair exits and the lift motor room
  towerCore(g, { ...spec, footprint: { ...spec.footprint, w: 44, d: 28 } }, y, "full", { roof: true });
  // West viewing terrace with pergola and planting
  block(g, tx - 15, y, tz + 8.6, 14, 0.08, 10, "deck");
  for (const dx of [-5, 0, 5]) block(g, tx - 15 + dx, y, tz + 11.5, 2.4, 0.45, 0.6, "wood", C.woodLight);
  for (const dx of [-6.3, 6.3])
    for (const dz of [-3.8, 3.8]) block(g, tx - 15 + dx, y, tz + 8.6 + dz, 0.2, 2.8, 0.2, "wood", C.woodDark);
  for (let i = 0; i < 9; i++) block(g, tx - 15, y + 2.8, tz + 5 + i * 0.9, 13, 0.12, 0.12, "wood", C.woodDark);
  for (const dx of [-5.5, 0, 5.5]) {
    block(g, tx - 15 + dx, y, tz + 4.6, 2.6, 0.6, 1.2, "planter");
    g.tree(tx - 15 + dx, tz + 4.6, y + 0.6, 0.3);
  }
  // Solar array (west back), cooling towers (east front), tanks and pumps (east back)
  for (let r = 0; r < 4; r++) {
    const z = tz - 12.6 + r * 2.2;
    const [x0, x1] = [tx - 21.5, tx - 3];
    g.quad(
      [x0, y + 0.5, z + 0.75],
      [x1, y + 0.5, z + 0.75],
      [x1, y + 1.15, z - 0.75],
      [x0, y + 1.15, z - 0.75],
      "glass",
      C.solar,
    );
    g.quad(
      [x1, y + 0.5, z + 0.75],
      [x0, y + 0.5, z + 0.75],
      [x0, y + 1.15, z - 0.75],
      [x1, y + 1.15, z - 0.75],
      "metal",
      C.panelGrey,
    );
    for (let x = x0 + 0.5; x < x1; x += 4.5) block(g, x, y, z - 0.6, 0.08, 1.1, 0.08, "metal", C.panelGrey);
  }
  for (const dx of [2, 9, 16]) coolingTower(g, tx + dx, y, tz + 9);
  block(g, tx - 1.6, y, tz + 9, 0.08, 2.4, 9.5, "metal", C.panelGrey);
  for (const dx of [12.5, 18]) {
    block(g, tx + dx, y, tz - 10, 4.2, 0.3, 4.2, "stone", C.concrete);
    g.cylinder(tx + dx, y + 0.3, tz - 10, 1.9, 3.2, "stone", C.tank, 16);
  }
  for (let i = 0; i < 4; i++) pump(g, tx + 9 + i * 1.5, y, tz - 5.2);
  g.line([tx + 8.5, y + 0.9, tz - 6.2], [tx + 18.5, y + 0.9, tz - 6.2], 0.18, "metal", C.pipeSupply);
  g.line([tx + 18.5, y + 0.9, tz - 6.2], [tx + 18.5, y + 0.9, tz - 7.8], 0.18, "metal", C.pipeSupply);
  for (let i = 0; i < 3; i++) {
    g.cylinder(tx - 2 + i * 2, y, tz - 12, 0.5, 0.7, "metal", C.steel, 10);
    g.cylinder(tx - 2 + i * 2, y + 0.7, tz - 12, 0.42, 0.04, "stone", C.dark, 10);
  }
  // Building maintenance unit track and aircraft warning lights
  const [ex, ez] = [W / 2 - 0.6, D / 2 - 0.6];
  const corners: [number, number][] = [
    [-ex, -ez],
    [ex, -ez],
    [ex, ez],
    [-ex, ez],
  ];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 4];
    g.line([tx + ax, y + 0.25, tz + az], [tx + bx, y + 0.25, tz + bz], 0.16, "metal", C.steel);
    block(g, tx + ax, y, tz + az, 0.1, 1.6, 0.1, "metal", C.dark);
    g.sphere(tx + ax, y + 1.7, tz + az, 0.16, 0.16, 0.16, "red", undefined, 6, 4);
  }
}

// -------------------------------------------------------------------- podium

const ATRIUM = { x0: -24, x1: -6, z0: -6, z1: 6 };
export const PODIUM_ATRIUM = ATRIUM;
const HOTEL_SHAFT = { x: 9, z: -6, w: 12, d: 6 };

type Unit = { x0: number; x1: number; z0: number; z1: number };
const FRONT_ROW = (xs: number[]): Unit[] => xs.slice(0, -1).map((x0, i) => ({ x0, x1: xs[i + 1], z0: 9, z1: 23 }));
const BACK_ROW = (xs: number[]): Unit[] => xs.slice(0, -1).map((x0, i) => ({ x0, x1: xs[i + 1], z0: -9.5, z1: -16.5 }));

/** Shop / restaurant unit opening onto the concourse at z0; content laid out in a local frame */
function unit(g: G, u: Unit, y: number, fit: (f: Frame, w: number, d: number) => void, glazed = true) {
  const w = u.x1 - u.x0;
  const d = Math.abs(u.z1 - u.z0);
  const dir: Dir = u.z1 > u.z0 ? 0 : 2;
  const f = frame(g, (u.x0 + u.x1) / 2, y, u.z0, dir);
  const brand = pick(g, BRAND);
  f.part(0, d / 2, 0, w - 0.2, 0.03, d - 0.1, "stone", [0.8, 0.77, 0.72, 1]);
  for (const s of [-1, 1]) f.part((s * w) / 2, d / 2, 0, 0.14, 3.4, d, "stone", C.wall);
  f.part(0, d, 0, w, 3.4, 0.14, "stone", C.wall);
  if (glazed) {
    const side = (w - 3) / 2;
    for (const s of [-1, 1]) f.part(s * (1.5 + side / 2), 0, 0, side, 3.2, 0.05, "balconyGlass");
  }
  f.part(0, 0, 3.2, w, 0.7, 0.25, "stone", brand);
  f.part(0, -0.14, 3.35, Math.min(3, w * 0.3), 0.4, 0.04, "warm");
  fit(f, w, d);
}

type Fit = (f: Frame, w: number, d: number, g: G, y: number) => void;
const at = (f: Frame, u: number, v: number) => f.world(u, v);

const FITS: Record<string, Fit> = {
  fashion: (f, w, d, g, y) => {
    for (let i = 0; i < 3; i++) {
      const [x, z] = at(f, -w / 2 + 2 + i * ((w - 4) / 2), d * 0.45);
      clothesRack(g, x, y, z, f.turn(0), 1.8);
    }
    const [sx, sz] = at(f, 0, d - 0.35);
    shelf(g, sx, y, sz, f.turn(2), w - 3, 2.2);
    for (const s of [-1, 1]) {
      const [mx, mz] = at(f, s * (w / 2 - 1.5), 0.9);
      mannequin(g, mx, y, mz);
    }
    const [cx, cz] = at(f, w / 2 - 1.6, d * 0.75);
    counter(g, cx, y, cz, f.turn(3), 1.8);
    for (let i = 0; i < 2; i++) f.part(-w / 2 + 0.8 + i * 1.3, d - 1.2, 0, 1.2, 2.3, 1.4, "stone", C.wall);
  },
  electronics: (f, w, d, g, y) => {
    for (let i = 0; i < 3; i++) {
      const [x, z] = at(f, -w / 2 + 2.2 + i * ((w - 4.4) / 2), d * 0.45);
      table(g, x, y, z, 1.6, 1.0, C.white, 0.9);
      for (const s of [-1, 0, 1])
        f.part(-w / 2 + 2.2 + i * ((w - 4.4) / 2) + s * 0.45, d * 0.45, 0.9, 0.32, 0.02, 0.22, "glow", C.screen);
    }
    const [sx, sz] = at(f, 0, d - 0.35);
    shelf(g, sx, y, sz, f.turn(2), w - 1.5, 2.2, C.white);
    const [cx, cz] = at(f, w / 2 - 1.8, d * 0.8);
    counter(g, cx, y, cz, f.turn(3), 2, C.white);
  },
  beauty: (f, w, d, g, y) => {
    for (let i = 0; i < 4; i++)
      f.part(-w / 2 + 2 + (i % 2) * (w - 4), d * (i < 2 ? 0.35 : 0.65), 0, 1.6, 1.0, 0.7, "stone", C.white);
    const [sx, sz] = at(f, 0, d - 0.35);
    shelf(g, sx, y, sz, f.turn(2), w - 1.5, 2.2, C.white);
    for (const s of [-1, 1]) {
      const [x, z] = at(f, (s * w) / 2 - s * 0.35, d / 2);
      shelf(g, x, y, z, f.turn(s < 0 ? 1 : 3), d - 3, 2.2, C.white);
    }
  },
  books: (f, w, d, g, y) => {
    for (let i = 0; i < 3; i++) {
      const [x, z] = at(f, -w / 2 + 2.4 + i * ((w - 4.8) / 2), d * 0.55);
      gondola(g, x, y, z, f.turn(0) % 2 === 1, d * 0.5);
    }
    const [sx, sz] = at(f, 0, d - 0.35);
    shelf(g, sx, y, sz, f.turn(2), w - 1.5, 2.4, C.woodDark);
    const [tx2, tz2] = at(f, 0, 1.6);
    table(g, tx2, y, tz2, 2.4, 1.0, C.woodLight);
  },
  grocery: (f, w, d, g, y) => {
    for (let i = 0; i < 4; i++) {
      const [x, z] = at(f, -w / 2 + 2 + i * ((w - 4) / 3), d * 0.5);
      gondola(g, x, y, z, f.turn(0) % 2 === 1, d * 0.5);
    }
    f.part(0, d - 0.5, 0, w - 1, 2.1, 0.8, "stone", C.white);
    f.part(0, d - 0.9, 0.3, w - 1.3, 1.6, 0.03, "glass", [0.6, 0.78, 0.86, 1]);
    const [cx, cz] = at(f, w / 2 - 2, 1.6);
    counter(g, cx, y, cz, f.turn(3), 2.4);
  },
  cafe: (f, w, d, g, y) => {
    const [cx, cz] = at(f, 0, d - 1.6);
    counter(g, cx, y, cz, f.turn(0), w - 3, C.woodLight);
    f.part(0, d - 0.35, 0, w - 2, 2.0, 0.6, "metal", C.steel);
    f.part(-1, d - 1.6, 0.95, 0.5, 0.5, 0.4, "metal", C.dark);
    const rows = d > 10 ? 2 : 1;
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < rows; j++) {
        const [x, z] = at(f, -w / 2 + 2.5 + i * (w - 5), 2 + j * 4.8);
        diningSet(g, x, y, z, C.fabricGreen);
      }
  },
  restaurant: (f, w, d, g, y) => {
    // Kitchen behind a wall at the back, dining in front, a bar on one side
    f.part(0, d - 3.2, 0, w - 0.3, 2.6, 0.12, "stone", C.wall);
    f.part(0, d - 1.4, 0, w - 1.2, 0.9, 0.9, "metal", C.steel);
    f.part(0, d - 1.4, 2.1, w - 1.2, 0.5, 1.1, "metal", C.steel);
    const rows = Math.max(1, Math.floor((d - 5) / 2.8));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < rows; j++) {
        const [x, z] = at(f, -w / 2 + 2 + i * ((w - 4) / 2), 1.8 + j * 2.8);
        diningSet(g, x, y, z);
      }
  },
  pharmacy: (f, w, d, g, y) => {
    for (let i = 0; i < 2; i++) {
      const [x, z] = at(f, -w / 4 + i * (w / 2), d * 0.45);
      gondola(g, x, y, z, f.turn(0) % 2 === 1, d * 0.45);
    }
    const [cx, cz] = at(f, 0, d - 1.6);
    counter(g, cx, y, cz, f.turn(0), w - 4, C.white, [0.36, 0.72, 0.52, 1]);
    const [sx, sz] = at(f, 0, d - 0.35);
    shelf(g, sx, y, sz, f.turn(2), w - 1.5, 2.2, C.white);
  },
};
const RETAIL_FITS = ["fashion", "electronics", "beauty", "books", "fashion", "grocery"] as const;

/** Escalator rising from (x, y, z0) to (x, y + rise, z1), cut at `maxH` above y */
function escalator(g: G, x: number, y: number, z0: number, z1: number, rise: number, maxH = Infinity) {
  const n = 14;
  const run = (z1 - z0) / n;
  const top = Math.min(rise, maxH);
  for (let i = 0; i < n; i++) {
    const h = ((i + 1) * rise) / n;
    if (h > maxH) break;
    block(g, x, y + Math.max(0, h - 0.9), z0 + (i + 0.5) * run, 1.2, Math.min(h, 0.9), Math.abs(run), "metal", C.steel);
  }
  const zt = z0 + (z1 - z0) * (top / rise);
  for (const s of [-1, 1]) {
    const xs = x + s * 0.62;
    const a: [number, number, number] = [xs, y, z0];
    const b: [number, number, number] = [xs, y + top, zt];
    g.quad(a, b, [b[0], b[1] + 1, b[2]], [a[0], a[1] + 1, a[2]], "balconyGlass");
    g.quad(b, a, [a[0], a[1] + 1, a[2]], [b[0], b[1] + 1, b[2]], "balconyGlass");
    g.line([xs, y + 1, z0], [xs, y + top + 1, zt], 0.08, "metal", C.dark);
  }
}

function podiumCommon(g: G, level: number, y: number, cut: boolean) {
  // Structure, hotel shuttle-lift shaft, fire stairs, toilets, AHU room
  for (let x = -37; x <= 38; x += 15)
    for (const z of [-19, 19]) {
      block(g, x, y, z, 0.8, 4.6, 0.8, "stone", [0.61, 0.71, 0.77, 1]);
      if (z < 0 && (x + 37) % 30 === 0) fireCabinet(g, x, y, z + 0.4, 0);
    }
  if (level > 0) {
    // Hotel shuttle lifts pass through the mall floors without stopping
    const h = cut ? CUT : 4.4;
    for (let i = 0; i < 4; i++) block(g, 4.5 + i * 3, y, -4.3, 2.4, h, 2.6, "stone", C.lift);
    block(g, HOTEL_SHAFT.x, y, -7.3, HOTEL_SHAFT.w, h, 3.4, "stone", C.concrete);
    // Atrium void: glass balustrade
    const { x0, x1, z0, z1 } = ATRIUM;
    for (const z of [z0, z1]) {
      pane(g, [x0, y, z], [x1, y, z], 1.1);
      g.line([x0, y + 1.1, z], [x1, y + 1.1, z], 0.08, "metal", C.steel);
    }
    for (const x of [x0, x1]) {
      pane(g, [x, y, z0], [x, y, z1], 1.1);
      g.line([x, y + 1.1, z0], [x, y + 1.1, z1], 0.08, "metal", C.steel);
    }
  }
  if (level < 4) {
    escalator(g, ATRIUM.x0 + 2.5, y, ATRIUM.z0 + 1.5, ATRIUM.z1 - 1.5, PODIUM_STEP, cut ? CUT : Infinity);
    escalator(g, ATRIUM.x1 - 2.5, y, ATRIUM.z1 - 1.5, ATRIUM.z0 + 1.5, PODIUM_STEP, cut ? CUT : Infinity);
  }
  stairCore(g, -40, y, -21.5, 4, 6, 0);
  stairCore(g, 40, y, -21.5, 4, 6, 0);
  stairCore(g, -40, y, 21.5, 4, 6, 2);
  stairCore(g, 40, y, 21.5, 4, 6, 2);
  // Toilets: two rooms with cubicles and a vanity counter
  block(g, -28, y, -21.5, 8, 0.03, 7, "stone", C.tile);
  for (const x of [-32, -28, -24]) block(g, x, y, -21.5, 0.14, 2.6, 7, "stone", C.wall);
  block(g, -28, y, -25, 8, 2.6, 0.14, "stone", C.wall);
  for (const s of [-1, 1]) {
    const cx = -28 + s * 2;
    block(g, cx + s * 1.3, y, -18, 1.4, 2.6, 0.14, "stone", C.wall);
    for (let i = 0; i < 3; i++) {
      const x = cx - 1.4 + i * 1.2;
      block(g, x + 0.6, y, -23.6, 0.06, 2.0, 2.6, "stone", [0.56, 0.62, 0.66, 1]);
      block(g, x, y, -24.6, 0.4, 0.42, 0.55, "stone", C.white);
    }
    block(g, cx, y, -19.2, 3.4, 0.85, 0.55, "stone", C.stoneDark);
    for (let i = 0; i < 3; i++) block(g, cx - 1.1 + i * 1.1, y + 0.85, -19.2, 0.38, 0.08, 0.36, "stone", C.white);
  }
  cctv(g, -15, y, 9, 3.6);
  cctv(g, 20, y, -2, 3.6);
  cctv(g, -36, y, 0, 3.6);
  if (level > 0) {
    block(g, 32.5, y, -21.2, 9, 0.03, 7.4, "stone", C.coreFloor);
    for (const x of [28, 37]) block(g, x, y, -21.2, 0.14, 2.8, 7.4, "stone", C.concrete);
    block(g, 32.5, y, -17.5, 9, 2.8, 0.14, "stone", C.concrete);
    ahu(g, 32.5, y, -23.2, 0, 6);
    panels(g, 32.5, y, -18.2, 2, 4);
  }
}
/** Podium floor-to-floor height (m) */
const PODIUM_STEP = 5.2;

function podiumG(g: G, y: number) {
  // Hotel lobby: reception, lounge, concierge, revolving door
  block(g, -20.5, y, 15.8, 39, 0.03, 17.5, "stone", C.lobbyFloor);
  counter(g, -25, y, 11.6, 0, 9);
  block(g, -25, y, 9.6, 12, 3.6, 0.3, "wood", C.woodLight);
  block(g, -25, y + 2.2, 9.78, 3.2, 0.6, 0.04, "warm");
  for (let i = 0; i < 4; i++) block(g, -28.4 + i * 2.2, y + 1.0, 11.4, 0.45, 0.3, 0.04, "glow", C.screen);
  lounge(g, -14, y, 17);
  lounge(g, -6, y, 17, C.fabricGreen);
  lounge(g, -34, y, 18.5);
  lounge(g, -24, y, 20.5, C.fabricGreen);
  counter(g, -4, y, 11.5, 0, 2.4, C.woodLight);
  g.cylinder(-12, y, 24.3, 1.6, 2.6, "balconyGlass", undefined, 16);
  g.cylinder(-12, y + 2.6, 24.3, 1.7, 0.2, "metal", C.steel, 16);
  block(g, -4, y, 20.5, 0.7, 0.1, 1.2, "metal", C.brass);
  for (const dz of [-0.55, 0.55]) block(g, -4, y, 20.5 + dz, 0.06, 1.8, 0.06, "metal", C.brass);
  for (const x of [-38, -30, -20, -2]) plant(g, x, y, 23.4, 1.3);
  // Hotel lift lobby at the foot of the tower core
  block(g, HOTEL_SHAFT.x, y, 0.5, 12, 0.03, 7, "stone", C.lobbyFloor);
  for (let i = 0; i < 4; i++) lift(g, 4.5 + i * 3, y, -3, 0);
  block(g, HOTEL_SHAFT.x, y, -7.3, 12, 4.4, 3.4, "stone", C.concrete);
  sofa(g, 9, y, 3, 2, 3, C.fabricWarm);
  // Street-front shops
  const shops = FRONT_ROW([1, 13, 25, 37]);
  unit(g, shops[0], y, (f, w, d) => FITS.pharmacy(f, w, d, g, y));
  unit(g, shops[1], y, (f, w, d) => FITS.cafe(f, w, d, g, y));
  unit(g, shops[2], y, (f, w, d) => FITS.grocery(f, w, d, g, y));
  // Atrium water feature, benches, indoor trees
  block(g, -15, y, 0, 5.4, 0.45, 5.4, "stone", C.white);
  block(g, -15, y, 0, 4.8, 0.5, 4.8, "glass", C.water);
  for (const s of [-1, 1]) {
    block(g, -15, y, s * 4.4, 4, 0.45, 0.6, "wood", C.woodLight);
    g.tree(-15 + s * 4.4, s * -4.2, y, 0.42);
  }
  // Security control room (linked to the IOC), loading dock
  block(g, -15, y, -20.5, 14, 0.03, 9, "stone", C.coreFloor);
  for (const x of [-22, -8]) block(g, x, y, -20.5, 0.14, 2.8, 9, "stone", C.wall);
  block(g, -15, y, -16, 14, 2.8, 0.14, "stone", C.wall);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 4; c++)
      block(g, -18.6 + c * 2.4, y + 1.1 + r * 0.95, -24.8, 2.3, 0.88, 0.05, "glow", C.videoWall);
  for (const z of [-21.5, -18.8]) {
    block(g, -15, y, z, 9, 0.75, 0.8, "wood", C.stoneDark);
    for (let i = 0; i < 5; i++) {
      block(g, -18.6 + i * 1.8, y + 0.75, z - 0.25, 0.6, 0.38, 0.04, "glow", C.screen);
      chair(g, -18.6 + i * 1.8, y, z + 0.75, 2, C.dark);
    }
  }
  block(g, 27, y, -19, 20, 0.03, 12, "stone", C.concrete);
  for (let i = 0; i < 3; i++) block(g, 20 + i * 6, y, -24.9, 3.6, 3.2, 0.12, "metal", C.panelGrey);
  for (let i = 0; i < 6; i++) {
    const x = 19 + (i % 3) * 3.2;
    const z = -21 + Math.floor(i / 3) * 3;
    block(g, x, y, z, 1.2, 0.15, 1.0, "wood", C.woodLight);
    block(g, x, y + 0.15, z, 1.1, 0.4 + g.rand() * 0.8, 0.9, "stone", C.cardboard);
  }
  block(g, 33, y, -21, 3, 2, 2, "stone", [0.32, 0.5, 0.4, 1]);
  block(g, 33, y, -15.5, 2.2, 1.0, 0.5, "metal", C.orange);
}

function podiumL1(g: G, y: number) {
  const front = FRONT_ROW([-40, -27, -14, -1, 12, 25, 37]);
  const back = BACK_ROW([-40, -28, -16, -4, 8, 20, 27]);
  [...front, ...back].forEach((u, i) => {
    const kind = RETAIL_FITS[i % RETAIL_FITS.length];
    unit(g, u, y, (f, w, d) => FITS[kind](f, w, d, g, y));
  });
  // Concourse: kiosks, info desk, directory, benches with planters
  for (const x of [22, 32]) {
    for (const s of [-1, 1]) block(g, x + s * 1.1, y, 0, 0.3, 1.0, 2.5, "wood", C.woodLight);
    for (const s of [-1, 1]) block(g, x, y, s * 1.1, 2.5, 1.0, 0.3, "wood", C.woodLight);
    block(g, x, y + 2.4, 0, 3.0, 0.15, 3.0, "stone", pick(g, BRAND));
    block(g, x, y, 0, 0.2, 2.4, 0.2, "metal", C.dark);
  }
  counter(g, -2, y, 4.5, 0, 2.6, C.white);
  block(g, 0.5, y, 6.5, 1.4, 2.2, 0.15, "glow", C.screen);
  for (const x of [17, 27, 36])
    for (const z of [-5, 5]) {
      block(g, x, y, z, 2.2, 0.45, 0.6, "wood", C.woodLight);
      plant(g, x + 1.8, y, z, 1.1);
    }
}

function podiumL2(g: G, y: number) {
  const front = FRONT_ROW([-40, -27, -14, -1, 12]);
  front.forEach((u) => unit(g, u, y, (f, w, d) => FITS.restaurant(f, w, d, g, y)));
  unit(g, { x0: -40, x1: -28, z0: -9.5, z1: -16.5 }, y, (f, w, d) => FITS.cafe(f, w, d, g, y));
  unit(g, { x0: -28, x1: -16, z0: -9.5, z1: -16.5 }, y, (f, w, d) => FITS.restaurant(f, w, d, g, y));
  // Café terrace on the front, food court with stalls behind
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 3; j++) {
      const x = 14.5 + i * 4.6;
      const z = 11.5 + j * 4.2;
      roundTable(g, x, y, z, 0.45);
      chair(g, x - 0.75, y, z, 1, C.fabricGreen);
      chair(g, x + 0.75, y, z, 3, C.fabricGreen);
    }
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) diningSet(g, 18 + i * 3.6, y, -6.5 + j * 3);
  for (let i = 0; i < 4; i++) {
    const x0 = 16 + i * 5.2;
    block(g, x0, y, -13, 0.12, 2.6, 7, "stone", C.wall);
    counter(g, x0 + 2.6, y, -10.2, 0, 4.4, pick(g, BRAND));
    block(g, x0 + 2.6, y, -15.6, 4.6, 0.9, 1.0, "metal", C.steel);
    block(g, x0 + 2.6, y + 2.0, -15.6, 4.6, 0.6, 1.2, "metal", C.steel);
    block(g, x0 + 2.6, y + 2.3, -10.0, 3.6, 0.7, 0.05, "glow", C.screen);
  }
  block(g, 36.9, y, -13, 0.12, 2.6, 7, "stone", C.wall);
  for (const z of [-7.5, 7.5]) for (const x of [-36, -30]) plant(g, x, y, z, 1.2);
}

function podiumL3(g: G, y: number) {
  // Grand ballroom: stage, screen, dance floor, banquet rounds
  block(g, 26.5, y, 3, 21, 0.03, 38, "stone", [0.62, 0.5, 0.46, 1]);
  for (const x of [16, 37]) block(g, x, y, 3, 0.14, 3.4, 38, "stone", C.wall);
  for (const z of [-16, 22]) block(g, 26.5, y, z, 21, 3.4, 0.14, "stone", C.wall);
  block(g, 26.5, y, -13.6, 15, 0.8, 4.4, "wood", C.woodDark);
  block(g, 26.5, y + 0.8, -15.75, 12, 3.0, 0.1, "glow", C.videoWall);
  for (const s of [-1, 1]) block(g, 26.5 + s * 7, y + 0.8, -14.5, 0.7, 1.6, 0.6, "stone", C.dark);
  block(g, 22, y + 0.8, -12.4, 0.6, 1.1, 0.5, "wood", C.woodLight);
  block(g, 26.5, y, -8.5, 9, 0.04, 4.5, "wood", [0.6, 0.45, 0.3, 1]);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) banquet(g, 19.6 + i * 4.6, y, -4 + j * 4.4);
  // Pre-function foyer and registration
  for (const x of [0, 8]) counter(g, x, y, 8, 0, 3, C.woodLight);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++) {
      const x = -1 + i * 3.6;
      const z = 13 + j * 5;
      g.cylinder(x, y + 1.05, z, 0.38, 0.05, "stone", C.linen, 12);
      g.cylinder(x, y, z, 0.05, 1.05, "metal", C.dark, 6);
    }
  for (const x of [-2, 2, 6]) block(g, x, y, 21.5, 0.8, 2.0, 0.05, "stone", pick(g, BRAND));
  // Meeting rooms: glazed fronts, boardroom tables, screens
  for (const [x0, x1] of [
    [-40, -29],
    [-29, -18],
    [-18, -7],
  ]) {
    const mid = (x0 + x1) / 2;
    for (const x of [x0, x1]) block(g, x, y, 16, 0.14, 2.8, 14, "stone", C.wall);
    block(g, mid, y, 23, x1 - x0, 2.8, 0.14, "stone", C.wall);
    pane(g, [x0, y, 9], [x1, y, 9], 2.8);
    boardroom(g, mid, y, 16, false, 7);
    block(g, mid, y + 0.9, 22.85, 3, 1.7, 0.06, "glow", C.screen);
  }
  // Back of house: banquet kitchen, chair store, AV room
  block(g, -34, y, -15.6, 11, 0.9, 1.0, "metal", C.steel);
  block(g, -34, y + 2.0, -15.6, 11, 0.6, 1.2, "metal", C.steel);
  for (const dx of [-3, 3]) block(g, -34 + dx, y, -11.5, 4, 0.9, 1.2, "metal", C.steel);
  for (let i = 0; i < 6; i++) block(g, -26 + i * 1.6, y, -14, 0.5, 1.6, 0.5, "stone", C.fabricWarm);
  for (let i = 0; i < 4; i++) {
    block(g, -12 + i * 1, y, -15.6, 0.6, 2.0, 0.9, "stone", C.dark);
    block(g, -12 + i * 1, y + 1.8, -15.13, 0.4, 0.05, 0.02, "green");
  }
  block(g, -6, y, -11.5, 2.4, 0.75, 0.8, "wood", C.stoneDark);
  for (let i = 0; i < 3; i++) block(g, -6.8 + i * 0.8, y + 0.75, -11.75, 0.6, 0.36, 0.04, "glow", C.screen);
}

function podiumL4(g: G, y: number) {
  // Open-plan co-working: paired desks
  block(g, -23, y, 16, 34, 0.03, 14, "stone", [0.56, 0.58, 0.6, 1]);
  for (const zc of [11.6, 15.8, 20]) {
    for (let x = -38.5; x < -8; x += 1.6) {
      workstation(g, x, y, zc - 0.38, 0);
      workstation(g, x, y, zc + 0.38, 2);
    }
  }
  // Glass meeting rooms and phone booths
  for (const [x0, x1] of [
    [-6, 1],
    [1, 8],
  ]) {
    const mid = (x0 + x1) / 2;
    for (const x of [x0, x1]) pane(g, [x, y, 9], [x, y, 16], 2.6);
    pane(g, [x0, y, 9], [x1, y, 9], 2.6);
    pane(g, [x0, y, 16], [x1, y, 16], 2.6);
    boardroom(g, mid, y, 12.5, false, 4);
  }
  for (let i = 0; i < 4; i++) {
    const x = -4.5 + i * 3.6;
    block(g, x, y, 20.5, 1.2, 2.3, 1.2, "balconyGlass");
    block(g, x, y, 20.5, 0.5, 0.45, 0.5, "stone", C.fabricGreen);
  }
  // Fitness centre
  block(g, 26, y, 16, 22, 0.03, 14, "stone", C.rubber);
  for (let i = 0; i < 12; i++) treadmill(g, 16.5 + i * 1.7, y, 20.6, 0);
  for (let i = 0; i < 12; i++) bike(g, 16.5 + i * 1.7, y, 17.4, 0);
  for (let i = 0; i < 3; i++) weightBench(g, 18 + i * 3.5, y, 12, 0);
  for (let i = 0; i < 4; i++)
    block(g, 30 + (i % 2) * 2.4, y, 11 + Math.floor(i / 2) * 2.6, 0.8, 0.02, 2, "stone", pick(g, GOODS));
  pane(g, [15, y, 9], [37, y, 9], 2.6);
  // Private offices, server room, pantry
  for (let i = 0; i < 4; i++) {
    const x0 = -40 + i * 9;
    block(g, x0, y, -13, 0.12, 2.6, 7, "stone", C.wall);
    pane(g, [x0, y, -9.5], [x0 + 9, y, -9.5], 2.6);
    workstation(g, x0 + 4.5, y, -14.6, 0);
    for (const s of [-1, 1]) chair(g, x0 + 4.5 + s * 0.6, y, -12.6, 2, C.fabricWarm);
    shelf(g, x0 + 4.5, y, -16.2, 0, 3, 2.0, C.woodDark);
  }
  block(g, -4, y, -13, 0.12, 2.6, 7, "stone", C.wall);
  block(g, 5, y, -13, 18, 0.03, 7, "stone", C.coreFloor);
  for (const z of [-15, -12])
    for (let i = 0; i < 6; i++) {
      block(g, -1.5 + i * 0.9, y, z, 0.8, 2.1, 1.1, "stone", C.dark);
      block(g, -1.5 + i * 0.9, y + 1.9, z + (z < -13 ? 0.56 : -0.56), 0.5, 0.04, 0.02, "green");
    }
  block(g, 6.5, y, -13.5, 1.8, 1.9, 0.9, "metal", C.steel);
  block(g, 14, y, -13, 0.12, 2.6, 7, "stone", C.wall);
  counter(g, 20.5, y, -15.6, 0, 8, C.white);
  block(g, 25.5, y, -15.6, 0.9, 1.9, 0.8, "metal", C.steel);
  for (let i = 0; i < 2; i++) diningSet(g, 18 + i * 3.6, y, -11.6, C.fabricGreen);
}

/** Podium floor programme; `cut` = this is the sliced floor (section height applies) */
export function podiumFloor(g: G, id: string, y: number, cut: boolean) {
  const level = id === "G" ? 0 : Number(id.slice(1));
  podiumCommon(g, level, y, cut);
  [podiumG, podiumL1, podiumL2, podiumL3, podiumL4][level](g, y);
}
