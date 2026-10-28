// Landscape on the site plinth around the hotel: six gardens on the open
// ground beyond the plaza, each with lawns, a cross of walkways, a round
// terrace with a fountain or a pavilion, trees, benches, flower beds and lamp
// posts; and the lamp posts along the avenue sidewalk. Lamp bulbs use the
// windowLight material, so they only show (and glow) at dusk; their ground
// pools are three/SiteLamps.tsx, from the same SITE_LAMPS list.
import type { GeometryBuilder, RGBA } from "./builder";

type Rect = { x0: number; x1: number; z0: number; z1: number };

/** Plinth top (site.ts) — the gardens sit on it, below the plaza (0.13) */
const GROUND = -0.35;
/** Sidewalks along the avenue, level with the plaza */
export const SIDEWALK_TOP = 0.13;
const LAMP_HEIGHT = 4.2;

const PAVE: RGBA = [0.77, 0.76, 0.72, 1];
const TERRACE: RGBA = [0.7, 0.68, 0.63, 1];
const LAWN: RGBA = [0.42, 0.56, 0.35, 1];
const HEDGE: RGBA = [0.2, 0.34, 0.2, 1];
const FLOWERS: RGBA[] = [
  [0.88, 0.42, 0.56, 1],
  [0.96, 0.8, 0.34, 1],
  [0.95, 0.94, 0.9, 1],
  [0.86, 0.36, 0.3, 1],
];
const POLE: RGBA = [0.18, 0.2, 0.22, 1];

/**
 * Garden plots on the plinth: west and east of the plaza (clear of the plant house at x ≤ 66), and behind the hotel.
 * The front strip (z > 29) is the promenade along the avenue.
 */
export const GARDENS: readonly Rect[] = [
  { x0: -109, x1: -62, z0: -75, z1: -21 },
  { x0: -109, x1: -62, z0: -19, z1: 29 },
  { x0: 68, x1: 109, z0: -75, z1: -21 },
  { x0: 68, x1: 109, z0: -19, z1: 29 },
  { x0: -60, x1: 2, z0: -75, z1: -38 },
  { x0: 4, x1: 66, z0: -75, z1: -38 },
];

/** Skywalk columns stand in the west garden (site.ts): trees keep clear of them */
const OBSTACLES: [number, number][] = [
  [-98, 13],
  [-78, 13],
];

/** Walkway half width (the cross through each garden) and the edge path */
const HALF = 1.8;
const EDGE = 3;
/** Round terrace at the crossing */
const HUB = 6.5;

export type SiteLamp = { x: number; z: number; ground: number };

/** Lamp posts in a garden: along both walkways, every ~12 m, alternating sides, plus the four outer corners */
function gardenLamps(r: Rect): SiteLamp[] {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const out: SiteLamp[] = [];
  for (const dir of [-1, 1]) {
    let k = 0;
    for (let d = HUB + 4; d < (r.x1 - r.x0) / 2 - EDGE; d += 12, k++)
      out.push({ x: cx + dir * d, z: cz + (k % 2 ? 1 : -1) * (HALF + 0.5), ground: GROUND });
    k = 0;
    for (let d = HUB + 4; d < (r.z1 - r.z0) / 2 - EDGE; d += 12, k++)
      out.push({ x: cx + (k % 2 ? 1 : -1) * (HALF + 0.5), z: cz + dir * d, ground: GROUND });
  }
  for (const x of [r.x0 + 1.4, r.x1 - 1.4])
    for (const z of [r.z0 + 1.4, r.z1 - 1.4]) out.push({ x, z, ground: GROUND });
  return out;
}

/** Sidewalk lamps on both sides of the avenue, between the street trees, clear of the zebra (x −39…−29.5) */
function avenueLamps(): SiteLamp[] {
  const out: SiteLamp[] = [];
  for (let x = -97.5; x < 110; x += 15) {
    if (x > -44 && x < -24) continue;
    out.push({ x, z: 38.3, ground: SIDEWALK_TOP });
    out.push({ x: x + 7.5, z: 70.2, ground: SIDEWALK_TOP });
  }
  return out;
}

