// Surrounding city: a street grid out to ±1,200 m so the site never floats in
// empty space at full zoom-out. Blocks hold sidewalks, street trees, parks and
// buildings in a muted palette with a low-contrast window texture (`facade`
// material). Heights rise with distance from the site so nothing in front of
// the camera hides the hotel tower, and stay below the lowest orbit height
// (~83 m at full zoom-out) wherever the camera can reach. About a third of the
// lots and a quarter of the blocks are open green space so the context stays light.
import { GeometryBuilder, type RGBA } from "./builder";

/** City extent (m) — the far edge sits in full fog from any camera position (look.ts FOG_RANGE) */
const EXTENT = 1200;
/** Grid pitch (m): roads every 110 m outward from the site */
const PITCH = 110;
const outward = (from: number, step: number) =>
  Array.from({ length: Math.floor((EXTENT - 60 - Math.abs(from)) / PITCH) + 1 }, (_, i) => from + i * step);
/** Roads running north–south, at these x (14 m wide) */
export const X_ROADS = [...outward(-150, -PITCH).reverse(), ...outward(150, PITCH)];
/** Roads running east–west; z 54 is the site's avenue (30 m) */
export const Z_ROADS: { z: number; w: number }[] = [
  ...outward(-100, -PITCH)
    .reverse()
    .map((z) => ({ z, w: 14 })),
  { z: 54, w: 30 },
  ...outward(164, PITCH).map((z) => ({ z, w: 14 })),
];
/** The project site (plinth) — the city leaves it alone */
export const SITE = { x0: -111, x1: 111, z0: -77, z1: 75 };
/** The site plinth box (site.ts): 220 × 150 m, top at −0.35 m */
const PLINTH = { x0: -110, x1: 110, z0: -76, z1: 74 };
/** City street level: 25 cm below the plinth top, so the plinth edge reads as a kerb */
export const GROUND_Y = -0.6;
/** The skywalk (site.ts) lands in a transit station west of the site */
const STATION = { x: -131, z: 13, w: 22, d: 38, h: 15 };

type Rect = { x0: number; x1: number; z0: number; z1: number };

// Muted greys so the context stays behind the hotel tower
const FACADE: RGBA[] = [
  [0.76, 0.78, 0.79, 1],
  [0.68, 0.72, 0.75, 1],
  [0.8, 0.77, 0.72, 1],
  [0.62, 0.67, 0.71, 1],
  [0.72, 0.74, 0.72, 1],
  [0.58, 0.63, 0.68, 1],
  [0.7, 0.68, 0.66, 1],
];
const ROOF: RGBA = [0.5, 0.54, 0.56, 1];
const SIDEWALK: RGBA = [0.66, 0.68, 0.67, 1];
const GRASS: RGBA = [0.42, 0.54, 0.42, 1];
const MARKING: RGBA = [0.72, 0.75, 0.7, 1];
export const CAR_COLORS: RGBA[] = [
  [0.79, 0.82, 0.84, 1],
  [0.38, 0.46, 0.54, 1],
  [0.65, 0.31, 0.31, 1],
  [0.74, 0.74, 0.66, 1],
  [0.2, 0.22, 0.25, 1],
];

/** Tallest building allowed at distance r from the site centre: 60 m inside the camera's reach, a taller skyline beyond */
const maxHeight = (r: number) => Math.min(r < 720 ? 40 : 55, 9 + Math.max(0, r - 110) * 0.14);
const intersects = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

/** Box whose sides use the tiling window texture at real-world scale; roof in plain stone */
function facadeBox(
  g: GeometryBuilder,
  x: number,
  y0: number,
  z: number,
  w: number,
  h: number,
  d: number,
  col: RGBA,
  tile: number,
  uOff: number,
) {
  const [a, b, l, t, f, k] = [x - w / 2, x + w / 2, y0, y0 + h, z + d / 2, z - d / 2];
  const uv = (len: number): [number, number][] => [
    [uOff, 0],
    [uOff + len / tile, 0],
    [uOff + len / tile, h / tile],
    [uOff, h / tile],
  ];
  g.quad([a, l, f], [b, l, f], [b, t, f], [a, t, f], "facade", col, uv(w));
  g.quad([b, l, k], [a, l, k], [a, t, k], [b, t, k], "facade", col, uv(w));
  g.quad([b, l, f], [b, l, k], [b, t, k], [b, t, f], "facade", col, uv(d));
  g.quad([a, l, k], [a, l, f], [a, t, f], [a, t, k], "facade", col, uv(d));
  g.quad([a, t, f], [b, t, f], [b, t, k], [a, t, k], "stone", ROOF);
}

/** Light city tree: tapered trunk and one smooth crown (fewer vertices than the site's trees — there are thousands) */
function cityTree(g: GeometryBuilder, x: number, z: number, s: number) {
  g.trunk(x, GROUND_Y + 0.25, z, 0.2 * s, 0.12 * s, 3.4 * s);
  const w = 1.8 + g.rand() * 0.5;
  g.blob(x, 4.3 * s, z, w * s, 2.0 * s, w * s, [0.21 + g.rand() * 0.08, 0.36 + g.rand() * 0.12, 0.18, 1], 6, 4);
}

