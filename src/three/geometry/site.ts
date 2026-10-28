// Site, context and fixed structures — port of the prototype's `build()`
// site section (L210–229) plus skywalk, central plant and site markers
// (L301–308). The prototype's fake shadow quads (L220–222) are dropped in
// favour of real shadow maps.
import { GeometryBuilder, type RGBA } from "./builder";
import { buildLandscape } from "./landscape";

export function buildSite() {
  const g = new GeometryBuilder(74021);

  // Plinth, plaza, road and markings
  g.box(0, -1.7, -1, 220, 2.7, 150, "base", [0.57, 0.61, 0.59, 1]);
  g.box(0, -0.22, 0, 121, 0.7, 73, "stone", [0.7, 0.72, 0.68, 1]);
  // The avenue continues into the city grid (city.ts) beyond the plinth
  g.quad([-110, -0.08, 39], [110, -0.08, 39], [110, -0.08, 69], [-110, -0.08, 69], "road", undefined, [
    [0, 0],
    [220 / 24, 0],
    [220 / 24, 30 / 24],
    [0, 30 / 24],
  ]);
  // Markings painted on the asphalt (−0.08): a thin box just proud of it, never floating above
  const WHITE: RGBA = [0.9, 0.91, 0.88, 1];
  const YELLOW: RGBA = [0.93, 0.76, 0.26, 1];
  const mark = (x0: number, x1: number, z0: number, z1: number, col: RGBA) =>
    g.box((x0 + x1) / 2, -0.075, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, "stone", col);
  const ZEBRA = { x0: -39, x1: -29.5 };
  for (const [x0, x1] of [
    [-110, ZEBRA.x0 - 2.2],
    [ZEBRA.x1 + 2.2, 110],
  ]) {
    // Double yellow centre line, white edge lines, dashed lane dividers (lanes at z 54 ± 4 and ± 10.5)
    for (const z of [53.82, 54.18]) mark(x0, x1, z - 0.07, z + 0.07, YELLOW);
    for (const z of [39.6, 68.4]) mark(x0, x1, z - 0.08, z + 0.08, WHITE);
    for (const z of [46.9, 61.1]) for (let x = x0 + 1; x + 3 < x1; x += 9) mark(x, x + 3, z - 0.07, z + 0.07, WHITE);
  }
  // Zebra kerb to kerb, and stop lines for the lanes that drive into it (left-hand traffic: +x keeps to −z)
  for (let x = ZEBRA.x0 + 0.25; x < ZEBRA.x1; x += 1) mark(x, x + 0.5, 39.4, 68.6, WHITE);
  mark(ZEBRA.x0 - 2.2, ZEBRA.x0 - 1.8, 39.4, 54, WHITE);
  mark(ZEBRA.x1 + 1.8, ZEBRA.x1 + 2.2, 54, 68.6, WHITE);

  // Street planters and trees
  for (let x = -105; x < 115; x += 15) {
    g.box(x, 0.15, 33, 7, 0.35, 4, "base", [0.2, 0.29, 0.32, 1]);
    g.tree(x, 33, 0.34, 0.9);
  }
  for (let z = -27; z < 31; z += 14) {
    g.tree(-53, z, 0.13, 1.05);
    // None over the central plant (x 48–66, z −31.5…−8.5)
    if (z > -8) g.tree(54, z, 0.13, 1.08);
  }

  buildLandscape(g);

  // Plaza survey grid, just above the plaza top (0.13 m) — below it, the lines flicker through
  for (let x = -50; x <= 50; x += 5.5) g.line([x, 0.16, -34], [x, 0.16, 32], 0.035, "line");
  for (let z = -33; z <= 33; z += 5.5) g.line([-60, 0.16, z], [60, 0.16, z], 0.04, "line");

  // Cars and pedestrians move: three/AmbientLife.tsx (lanes and paths in geometry/traffic.ts)

  // Connected skywalk
  g.box(-83, 9.1, 13, 80, 0.85, 6, "stone", [0.51, 0.64, 0.72, 1]);
  for (let x = -118; x < -44; x += 20) g.box(x, 4.2, 13, 0.9, 8.2, 0.9, "metal");
  for (const z of [10, 16]) {
    g.box(-82.5, 10.3, z, 79, 1.55, 0.15, "transparent", [0.6, 0.78, 0.84, 0.38]);
    g.box(-82.5, 11.3, z, 80, 0.15, 0.15, "metal");
  }
  // Canopy downlight strip — part of the dusk lighting
  g.box(-12, 5.6, 32.4, 30, 0.07, 0.11, "windowLight");

  // Central plant pad; the chillers on it are three/ChillerPlant.tsx (their own meshes, so one can open up)
  g.box(57, 0.6, -20, 18, 0.8, 23, "base");

  // Site boundary corner markers
  for (const x of [-63, 64])
    for (const z of [-40, 37]) {
      g.line([x, 0.3, z], [x + (x < 0 ? 7 : -7), 0.3, z], 0.17, "glow", [0.32, 0.71, 0.74, 0.65]);
      g.line([x, 0.3, z], [x, 0.3, z + (z < 0 ? 7 : -7)], 0.17, "glow", [0.32, 0.71, 0.74, 0.65]);
    }

  return g.build();
}
