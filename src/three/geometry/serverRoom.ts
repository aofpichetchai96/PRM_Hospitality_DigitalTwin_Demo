// ICT scene: the server room on its own, built like the reference cut-away —
// a raised-floor hall with the racks (three/ServerRoomScene.tsx draws those,
// so they can be picked and show their fronts), cold-aisle containment with
// in-row coolers and perimeter CRACs, FM-200 piping and nozzles over the rows,
// cable trays, then the rooms round it behind translucent walls: NOC desks,
// generator room, FM-200 cylinder room and UPS / battery room. Origin = hall
// centre, floor at y 0.
import { GeometryBuilder, type RGBA, type Vec3 } from "./builder";

const C = {
  slab: [0.84, 0.85, 0.84, 1] as RGBA,
  tile: [0.9, 0.91, 0.9, 1] as RGBA,
  seam: [0.66, 0.68, 0.68, 1] as RGBA,
  perf: [0.6, 0.64, 0.66, 1] as RGBA,
  wall: [0.55, 0.58, 0.6, 0.28] as RGBA,
  wallTop: [0.38, 0.4, 0.42, 1] as RGBA,
  door: [0.17, 0.29, 0.23, 1] as RGBA,
  cooler: [0.17, 0.18, 0.2, 1] as RGBA,
  grille: [0.35, 0.37, 0.4, 1] as RGBA,
  crac: [0.86, 0.87, 0.88, 1] as RGBA,
  yellow: [0.95, 0.83, 0.18, 1] as RGBA,
  red: [0.86, 0.13, 0.14, 1] as RGBA,
  white: [0.95, 0.95, 0.94, 1] as RGBA,
  genset: [0.94, 0.72, 0.12, 1] as RGBA,
  motor: [0.55, 0.58, 0.6, 1] as RGBA,
  ups: [0.92, 0.93, 0.93, 1] as RGBA,
  battery: [0.25, 0.27, 0.3, 1] as RGBA,
  desk: [0.86, 0.85, 0.8, 1] as RGBA,
  dark: [0.12, 0.13, 0.15, 1] as RGBA,
  tray: [0.7, 0.72, 0.74, 1] as RGBA,
};

/** Hall and side rooms (m) */
export const SERVER_HALL = { x0: -8, x1: 8, z0: -6, z1: 6 } as const;
const H = 3.2;

const box = (
  g: GeometryBuilder,
  x: number,
  y0: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: Parameters<GeometryBuilder["box"]>[6],
  col?: RGBA,
) => g.box(x, y0 + h / 2, z, w, h, d, mat, col);

/** Translucent wall from a to b with an optional door gap (door from `d0` to `d1` metres along it) */
function wall(g: GeometryBuilder, a: [number, number], b: [number, number], door?: [number, number]) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const at = (t: number): [number, number] => [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len];
  const spans: [number, number][] = door
    ? [
        [0, door[0]],
        [door[1], len],
      ]
    : [[0, len]];
  for (const [t0, t1] of spans) {
    if (t1 - t0 < 0.05) continue;
    const [x0, z0] = at(t0);
    const [x1, z1] = at(t1);
    const p: Vec3[] = [
      [x0, 0, z0],
      [x1, 0, z1],
      [x1, H, z1],
      [x0, H, z0],
    ];
    g.quad(p[0], p[1], p[2], p[3], "transparent", C.wall);
    g.quad(p[1], p[0], p[3], p[2], "transparent", C.wall);
    g.line([x0, H, z0], [x1, H, z1], 0.08, "metal", C.wallTop);
  }
  if (door) {
    // Steel door, half open, with a vision panel and a frame
    const [dx, dz] = at((door[0] + door[1]) / 2);
    const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
    const w = door[1] - door[0];
    box(g, dx, 0, dz, alongX ? w : 0.08, 2.15, alongX ? 0.08 : w, "stone", C.door);
    box(g, dx, 1.35, dz, alongX ? w * 0.35 : 0.1, 0.45, alongX ? 0.1 : w * 0.35, "glass", [0.7, 0.8, 0.85, 1]);
    box(g, dx, 2.15, dz, alongX ? w + 0.2 : 0.14, 0.14, alongX ? 0.14 : w + 0.2, "metal", C.dark);
  }
}

/** Wall-mounted red extinguisher */
const extinguisher = (g: GeometryBuilder, x: number, z: number) => {
  g.cylinder(x, 0.3, z, 0.11, 0.55, "stone", C.red, 10);
  g.cylinder(x, 0.85, z, 0.04, 0.1, "metal", C.dark, 6);
};