/** Cells between the roads, minus the site */
function cityRects(): Rect[] {
  const xs = [
    { lo: -EXTENT, hi: X_ROADS[0] - 7 },
    ...X_ROADS.map((x, i) => ({ lo: x + 7, hi: (X_ROADS[i + 1] ?? EXTENT + 7) - 7 })),
  ];
  const zs = [
    { lo: -EXTENT, hi: Z_ROADS[0].z - Z_ROADS[0].w / 2 },
    ...Z_ROADS.map((r, i) => {
      const next = Z_ROADS[i + 1];
      return { lo: r.z + r.w / 2, hi: next ? next.z - next.w / 2 : EXTENT };
    }),
  ];
  const out: Rect[] = [];
  for (const cx of xs)
    for (const cz of zs) {
      const cell = { x0: cx.lo, x1: cx.hi, z0: cz.lo, z1: cz.hi };
      if (!intersects(cell, SITE)) {
        out.push(cell);
        continue;
      }
      // Split around the site: west, east, then the strips behind and in front of it
      const pieces: Rect[] = [
        { ...cell, x1: SITE.x0 },
        { ...cell, x0: SITE.x1 },
        { x0: Math.max(cell.x0, SITE.x0), x1: Math.min(cell.x1, SITE.x1), z0: cell.z0, z1: SITE.z0 },
        { x0: Math.max(cell.x0, SITE.x0), x1: Math.min(cell.x1, SITE.x1), z0: SITE.z1, z1: cell.z1 },
      ];
      out.push(...pieces.filter((p) => p.x1 - p.x0 > 8 && p.z1 - p.z0 > 8));
    }
  return out;
}

function park(g: GeometryBuilder, r: Rect) {
  const [cx, cz] = [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
  g.box(cx, 0.02, cz, r.x1 - r.x0 - 6, 0.12, r.z1 - r.z0 - 6, "stone", GRASS);
  g.box(cx, 0.1, cz, r.x1 - r.x0 - 6, 0.04, 3, "stone", SIDEWALK);
  g.box(cx, 0.1, cz, 3, 0.04, r.z1 - r.z0 - 6, "stone", SIDEWALK);
  for (let x = r.x0 + 8; x < r.x1 - 5; x += 11)
    for (let z = r.z0 + 8; z < r.z1 - 5; z += 11)
      if (Math.abs(x - cx) > 4 && Math.abs(z - cz) > 4 && g.rand() < 0.75)
        cityTree(g, x + g.rand() * 3, z + g.rand() * 3, 0.8 + g.rand() * 0.4);
}

function buildings(g: GeometryBuilder, r: Rect) {
  const w = r.x1 - r.x0,
    d = r.z1 - r.z0;
  const nx = Math.max(1, Math.round(w / 42)),
    nz = Math.max(1, Math.round(d / 42));
  const lw = (w - 6) / nx,
    ld = (d - 6) / nz;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x = r.x0 + 3 + lw * (i + 0.5),
        z = r.z0 + 3 + ld * (j + 0.5);
      const dist = Math.hypot(x, z);
      if (g.rand() < 0.35) {
        // Open lot: lawn with a few trees — keeps the city from reading as a wall of boxes
        g.box(x, 0.02, z, lw - 4, 0.12, ld - 4, "stone", GRASS);
        for (let k = 0; k < 3; k++) cityTree(g, x + (g.rand() - 0.5) * lw * 0.6, z + (g.rand() - 0.5) * ld * 0.6, 0.9);
        continue;
      }
      const bw = lw - 10 - g.rand() * 8,
        bd = ld - 10 - g.rand() * 8;
      if (bw < 6 || bd < 6) continue;
      const h = maxHeight(dist) * (0.35 + 0.65 * g.rand());
      const col = FACADE[Math.floor(g.rand() * FACADE.length)];
      const tile = 10 + g.rand() * 4;
      const uOff = g.rand();
      if (h > 24 && g.rand() < 0.5) {
        // Podium with a slimmer tower set back on it
        const ph = 8 + g.rand() * 5;
        facadeBox(g, x, 0, z, bw, ph, bd, col, tile, uOff);
        const tw = bw * (0.55 + g.rand() * 0.2),
          td = bd * (0.55 + g.rand() * 0.2);
        const ox = (bw - tw) / 2 - 1,
          oz = (bd - td) / 2 - 1;
        facadeBox(
          g,
          x + (g.rand() - 0.5) * 2 * ox,
          ph,
          z + (g.rand() - 0.5) * 2 * oz,
          tw,
          h - ph,
          td,
          FACADE[Math.floor(g.rand() * FACADE.length)],
          tile,
          uOff,
        );
      } else facadeBox(g, x, 0, z, bw, h, bd, col, tile, uOff);
      // Rooftop plant on the nearer buildings
      if (dist < 420 && h > 12)
        g.box(
          x + (g.rand() - 0.5) * bw * 0.3,
          h + 1.1,
          z + (g.rand() - 0.5) * bd * 0.3,
          Math.min(8, bw * 0.3),
          2.2,
          Math.min(6, bd * 0.3),
          "base",
          [0.42, 0.47, 0.5, 1],
        );
    }
}

