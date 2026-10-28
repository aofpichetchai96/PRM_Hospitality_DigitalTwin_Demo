// Site, context and fixed structures — port of the prototype's `build()`
// site section (L210–229) plus skywalk, central plant and site markers
// (L301–308). The prototype's fake shadow quads (L220–222) are dropped in
// favour of real shadow maps.
import { GeometryBuilder } from "./builder";

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
  for (let x = -106; x < 110; x += 12) g.box(x, 0.04, 54, 5.5, 0.03, 0.22, "stone", [0.72, 0.76, 0.68, 1]);
  for (const z of [40.4, 67.6]) g.box(0, 0.03, z, 220, 0.04, 0.24, "stone", [0.68, 0.73, 0.73, 1]);
  for (let i = 0; i < 11; i++) g.box(-39 + i * 0.95, 0.09, 55, 0.4, 0.04, 24, "stone", [0.82, 0.84, 0.83, 1]);

  // Street planters and trees
  for (let x = -105; x < 115; x += 15) {
    g.box(x, 0.15, 33, 7, 0.35, 4, "base", [0.2, 0.29, 0.32, 1]);
    g.tree(x, 33, 0.34, 0.9);
  }
  for (let z = -27; z < 31; z += 14) {
    g.tree(-53, z, 0.4, 1.05);
    // None over the central plant (x 48–66, z −31.5…−8.5)
    if (z > -8) g.tree(54, z, 0.4, 1.08);
  }

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