export function buildServerRoom() {
  const g = new GeometryBuilder(40961);
  const hall = SERVER_HALL;

  // Slab and the raised floor of the hall (600 mm tiles), perforated tiles in the cold aisles
  box(g, -1, -0.35, 2.25, 29.4, 0.35, 17.4, "stone", C.slab);
  box(g, 0, 0, 0, hall.x1 - hall.x0, 0.02, hall.z1 - hall.z0, "stone", C.tile);
  for (let x = hall.x0; x <= hall.x1 + 0.01; x += 0.6) box(g, x, 0.02, 0, 0.025, 0.004, 12, "stone", C.seam);
  for (let z = hall.z0; z <= hall.z1 + 0.01; z += 0.6) box(g, 0, 0.02, z, 16, 0.004, 0.025, "stone", C.seam);
  for (let x = -2.1; x <= 2.11; x += 0.6) box(g, x, 0.02, 0, 0.56, 0.006, 0.56, "stone", C.perf);
  for (let z = -0.9; z <= 0.91; z += 0.6) box(g, 4.5, 0.02, z, 0.56, 0.006, 0.56, "stone", C.perf);
  // Floor finish of the side rooms
  box(g, -11.5, 0, 0, 7, 0.02, 12, "stone", [0.7, 0.72, 0.72, 1]);
  box(g, 10.5, 0, 0, 5, 0.02, 12, "stone", [0.78, 0.79, 0.79, 1]);
  box(g, 0, 0, 8, 16, 0.02, 4, "stone", [0.8, 0.8, 0.78, 1]);

  // Yellow safety lines in front of every rack row
  for (const z of [-1.0, 1.0]) box(g, 0, 0.025, z, 4.8, 0.004, 0.08, "stone", C.yellow);
  box(g, 4.8, 0.025, 0, 0.08, 0.004, 2.6, "stone", C.yellow);
  for (const x of [-2.4, 2.4]) box(g, x, 0.025, 0, 0.08, 0.004, 2.0, "stone", C.yellow);

  // In-row coolers at both ends of rows A and B; perimeter CRAC units on the north wall
  for (const x of [-2.1, 2.1])
    for (const [z, f] of [
      [-1.6, 1],
      [1.6, -1],
    ] as const) {
      box(g, x, 0, z, 0.6, 2.0, 1.1, "stone", C.cooler);
      for (let i = 0; i < 9; i++) box(g, x, 0.2 + i * 0.2, z + f * 0.56, 0.5, 0.03, 0.01, "metal", C.grille);
    }
  for (const x of [-5, 5]) {
    box(g, x, 0, -5.45, 2.2, 1.95, 0.9, "stone", C.crac);
    box(g, x, 1.2, -4.99, 1.6, 0.5, 0.02, "metal", C.grille);
    box(g, x - 0.6, 1.5, -4.99, 0.3, 0.18, 0.02, "glow", [0.36, 0.66, 0.92, 1]);
  }
  // Cold-aisle containment: glass roof and sliding end doors between rows A and B
  box(g, 0, 2.0, 0, 4.8, 0.03, 2.0, "transparent", [0.55, 0.75, 0.85, 0.3]);
  for (const x of [-2.42, 2.42]) {
    g.quad([x, 0, -1.05], [x, 0, 1.05], [x, 2.0, 1.05], [x, 2.0, -1.05], "transparent", [0.55, 0.75, 0.85, 0.3]);
    g.quad([x, 0, 1.05], [x, 0, -1.05], [x, 2.0, -1.05], [x, 2.0, 1.05], "transparent", [0.55, 0.75, 0.85, 0.3]);
  }

  // Cable trays over the rows, and the FM-200 pipe with nozzles over the hall, running to the cylinder room
  for (const z of [-1.6, 1.6]) g.line([-2.6, 2.3, z], [2.6, 2.3, z], 0.3, "metal", C.tray);
  g.line([5.4, 2.3, -1.4], [5.4, 2.3, 1.4], 0.3, "metal", C.tray);
  g.line([-2.6, 2.3, -1.6], [-2.6, 2.3, -4.5], 0.3, "metal", C.tray);
  const pipe: Vec3[] = [
    [-5.5, 2.75, -0.2],
    [5.5, 2.75, -0.2],
    [10.5, 2.75, -0.2],
    [10.5, 2.75, -2.5],
  ];
  for (let i = 0; i < pipe.length - 1; i++) g.line(pipe[i], pipe[i + 1], 0.09, "stone", C.red);
  for (const x of [-4, -1.5, 1.5, 4]) {
    g.line([x, 2.75, -0.2], [x, 2.75, -2.8], 0.07, "stone", C.red);
    g.line([x, 2.75, -0.2], [x, 2.75, 2.8], 0.07, "stone", C.red);
    for (const z of [-2.8, 2.8]) g.cylinder(x, 2.6, z, 0.09, 0.15, "stone", C.white, 10);
  }

  // Walls: the hall, NOC to the south, generator room west, FM-200 and UPS rooms east
  wall(g, [-15, -6], [13, -6]);
  wall(g, [-15, -6], [-15, 10]);
  wall(g, [-15, 10], [13, 10]);
  wall(g, [13, -6], [13, 10]);
  wall(g, [-8, -6], [-8, 6], [8, 9]);
  wall(g, [8, -6], [8, 0], [2.5, 3.5]);
  wall(g, [8, 0], [8, 6], [2.5, 3.5]);
  wall(g, [-8, 6], [8, 6], [3, 4]);
  wall(g, [8, 0], [13, 0]);
  wall(g, [-15, 6], [-8, 6]);
  wall(g, [8, 6], [13, 6]);
  for (const [x, z] of [
    [-7.8, -5],
    [7.8, 5],
    [-14.8, -5],
    [12.8, -5],
    [-5, 9.8],
  ] as const)
    extinguisher(g, x, z);

  // NOC: three operator desks with dual screens facing a video wall
  // Video wall on the NOC side of the hall wall: three panels
  for (const x of [-1.6, 0, 1.6]) box(g, x, 1.1, 6.12, 1.5, 0.85, 0.04, "glow", [0.24, 0.5, 0.7, 1]);
  for (const x of [-4.5, 0, 4.5]) {
    box(g, x, 0.72, 8.6, 2.2, 0.05, 0.8, "stone", C.desk);
    for (const s of [-1, 1]) box(g, x + s * 1, 0, 8.6, 0.06, 0.72, 0.7, "metal", C.dark);
    for (const s of [-0.48, 0.48]) {
      box(g, x + s, 0.82, 8.35, 0.85, 0.5, 0.04, "glow", [0.3, 0.6, 0.85, 1]);
      box(g, x + s, 0.77, 8.4, 0.1, 0.06, 0.1, "metal", C.dark);
    }
    box(g, x, 0, 9.3, 0.55, 0.45, 0.55, "stone", C.dark);
    box(g, x, 0.45, 9.55, 0.55, 0.5, 0.06, "stone", C.dark);
  }

  // Generator room: two diesel gensets with their alternator, exhaust and day tank
  for (const z of [-2.8, 2.8]) {
    box(g, -12, 0, z, 4.2, 0.25, 1.6, "metal", C.dark);
    box(g, -12.6, 0.25, z, 2.8, 1.7, 1.4, "stone", C.genset);
    for (let i = 0; i < 6; i++) box(g, -13.7 + i * 0.42, 1.0, z + 0.71, 0.3, 0.7, 0.02, "metal", C.dark);
    g.cylinder(-10.5, 0.6, z, 0.55, 0.01, "metal", C.motor, 16);
    box(g, -10.4, 0.35, z, 1.1, 0.9, 0.95, "stone", C.motor);
    g.line([-12.6, 1.95, z], [-12.6, 3.0, z], 0.22, "metal", C.dark);
  }
  box(g, -14.3, 0, 0, 1.0, 1.0, 1.8, "stone", C.motor);

  // FM-200 room: six cylinders on a red frame, the release panel, spare extinguishers
  box(g, 10.5, 0, -3.4, 2.2, 0.12, 1.6, "stone", C.red);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      const x = 9.85 + i * 0.65;
      const z = -3.75 + j * 0.7;
      g.cylinder(x, 0.12, z, 0.26, 1.4, "stone", C.red, 14);
      g.sphere(x, 1.52, z, 0.26, 0.16, 0.26, "stone", C.red, 10, 4);
      g.cylinder(x, 1.6, z, 0.06, 0.18, "metal", C.dark, 6);
    }
  box(g, 12.4, 0, -4.8, 0.9, 1.6, 0.6, "stone", C.white);
  box(g, 12.4, 1.1, -4.49, 0.5, 0.3, 0.02, "glow", [0.95, 0.3, 0.3, 1]);
  for (const z of [-1.2, -0.7]) extinguisher(g, 12.8, z);

  // UPS and battery room: UPS frames, then battery cabinets
  for (let i = 0; i < 3; i++) {
    box(g, 9.2 + i * 0.9, 0, 1.2, 0.8, 1.95, 0.9, "stone", C.ups);
    box(g, 9.2 + i * 0.9, 1.45, 1.66, 0.3, 0.2, 0.02, "glow", [0.3, 0.85, 0.6, 1]);
  }
  for (let i = 0; i < 4; i++) box(g, 9.0 + i * 0.85, 0, 4.4, 0.75, 1.9, 0.8, "stone", C.battery);

  return g.build();
}
