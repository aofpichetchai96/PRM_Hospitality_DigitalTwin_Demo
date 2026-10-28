// Low-poly vehicle and person models for AmbientLife. Each vehicle is two
// merged geometries with vertex colours: the body (paint parts white, so the
// per-instance colour tints them; glass, tyres and trim dark) and its lamps.
// Vehicles point along +x with the ground at y = 0.
import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { VehicleKind } from "./traffic";

type RGB = [number, number, number];
const PAINT: RGB = [1, 1, 1];
const GLASS: RGB = [0.1, 0.13, 0.16];
const TYRE: RGB = [0.05, 0.05, 0.06];
const TRIM: RGB = [0.16, 0.17, 0.19];
const HUB: RGB = [0.55, 0.57, 0.6];
const HEAD: RGB = [1, 0.95, 0.82];
const TAIL: RGB = [0.85, 0.08, 0.06];

/** Non-indexed copy with a flat vertex colour, ready to merge */
function tint(geo: BufferGeometry, [r, g, b]: RGB) {
  const out = geo.index ? geo.toNonIndexed() : geo;
  const n = out.getAttribute("position").count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([r, g, b], i * 3);
  out.setAttribute("color", new Float32BufferAttribute(c, 3));
  out.deleteAttribute("uv");
  return out;
}

const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: RGB) =>
  tint(new BoxGeometry(w, h, d).translate(x, y, z), c);

/** Side profile (x along the car, y up) extruded across the width */
function profile(points: [number, number][], width: number, c: RGB) {
  const s = new Shape();
  s.moveTo(...points[0]);
  for (const p of points.slice(1)) s.lineTo(...p);
  s.closePath();
  const geo = new ExtrudeGeometry(s, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1,
  });
  return tint(geo.translate(0, 0, -width / 2), c);
}

function wheels(xs: number[], halfTrack: number, r: number, w: number) {
  const parts: BufferGeometry[] = [];
  for (const x of xs)
    for (const z of [-halfTrack, halfTrack]) {
      parts.push(tint(new CylinderGeometry(r, r, w, 14).rotateX(Math.PI / 2).translate(x, r, z), TYRE));
      parts.push(
        tint(new CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10).rotateX(Math.PI / 2).translate(x, r, z), HUB),
      );
    }
  return parts;
}

/** Head- and tail-lamps at both ends */
function lamps(l: number, y: number, halfW: number, size = 0.32) {
  const parts: BufferGeometry[] = [];
  for (const z of [-halfW, halfW]) {
    parts.push(box(0.06, 0.13, size, l / 2 + 0.03, y, z, HEAD));
    parts.push(box(0.06, 0.13, size, -l / 2 - 0.03, y, z, TAIL));
  }
  return parts;
}

type Model = { body: BufferGeometry; lamps: BufferGeometry };

function car(o: {
  l: number;
  w: number;
  body: [number, number][];
  cabin: [number, number][];
  roof: [number, number, number];
  lampY: number;
  wheelR?: number;
  extra?: BufferGeometry[];
}): Model {
  const r = o.wheelR ?? 0.33;
  const wb = o.l / 2 - 0.78;
  return {
    body: mergeGeometries([
      profile(o.body, o.w, PAINT),
      profile(o.cabin, o.w - 0.18, GLASS),
      box(o.roof[1] - o.roof[0], 0.06, o.w - 0.14, (o.roof[0] + o.roof[1]) / 2, o.roof[2], 0, PAINT),
      box(0.12, 0.2, o.w - 0.1, o.l / 2 + 0.02, 0.42, 0, TRIM),
      box(0.12, 0.2, o.w - 0.1, -o.l / 2 - 0.02, 0.42, 0, TRIM),
      ...wheels([wb, -wb], o.w / 2 - 0.14, r, 0.24),
      ...(o.extra ?? []),
    ])!,
    lamps: mergeGeometries(lamps(o.l, o.lampY, o.w / 2 - 0.3))!,
  };
}

