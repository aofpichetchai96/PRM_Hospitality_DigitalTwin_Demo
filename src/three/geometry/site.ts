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
  g.quad([-160, -0.08, 39], [160, -0.08, 39], [160, -0.08, 69], [-160, -0.08, 69], "road");
  for (let x = -160; x < 160; x += 12) g.box(x, 0.04, 54, 5.5, 0.03, 0.22, "stone", [0.72, 0.76, 0.68, 1]);
  for (const z of [40.4, 67.6]) g.box(0, 0.03, z, 320, 0.04, 0.24, "stone", [0.68, 0.73, 0.73, 1]);
  for (let i = 0; i < 11; i++) g.box(-39 + i * 0.95, 0.09, 55, 0.4, 0.04, 24, "stone", [0.82, 0.84, 0.83, 1]);

  // Street planters and trees
  for (let x = -105; x < 115; x += 15) {
    g.box(x, 0.15, 33, 7, 0.35, 4, "base", [0.2, 0.29, 0.32, 1]);
    g.tree(x, 33, 0.34, 0.9);
  }
  for (let z = -27; z < 31; z += 14) {
    g.tree(-53, z, 0.4, 1.05);
    g.tree(54, z, 0.4, 1.08);
  }

  // Plaza survey grid
  for (let x = -50; x <= 50; x += 5.5) g.line([x, 0.07, -34], [x, 0.07, 32], 0.035, "line");
  for (let z = -33; z <= 33; z += 5.5) g.line([-60, 0.09, z], [60, 0.09, z], 0.04, "line");

  // Distant urban silhouettes, kept low-contrast
  for (let i = 0; i < 24; i++) {
    const x = (i - 12) * 16 + (g.rand() - 0.5) * 8,
      z = -90 - g.rand() * 62,
      h = 14 + g.rand() * 44,
      w = 8 + g.rand() * 11,
      d = 9 + g.rand() * 14;
    g.box(x, h / 2 - 0.3, z, w, h, d, "base", [
      0.5 + g.rand() * 0.05,
      0.58 + g.rand() * 0.04,
      0.61 + g.rand() * 0.03,
      1,
    ]);
    for (let k = 3; k < h; k += 5) g.box(x, k, z + d / 2 + 0.02, w * 0.77, 0.2, 0.03, "line", [0.32, 0.45, 0.55, 0.4]);
  }

  // Cars and pedestrians for human scale (static; ambient motion is Phase 9)
  const carColors: [number, number, number, number][] = [
    [0.79, 0.82, 0.84, 1],
    [0.38, 0.46, 0.54, 1],
    [0.65, 0.31, 0.31, 1],
    [0.74, 0.74, 0.66, 1],
  ];
  for (let i = 0; i < 10; i++) {
    const x = -130 + i * 28 + (i % 2) * 10,
      z = i % 2 ? 47 : 61;
    g.box(x, 1, z, 4.9, 1.05, 2.25, "metal", carColors[i % 4]);
    g.box(x + 0.1, 1.85, z, 2.8, 0.8, 1.96, "glass");
    for (const q of [-1.6, 1.6]) {
      g.box(x + q, 0.63, z - 1.1, 0.85, 0.72, 0.25, "base", [0.07, 0.08, 0.09, 1]);
      g.box(x + q, 0.63, z + 1.1, 0.85, 0.72, 0.25, "base", [0.07, 0.08, 0.09, 1]);
    }
    g.box(x + 2.46, 1, z, 0.05, 0.28, 1.64, "warm");
  }
  for (let i = 0; i < 35; i++) {
    const x = -43 + g.rand() * 90,
      z = 28 + g.rand() * 9;
    g.box(x, 1.1, z, 0.42, 1.25, 0.37, "base", [0.2 + g.rand() * 0.5, 0.25 + g.rand() * 0.4, 0.35 + g.rand() * 0.3, 1]);
    g.sphere(x, 1.96, z, 0.24, 0.25, 0.23, "stone", [0.67, 0.53, 0.41, 1], 5, 4);
  }

  // Connected skywalk
  g.box(-83, 9.1, 13, 80, 0.85, 6, "stone", [0.51, 0.64, 0.72, 1]);
  for (let x = -118; x < -44; x += 20) g.box(x, 4.2, 13, 0.9, 8.2, 0.9, "metal");
  for (const z of [10, 16]) {
    g.box(-82.5, 10.3, z, 79, 1.55, 0.15, "transparent", [0.6, 0.78, 0.84, 0.38]);
    g.box(-82.5, 11.3, z, 80, 0.15, 0.15, "metal");
  }
  // Canopy downlight strip — part of the dusk lighting
  g.box(-12, 5.6, 32.4, 30, 0.07, 0.11, "windowLight");

  // Exposed central plant: three chillers with fan discs
  g.box(57, 0.6, -20, 18, 0.8, 23, "base");
  for (let i = 0; i < 3; i++) {
    g.box(56, 2.7, -26 + i * 6, 10, 3.5, 4.5, "metal", [0.59, 0.68, 0.71, 1]);
    g.box(56, 4.55, -26 + i * 6, 6, 0.25, 3, "base", [0.24, 0.34, 0.4, 1]);
    for (const x of [54, 57.7]) g.sphere(x, 4.68, -26 + i * 6, 1.3, 0.12, 1.3, "metal", [0.32, 0.43, 0.48, 1], 9, 3);
  }

  // Site boundary corner markers
  for (const x of [-63, 64])
    for (const z of [-40, 37]) {
      g.line([x, 0.3, z], [x + (x < 0 ? 7 : -7), 0.3, z], 0.17, "glow", [0.32, 0.71, 0.74, 0.65]);
      g.line([x, 0.3, z], [x, 0.3, z + (z < 0 ? 7 : -7)], 0.17, "glow", [0.32, 0.71, 0.74, 0.65]);
    }

  return g.build();
}