/** Every lamp on the site, for the dusk light pools */
export const SITE_LAMPS: readonly SiteLamp[] = [...GARDENS.flatMap(gardenLamps), ...avenueLamps()];

/** Post-top lamp: base, pole, a short arm and the lantern; the bulb shows at dusk only (windowLight) */
function lamp(g: GeometryBuilder, l: SiteLamp) {
  const y = l.ground;
  g.cylinder(l.x, y, l.z, 0.16, 0.35, "metal", POLE, 8);
  g.cylinder(l.x, y + 0.35, l.z, 0.07, LAMP_HEIGHT - 0.35, "metal", POLE, 6);
  g.box(l.x, y + LAMP_HEIGHT + 0.08, l.z, 0.62, 0.14, 0.42, "metal", POLE);
  g.box(l.x, y + LAMP_HEIGHT - 0.02, l.z, 0.5, 0.06, 0.3, "windowLight");
}

function bench(g: GeometryBuilder, x: number, z: number, alongX: boolean) {
  const [w, d] = alongX ? [1.8, 0.5] : [0.5, 1.8];
  g.box(x, GROUND + 0.42, z, w, 0.08, d, "wood", [0.55, 0.4, 0.27, 1]);
  for (const s of [-0.7, 0.7])
    g.box(alongX ? x + s : x, GROUND + 0.2, alongX ? z : z + s, 0.08, 0.4, 0.08, "metal", POLE);
}

/** Round terrace at the crossing: a fountain, or a pavilion with a roof */
function hub(g: GeometryBuilder, cx: number, cz: number, pavilion: boolean) {
  g.cylinder(cx, GROUND, cz, HUB, 0.16, "stone", TERRACE, 24);
  if (pavilion) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.cylinder(
        cx + Math.cos(a) * 2.6,
        GROUND + 0.16,
        cz + Math.sin(a) * 2.6,
        0.12,
        2.8,
        "wood",
        [0.86, 0.84, 0.8, 1],
        6,
      );
    }
    g.cylinder(cx, GROUND + 2.96, cz, 3.3, 0.18, "stone", [0.5, 0.36, 0.3, 1], 6);
    g.cylinder(cx, GROUND + 3.14, cz, 2.2, 0.5, "stone", [0.5, 0.36, 0.3, 1], 6);
    for (const [dx, dz] of [
      [-1.2, 0],
      [1.2, 0],
    ])
      bench(g, cx + dx, cz + dz, false);
    return;
  }
  g.cylinder(cx, GROUND + 0.16, cz, 3.2, 0.5, "stone", [0.86, 0.85, 0.82, 1], 20);
  g.cylinder(cx, GROUND + 0.62, cz, 2.9, 0.06, "glass", [0.3, 0.64, 0.8, 1], 20);
  g.cylinder(cx, GROUND + 0.66, cz, 0.6, 0.7, "stone", [0.86, 0.85, 0.82, 1], 10);
  g.cylinder(cx, GROUND + 1.36, cz, 1.1, 0.12, "stone", [0.86, 0.85, 0.82, 1], 12);
  g.cylinder(cx, GROUND + 1.48, cz, 0.95, 0.04, "glass", [0.3, 0.64, 0.8, 1], 12);
}

const clear = (x: number, z: number) => OBSTACLES.every(([ox, oz]) => Math.hypot(x - ox, z - oz) > 4);