function build(kind: VehicleKind): Model {
  switch (kind) {
    case "sedan":
      return car({
        l: 4.7,
        w: 1.8,
        body: [
          [-2.35, 0.3],
          [2.35, 0.3],
          [2.38, 0.55],
          [2.28, 0.72],
          [1.85, 0.8],
          [0.95, 0.86],
          [-1.6, 0.9],
          [-2.28, 0.86],
          [-2.38, 0.62],
        ],
        cabin: [
          [0.98, 0.84],
          [0.22, 1.36],
          [-0.88, 1.38],
          [-1.62, 0.88],
        ],
        roof: [-0.85, 0.2, 1.4],
        lampY: 0.68,
      });
    case "hatch":
      return car({
        l: 4.0,
        w: 1.74,
        body: [
          [-2.0, 0.3],
          [2.0, 0.3],
          [2.03, 0.56],
          [1.9, 0.74],
          [1.4, 0.82],
          [0.72, 0.86],
          [-1.95, 0.9],
          [-2.03, 0.6],
        ],
        cabin: [
          [0.75, 0.84],
          [0.08, 1.4],
          [-1.66, 1.42],
          [-1.96, 0.88],
        ],
        roof: [-1.62, 0.06, 1.44],
        lampY: 0.7,
      });
    case "suv":
      return car({
        l: 4.8,
        w: 1.92,
        wheelR: 0.38,
        body: [
          [-2.4, 0.4],
          [2.4, 0.4],
          [2.43, 0.72],
          [2.34, 0.96],
          [1.6, 1.03],
          [1.0, 1.06],
          [-2.35, 1.08],
          [-2.43, 0.76],
        ],
        cabin: [
          [1.02, 1.04],
          [0.36, 1.68],
          [-2.18, 1.7],
          [-2.36, 1.06],
        ],
        roof: [-2.15, 0.34, 1.72],
        lampY: 0.88,
      });
    case "pickup":
      return car({
        l: 5.3,
        w: 1.88,
        wheelR: 0.38,
        body: [
          [-2.65, 0.42],
          [2.65, 0.42],
          [2.68, 0.72],
          [2.58, 0.96],
          [1.8, 1.03],
          [1.2, 1.05],
          [-2.6, 1.08],
          [-2.68, 0.76],
        ],
        cabin: [
          [1.22, 1.04],
          [0.6, 1.7],
          [-0.48, 1.72],
          [-0.6, 1.06],
        ],
        roof: [-0.48, 0.58, 1.74],
        lampY: 0.9,
        // Open load bed behind the cab
        extra: [box(1.9, 0.04, 1.6, -1.6, 1.1, 0, TRIM)],
      });
    case "van":
      return car({
        l: 5.2,
        w: 1.98,
        wheelR: 0.36,
        body: [
          [-2.6, 0.4],
          [2.6, 0.4],
          [2.63, 0.76],
          [2.5, 1.0],
          [2.05, 1.08],
          [1.55, 2.02],
          [-2.55, 2.06],
          [-2.62, 1.0],
        ],
        cabin: [
          [2.04, 1.1],
          [1.6, 1.9],
          [1.2, 1.9],
          [1.2, 1.1],
        ],
        roof: [-2.5, 1.5, 2.08],
        lampY: 0.9,
        // Side window band
        extra: [box(3.5, 0.48, 2.0, -0.55, 1.5, 0, GLASS)],
      });
    case "bus":
      return car({
        l: 11.5,
        w: 2.5,
        wheelR: 0.5,
        body: [
          [-5.75, 0.35],
          [5.75, 0.35],
          [5.78, 2.95],
          [5.62, 3.12],
          [-5.62, 3.12],
          [-5.78, 2.95],
        ],
        cabin: [
          [5.79, 1.25],
          [5.79, 2.8],
          [5.7, 2.8],
          [5.7, 1.25],
        ],
        roof: [-5.2, 5.2, 3.18],
        lampY: 0.75,
        extra: [box(10.4, 0.95, 2.52, -0.25, 2.15, 0, GLASS), box(1.0, 1.9, 2.52, 4.2, 1.3, 0, TRIM)],
      });
    case "tuktuk": {
      const posts = [
        [0.5, -0.6],
        [0.5, 0.6],
        [-1.3, -0.6],
        [-1.3, 0.6],
      ].map(([x, z]) => box(0.05, 0.8, 0.05, x, 1.35, z, TRIM));
      return {
        body: mergeGeometries([
          profile(
            [
              [-1.4, 0.28],
              [1.45, 0.28],
              [1.45, 0.72],
              [1.1, 0.92],
              [-1.4, 0.96],
            ],
            1.3,
            PAINT,
          ),
          box(2.2, 0.08, 1.42, -0.35, 1.78, 0, PAINT),
          box(0.04, 0.5, 1.1, 0.75, 1.3, 0, GLASS),
          ...posts,
          // One front wheel, two at the back
          tint(new CylinderGeometry(0.26, 0.26, 0.16, 12).rotateX(Math.PI / 2).translate(1.05, 0.26, 0), TYRE),
          ...wheels([-1.0], 0.55, 0.26, 0.18).filter((_, i) => i % 2 === 0),
        ])!,
        lamps: mergeGeometries([box(0.06, 0.13, 0.22, 1.48, 0.7, 0, HEAD), ...lamps(2.9, 0.6, 0.5, 0.15).slice(1, 2)])!,
      };
    }
    case "motorbike":
      return {
        body: mergeGeometries([
          profile(
            [
              [-0.78, 0.38],
              [0.8, 0.38],
              [0.86, 0.62],
              [0.42, 0.78],
              [-0.3, 0.82],
              [-0.82, 0.64],
            ],
            0.32,
            PAINT,
          ),
          tint(new CylinderGeometry(0.3, 0.3, 0.1, 14).rotateX(Math.PI / 2).translate(0.66, 0.3, 0), TYRE),
          tint(new CylinderGeometry(0.3, 0.3, 0.1, 14).rotateX(Math.PI / 2).translate(-0.66, 0.3, 0), TYRE),
          // Rider: legs, torso, arms to the bars, helmet
          box(0.5, 0.18, 0.42, -0.05, 0.95, 0, TRIM),
          box(0.32, 0.62, 0.4, -0.2, 1.32, 0, [0.3, 0.33, 0.38]),
          box(0.52, 0.1, 0.46, 0.18, 1.42, 0, [0.3, 0.33, 0.38]),
          tint(new SphereGeometry(0.15, 10, 8).translate(-0.16, 1.78, 0), [0.12, 0.13, 0.15]),
        ])!,
        lamps: mergeGeometries([
          box(0.06, 0.12, 0.14, 0.9, 0.72, 0, HEAD),
          box(0.06, 0.1, 0.14, -0.86, 0.68, 0, TAIL),
        ])!,
      };
  }
}