function streetTrees(g: GeometryBuilder, r: Rect) {
  const edge = 1.8;
  for (let x = r.x0 + 6; x < r.x1 - 4; x += 16) for (const z of [r.z0 + edge, r.z1 - edge]) cityTree(g, x, z, 0.75);
  for (let z = r.z0 + 14; z < r.z1 - 12; z += 16) for (const x of [r.x0 + edge, r.x1 - edge]) cityTree(g, x, z, 0.75);
}

export function buildCity() {
  const g = new GeometryBuilder(61813);

  // Asphalt city floor around (never under) the site plinth, and a muted outer
  // ground that fog swallows. Both sit well below the plinth top (−0.35 m):
  // coplanar or near-coplanar floors z-fight (flicker) at viewing distance.
  const R = EXTENT + 20;
  const ground = (x0: number, x1: number, z0: number, z1: number, y: number, mat: "road" | "base", col?: RGBA) =>
    g.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], mat, col, [
      [x0 / 24, z1 / 24],
      [x1 / 24, z1 / 24],
      [x1 / 24, z0 / 24],
      [x0 / 24, z0 / 24],
    ]);
  const P = PLINTH;
  ground(-R, R, -R, P.z0, GROUND_Y, "road");
  ground(-R, R, P.z1, R, GROUND_Y, "road");
  ground(-R, P.x0, P.z0, P.z1, GROUND_Y, "road");
  ground(P.x1, R, P.z0, P.z1, GROUND_Y, "road");
  const O = 2600;
  const outer: RGBA = [0.42, 0.48, 0.48, 1];
  ground(-O, O, R, O, GROUND_Y - 0.05, "base", outer);
  ground(-O, O, -O, -R, GROUND_Y - 0.05, "base", outer);
  ground(-O, -R, -R, R, GROUND_Y - 0.05, "base", outer);
  ground(R, O, -R, R, GROUND_Y - 0.05, "base", outer);

  // Blocks: sidewalk slab, then a park or buildings with street trees near the site
  for (const r of cityRects()) {
    const [cx, cz] = [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
    const dist = Math.hypot(cx, cz);
    g.box(cx, -0.34, cz, r.x1 - r.x0, 0.55, r.z1 - r.z0, "stone", SIDEWALK);
    const small = r.x1 - r.x0 < 26 || r.z1 - r.z0 < 26;
    const isStation = r.x1 === SITE.x0 && r.z0 < STATION.z && r.z1 > STATION.z;
    if (isStation) {
      facadeBox(g, STATION.x, 0, STATION.z, STATION.w, STATION.h, STATION.d, [0.62, 0.7, 0.74, 1], 9, 0);
      g.box(STATION.x, STATION.h + 0.4, STATION.z, STATION.w + 2, 0.8, STATION.d + 2, "metal");
      for (const z of [r.z0 + 8, r.z1 - 8]) cityTree(g, STATION.x, z, 0.8);
    } else if (small) {
      for (let x = r.x0 + 5; x < r.x1 - 3; x += 10)
        for (let z = r.z0 + 5; z < r.z1 - 3; z += 10) cityTree(g, x, z, 0.8);
    } else if (g.rand() < 0.25 && dist < 900) park(g, r);
    else buildings(g, r);
    if (dist < 430 && !small && !isStation) streetTrees(g, r);
  }

  // Lane markings on the roads near the site (moving traffic: three/AmbientLife.tsx)
  const near = (x: number, z: number) => Math.hypot(x, z) < 480;
  const inSite = (x: number, z: number) => x > SITE.x0 - 4 && x < SITE.x1 + 4 && z > SITE.z0 - 4 && z < SITE.z1 + 4;
  const crossing = (v: number, roads: number[]) => roads.some((c) => Math.abs(v - c) < 12);
  const zs = Z_ROADS.map((r) => r.z);
  for (const x of X_ROADS)
    for (let z = -EXTENT; z < EXTENT; z += 12)
      if (near(x, z) && !crossing(z, zs)) g.box(x, GROUND_Y + 0.03, z, 0.22, 0.03, 5.5, "stone", MARKING);
  for (const { z } of Z_ROADS)
    for (let x = -EXTENT; x < EXTENT; x += 12)
      if (near(x, z) && !inSite(x, z) && !crossing(x, X_ROADS))
        g.box(x, GROUND_Y + 0.03, z, 5.5, 0.03, 0.22, "stone", MARKING);

  return g.build();
}

export const CITY_FOR_TESTS = { cityRects, SITE, maxHeight };
