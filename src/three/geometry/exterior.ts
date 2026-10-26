// Exterior building shell — port of the prototype's `hospitalityExterior()`
// (L173–206): rounded podium, banded hotel tower with two-storey sky courts and
// the rooftop crown. Used in Exterior mode only (docs/3D_PLAN.md 2.2).
import { createRng, GeometryBuilder } from "./builder";

/** Hotel floor-to-floor height and tower base level (metres) */
export const FLOOR_HEIGHT = 4.15;
export const TOWER_BASE_Y = 29;

const TOWER = { x: 9, z: -6 };

// Tower bands (0-based floor index, floor count, footprint) — prototype L186.
// Matches the floor schedule in docs/3D_PLAN.md section 8.
const BANDS = [
  { f: 0, n: 7, w: 44, d: 28, x: 9, z: -6 },
  { f: 9, n: 6, w: 44, d: 28, x: 9, z: -6 },
  { f: 17, n: 6, w: 44, d: 28, x: 9, z: -6 },
  { f: 25, n: 4, w: 23, d: 25, x: 19, z: -7 },
];
const SKY_COURTS = [7, 15, 23];

export function buildExterior() {
  const g = new GeometryBuilder(74021);
  const windows = createRng(20240);
  const H = FLOOR_HEIGHT;

  // Public podium with transparent arrival hall and staggered garden roofs
  g.roundedSolid(0, 2.8, 0, 85, 5.6, 49, 6, "facadeGlass");
  for (let x = -38; x <= 38; x += 7) for (const z of [-21, 22]) g.box(x, 3, z, 0.65, 6, 0.65, "terracotta");
  g.envelope(0, 6, 0, 87, 51, 2, 5.2, 6, windows);
  g.skyGarden(0, 16.5, 0, 87, 51, 6);
  g.envelope(-23, 17.3, -2, 34, 34, 1, 8, 5, windows);
  g.envelope(17, 17.3, -7, 43, 31, 1, 8, 5, windows);
  g.skyGarden(-23, 25.7, -2, 34, 34, 5);
  g.skyGarden(17, 25.7, -7, 43, 31, 5);

  // Continuous red structural core revealed between the white glass volumes
  g.roundedSolid(9, 90, -10, 27, 123, 12, 3, "terracotta");
  for (const x of [-10, 29]) for (const z of [-17, 5]) g.box(x, 90.5, z, 0.78, 124, 0.78, "terracotta");

  for (const band of BANDS) {
    const y = TOWER_BASE_Y + band.f * H;
    g.envelope(band.x, y, band.z, band.w, band.d, band.n, H, 3.4, windows);
    g.skyGarden(band.x, y + band.n * H + 0.35, band.z, band.w + 0.5, band.d + 0.5, 3.6);
  }

  // Deep two-storey sky courts: terracotta soffits, slim columns, inset glass
  for (const f of SKY_COURTS) {
    const y = TOWER_BASE_Y + f * H;
    g.roundedSolid(TOWER.x, y + H * 2 - 0.4, TOWER.z, 44, 0.65, 28, 3.4, "terracotta");
    g.roundedSolid(TOWER.x, y + H, TOWER.z - 2, 31, H * 2 - 1.0, 16, 2, "facadeGlass");
    for (const x of [-10, -1, 10, 20, 29])
      for (const z of [-18, 6]) g.box(x, y + H, z, 0.43, H * 2, 0.43, "terracotta");
    g.skyGarden(TOWER.x, y + 0.2, TOWER.z, 45, 29, 3.5);
    for (let x = -9; x <= 29; x += 3) g.box(x, y + H * 2 - 0.75, 6, 0.11, 0.14, 3.2, "wood");
  }

  // Asymmetric upper terrace and an overhanging rounded rooftop crown
  g.skyGarden(-2, 132.9, -4, 23, 26, 3.1);
  g.roundedSolid(-3, 143.2, -9, 15, 0.5, 18, 3, "ivory");
  g.roundedSolid(9, 153.5, -6, 45, 1.25, 29, 3.8, "terracotta");
  g.envelope(9, 154.3, -6, 45, 29, 1, 6.2, 3.8, windows);
  g.roundedSolid(9, 160.7, -6, 45.8, 0.75, 29.8, 4, "terracotta");
  for (let x = -8; x < 30; x += 5) g.tree(x, 2, 154.5, 0.55);

  // Arrival canopy and nameplate
  g.roundedSolid(-12, 6.0, 29, 38, 0.6, 9, 3, "terracotta");
  for (const x of [-27, 3]) g.box(x, 2.9, 31, 0.4, 5.7, 0.4, "terracotta");
  g.quad([-29, 6.8, 26.2], [5, 6.8, 26.2], [5, 11.6, 26.2], [-29, 11.6, 26.2], "sign");
  g.roundedSolid(-29, 0.65, 28, 15, 0.7, 5, 2, "planter");
  for (let x = -34; x < -22; x += 4) g.tree(x, 28, 1, 0.75);

  return g.build();
}