let cache: Map<VehicleKind, Model> | null = null;
export function vehicleModels() {
  cache ??= new Map(
    (["sedan", "hatch", "suv", "pickup", "van", "bus", "tuktuk", "motorbike"] as const).map((k) => [k, build(k)]),
  );
  return cache;
}

// --------------------------------------------------------------------- person

/**
 * A person facing +z, standing at y = 0, 1.7 m tall at scale 1. Limbs pivot at
 * the hip / shoulder (their geometry hangs down from the origin) so walking
 * only rotates them about x.
 */
export const PERSON = {
  hipY: 0.88,
  hipX: 0.085,
  shoulderY: 1.42,
  shoulderX: 0.23,
  torso: new BoxGeometry(0.36, 0.58, 0.21).translate(0, 1.15, 0),
  hips: new BoxGeometry(0.33, 0.14, 0.2).translate(0, 0.86, 0),
  leg: new BoxGeometry(0.13, 0.86, 0.15).translate(0, -0.43, 0),
  arm: new BoxGeometry(0.085, 0.6, 0.1).translate(0, -0.3, 0),
  head: new SphereGeometry(0.11, 10, 8).scale(0.9, 1.05, 1).translate(0, 1.6, 0),
  hair: new SphereGeometry(0.118, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.625, -0.012),
  /** Shopping bag hanging from the hand (arm pivot space) */
  bag: new BoxGeometry(0.1, 0.32, 0.26).translate(0.06, -0.72, 0),
};