function garden(g: GeometryBuilder, r: Rect, index: number) {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  // Paving over the plot (the walkways), then four lawns raised a little above it
  g.box(cx, GROUND + 0.02, cz, w, 0.04, d, "stone", PAVE);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const lx0 = sx < 0 ? r.x0 + EDGE : cx + HALF;
      const lx1 = sx < 0 ? cx - HALF : r.x1 - EDGE;
      const lz0 = sz < 0 ? r.z0 + EDGE : cz + HALF;
      const lz1 = sz < 0 ? cz - HALF : r.z1 - EDGE;
      const shade = 0.94 + g.rand() * 0.1;
      g.box((lx0 + lx1) / 2, GROUND + 0.06, (lz0 + lz1) / 2, lx1 - lx0, 0.12, lz1 - lz0, "stone", [
        LAWN[0] * shade,
        LAWN[1] * shade,
        LAWN[2] * shade,
        1,
      ]);
      // Low hedge along the lawn's outer long edge, with a gap in the middle
      const outerZ = sz < 0 ? lz0 + 0.5 : lz1 - 0.5;
      const len = (lx1 - lx0) / 2 - 2;
      for (const s of [-1, 1])
        g.box((lx0 + lx1) / 2 + s * (len / 2 + 1), GROUND + 0.4, outerZ, len, 0.6, 0.7, "foliage", HEDGE);
      // Flower bed at the lawn corner nearest the terrace
      const fx = sx < 0 ? lx1 - 2.2 : lx0 + 2.2;
      const fz = sz < 0 ? lz1 - 2.2 : lz0 + 2.2;
      g.cylinder(fx, GROUND + 0.12, fz, 1.6, 0.18, "stone", [0.42, 0.32, 0.24, 1], 12);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + g.rand();
        g.blob(
          fx + Math.cos(a) * 0.9,
          GROUND + 0.45,
          fz + Math.sin(a) * 0.9,
          0.38,
          0.22,
          0.38,
          FLOWERS[(k + index) % FLOWERS.length],
          5,
          3,
        );
      }
      // Trees along the lawn's outer edges, a few more inside, none in the terrace corner
      for (let x = lx0 + 3; x < lx1 - 2; x += 8.5) {
        const z = sz < 0 ? lz0 + 2.6 : lz1 - 2.6;
        if (clear(x, z)) g.tree(x + (g.rand() - 0.5), z, GROUND + 0.12, 0.85 + g.rand() * 0.25);
      }
      for (let k = 0; k < 2; k++) {
        const x = lx0 + 3 + g.rand() * (lx1 - lx0 - 6);
        const z = lz0 + 3 + g.rand() * (lz1 - lz0 - 6);
        if (Math.abs(x - cx) > HUB + 3 && Math.abs(z - cz) > HUB + 3 && clear(x, z))
          g.tree(x, z, GROUND + 0.12, 0.9 + g.rand() * 0.3);
      }
    }
  hub(g, cx, cz, index % 2 === 1);
  // Benches facing the walkways, just outside the terrace
  for (const s of [-1, 1]) {
    bench(g, cx + s * (HUB + 2.5), cz - HALF - 0.6, true);
    bench(g, cx + HALF + 0.6, cz + s * (HUB + 2.5), false);
  }
  for (const l of gardenLamps(r)) lamp(g, l);
}

/**
 * Sidewalks and kerbs both sides of the avenue (the road is 21 cm below them), the promenade beyond the plaza ends,
 * then the gardens and the avenue lamp posts.
 */
export function buildLandscape(g: GeometryBuilder) {
  const SIDEWALK: RGBA = [0.7, 0.71, 0.68, 1];
  const KERB: RGBA = [0.82, 0.82, 0.8, 1];
  const top = SIDEWALK_TOP;
  // Near side: z 36.5…39 the full width; the promenade z 29…36.5 outside the plaza (x beyond ±60.5)
  g.box(0, (GROUND + top) / 2, 37.75, 220, top - GROUND, 2.5, "stone", SIDEWALK);
  for (const s of [-1, 1]) g.box(s * 85.25, (GROUND + top) / 2, 32.75, 49.5, top - GROUND, 7.5, "stone", SIDEWALK);
  // Far side: z 69…74
  g.box(0, (GROUND + top) / 2, 71.5, 220, top - GROUND, 5, "stone", SIDEWALK);
  // Kerb stones along the road edges
  for (const z of [38.85, 69.15]) g.box(0, (GROUND + top + 0.02) / 2, z, 220, top + 0.02 - GROUND, 0.3, "stone", KERB);
  GARDENS.forEach((r, i) => garden(g, r, i));
  for (const l of avenueLamps()) lamp(g, l);
}
