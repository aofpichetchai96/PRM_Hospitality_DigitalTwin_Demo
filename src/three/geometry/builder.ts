// Procedural geometry builder — a TypeScript port of the prototype's helpers
// (reference/PRM_Hospitality_DigitalTwin_example.html L109–172). Vertices are
// accumulated per material key exactly like the prototype's `bucket()`, then
// emitted as one non-indexed BufferGeometry per material (few draw calls).
import { BufferGeometry, Color, Float32BufferAttribute, SRGBColorSpace } from "three";
import type { MaterialKey } from "../materials";
import { MATERIAL_COLORS } from "../materials";

export type Vec3 = [number, number, number];
/** Prototype colours are 0–1 sRGB-ish values with alpha */
export type RGBA = [number, number, number, number];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Same LCG as the prototype (`rand()`, L109) so layouts stay recognisable */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Bucket = { position: number[]; normal: number[]; uv: number[]; color: number[] };
const QUAD_UV: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const scratch = new Color();

export class GeometryBuilder {
  readonly rand: () => number;
  private buckets = new Map<MaterialKey, Bucket>();

  constructor(seed: number) {
    this.rand = createRng(seed);
  }

  private bucket(mat: MaterialKey): Bucket {
    let b = this.buckets.get(mat);
    if (!b) {
      b = { position: [], normal: [], uv: [], color: [] };
      this.buckets.set(mat, b);
    }
    return b;
  }

  private push(b: Bucket, p: Vec3, n: Vec3, uv: [number, number], c: RGBA) {
    b.position.push(p[0], p[1], p[2]);
    b.normal.push(n[0], n[1], n[2]);
    b.uv.push(uv[0], uv[1]);
    // Vertex colours are stored linear; the prototype values are treated as sRGB
    scratch.setRGB(c[0], c[1], c[2], SRGBColorSpace);
    b.color.push(scratch.r, scratch.g, scratch.b, c[3]);
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, mat: MaterialKey = "stone", color?: RGBA, uv = QUAD_UV) {
    // Normal from the diagonals: still valid when one edge has collapsed, which
    // happens when roundedPath's radius equals half the width. The prototype's
    // (b - a) × (c - a) gave a zero normal there, i.e. NaN pixels in the shader
    // that bloom then smears across the whole frame.
    const raw = cross(sub(c, a), sub(d, b));
    if (Math.hypot(...raw) < 1e-9) return; // zero-area quad: nothing to draw
    const n = norm(raw);
    const bk = this.bucket(mat);
    const col = color ?? MATERIAL_COLORS[mat];
    const ps = [a, b, c, d];
    for (const i of [0, 1, 2, 0, 2, 3]) this.push(bk, ps[i], n, uv[i], col);
  }

  tri(a: Vec3, b: Vec3, c: Vec3, mat: MaterialKey = "stone", color?: RGBA) {
    const raw = cross(sub(b, a), sub(c, a));
    if (Math.hypot(...raw) < 1e-9) return; // zero-area triangle
    const n = norm(raw);
    const bk = this.bucket(mat);
    const col = color ?? MATERIAL_COLORS[mat];
    for (const p of [a, b, c]) this.push(bk, p, n, [0, 0], col);
  }

  box(x: number, y: number, z: number, w: number, h: number, d: number, mat: MaterialKey = "stone", color?: RGBA) {
    const a = x - w / 2,
      b = x + w / 2,
      l = y - h / 2,
      t = y + h / 2,
      f = z + d / 2,
      k = z - d / 2;
    this.quad([a, l, f], [b, l, f], [b, t, f], [a, t, f], mat, color);
    this.quad([b, l, k], [a, l, k], [a, t, k], [b, t, k], mat, color);
    this.quad([b, l, f], [b, l, k], [b, t, k], [b, t, f], mat, color);
    this.quad([a, l, k], [a, l, f], [a, t, f], [a, t, k], mat, color);
    this.quad([a, t, f], [b, t, f], [b, t, k], [a, t, k], mat, color);
    this.quad([a, l, k], [b, l, k], [b, l, f], [a, l, f], mat, color);
  }

  /** Thin cross-shaped ribbon between two points (prototype `line`) */
  line(a: Vec3, b: Vec3, width = 0.1, mat: MaterialKey = "glow", color?: RGBA) {
    const dir = norm(sub(b, a));
    const ref: Vec3 = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const n = scale(norm(cross(dir, ref)), width / 2);
    this.quad(sub(a, n), add(a, n), add(b, n), sub(b, n), mat, color);
    const p = scale(norm(cross(dir, n)), width / 2);
    this.quad(sub(a, p), add(a, p), add(b, p), sub(b, p), mat, color);
  }

  /** Glowing rectangle around a floor plate (prototype selected-floor perimeter, L296) */
  outline(cx: number, y: number, cz: number, w: number, d: number, width = 0.3) {
    const [x0, x1, z0, z1] = [cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2];
    const c: Vec3[] = [
      [x0, y, z1],
      [x1, y, z1],
      [x1, y, z0],
      [x0, y, z0],
    ];
    for (let i = 0; i < 4; i++) this.line(c[i], c[(i + 1) % 4], width, "glow");
  }

  sphere(
    cx: number,
    cy: number,
    cz: number,
    rx: number,
    ry: number,
    rz: number,
    mat: MaterialKey = "foliage",
    color?: RGBA,
    segments = 7,
    rings = 5,
  ) {
    const pt = (i: number, j: number): Vec3 => {
      const p = (Math.PI * j) / rings,
        t = (Math.PI * 2 * i) / segments;
      return [cx + rx * Math.sin(p) * Math.cos(t), cy + ry * Math.cos(p), cz + rz * Math.sin(p) * Math.sin(t)];
    };
    for (let j = 0; j < rings; j++)
      for (let i = 0; i < segments; i++) this.quad(pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j), pt(i, j), mat, color);
  }

  /** Upright cylinder standing on `y` (tanks, pipes, round tables) */
  cylinder(cx: number, y: number, cz: number, r: number, h: number, mat: MaterialKey = "metal", color?: RGBA, n = 12) {
    const hi = y + h;
    for (let i = 0; i < n; i++) {
      const t0 = (Math.PI * 2 * i) / n,
        t1 = (Math.PI * 2 * (i + 1)) / n;
      const p0: [number, number] = [cx + r * Math.cos(t0), cz + r * Math.sin(t0)];
      const p1: [number, number] = [cx + r * Math.cos(t1), cz + r * Math.sin(t1)];
      this.quad([p1[0], y, p1[1]], [p0[0], y, p0[1]], [p0[0], hi, p0[1]], [p1[0], hi, p1[1]], mat, color);
      this.tri([cx, hi, cz], [p1[0], hi, p1[1]], [p0[0], hi, p0[1]], mat, color);
      this.tri([cx, y, cz], [p0[0], y, p0[1]], [p1[0], y, p1[1]], mat, color);
    }
  }

  tree(x: number, z: number, y = 0, s = 1) {
    this.box(x, y + 2 * s, z, 0.38 * s, 4 * s, 0.4 * s, "wood");
    this.sphere(x, y + 5.1 * s, z, 2.2 * s, 2.8 * s, 2.3 * s, "foliage", [
      0.22 + this.rand() * 0.08,
      0.39 + this.rand() * 0.12,
      0.19 + this.rand() * 0.06,
      1,
    ]);
    this.sphere(
      x + 1.2 * s,
      y + 4.2 * s,
      z + 0.4 * s,
      1.7 * s,
      1.7 * s,
      1.7 * s,
      "foliage",
      [0.3, 0.46, 0.22, 1],
      6,
      4,
    );
  }

  /** Outline of a rounded rectangle on the XZ plane: 4 corners × 9 points */
  roundedPath(cx: number, cz: number, w: number, d: number, r = 3): [number, number][] {
    const p: [number, number][] = [];
    r = Math.min(r, w / 2, d / 2);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2,
        xc = cx + (k === 0 || k === 3 ? 1 : -1) * (w / 2 - r),
        zc = cz + (k < 2 ? 1 : -1) * (d / 2 - r);
      for (let j = 0; j <= 8; j++) {
        const t = a + (j * Math.PI) / 16;
        p.push([xc + r * Math.cos(t), zc + r * Math.sin(t)]);
      }
    }
    return p;
  }

  roundedSolid(
    cx: number,
    y: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    r: number,
    mat: MaterialKey = "ivory",
    color?: RGBA,
  ) {
    const p = this.roundedPath(cx, cz, w, d, r),
      lo = y - h / 2,
      hi = y + h / 2;
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length];
      this.quad([a[0], lo, a[1]], [a[0], hi, a[1]], [b[0], hi, b[1]], [b[0], lo, b[1]], mat, color);
      this.tri([cx, hi, cz], [b[0], hi, b[1]], [a[0], hi, a[1]], mat, color);
      this.tri([cx, lo, cz], [a[0], lo, a[1]], [b[0], lo, b[1]], mat, color);
    }
  }

  roundedRail(
    cx: number,
    y: number,
    cz: number,
    w: number,
    d: number,
    r: number,
    height = 0.25,
    mat: MaterialKey = "ivory",
    color?: RGBA,
  ) {
    const outer = this.roundedPath(cx, cz, w, d, r),
      inner = this.roundedPath(cx, cz, w - 0.4, d - 0.4, Math.max(0.1, r - 0.2));
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length,
        a = outer[i],
        b = outer[j],
        c = inner[j],
        d0 = inner[i];
      this.quad([a[0], y, a[1]], [a[0], y + height, a[1]], [b[0], y + height, b[1]], [b[0], y, b[1]], mat, color);
      this.quad(
        [a[0], y + height, a[1]],
        [d0[0], y + height, d0[1]],
        [c[0], y + height, c[1]],
        [b[0], y + height, b[1]],
        mat,
        color,
      );
    }
  }

  /**
   * Glazed envelope with white fins (prototype `envelope`, L148–166).
   * Window lights are always generated into the `windowLight` bucket with their
   * own rng, so day and dusk share identical glass shading (the prototype only
   * drew them at night, which shifted its random sequence).
   */
  envelope(
    cx: number,
    base: number,
    cz: number,
    w: number,
    d: number,
    floors: number,
    step = 4.15,
    r = 3.2,
    windowRand = this.rand,
  ) {
    const h = floors * step,
      p = this.roundedPath(cx, cz, w - 0.8, d - 0.8, r - 0.4);
    for (let i = 0; i < p.length; i++) {
      const a = p[i],
        b = p[(i + 1) % p.length],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.max(1, Math.ceil(len / 2.2));
      for (let j = 0; j < n; j++) {
        const u = j / n,
          v = (j + 1) / n,
          ax = a[0] + (b[0] - a[0]) * u,
          az = a[1] + (b[1] - a[1]) * u,
          bx = a[0] + (b[0] - a[0]) * v,
          bz = a[1] + (b[1] - a[1]) * v;
        for (let f = 0; f < floors; f++) {
          const y = base + f * step,
            shade = 0.8 + this.rand() * 0.22;
          this.quad([ax, y, az], [ax, y + step, az], [bx, y + step, bz], [bx, y, bz], "facadeGlass", [
            0.3 * shade,
            0.43 * shade,
            0.47 * shade,
            1,
          ]);
          if (windowRand() < 0.28) {
            // Lit pane sits just outside the glass so it never z-fights
            const ox = (ax + bx) / 2 - cx,
              oz = (az + bz) / 2 - cz,
              ol = Math.hypot(ox, oz) || 1,
              e = 0.06,
              dx = (ox / ol) * e,
              dz = (oz / ol) * e;
            this.quad(
              [ax + dx, y + 0.6, az + dz],
              [ax + dx, y + step - 0.55, az + dz],
              [bx + dx, y + step - 0.55, bz + dz],
              [bx + dx, y + 0.6, bz + dz],
              "windowLight",
            );
          }
        }
      }
    }
    for (let f = 0; f <= floors; f++) this.roundedRail(cx, base + f * step, cz, w + 0.3, d + 0.3, r, 0.28, "ivory");
    this.roundedSolid(cx, base + 0.05, cz, w, 0.22, d, r, "ivory");
    this.roundedSolid(cx, base + h, cz, w + 0.4, 0.42, d + 0.4, r, "ivory");
    const ring = this.roundedPath(cx, cz, w + 0.5, d + 0.5, r + 0.25);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]),
        n = Math.max(1, Math.ceil(len / 1.5)),
        nx = (b[1] - a[1]) / Math.max(len, 0.01),
        nz = -(b[0] - a[0]) / Math.max(len, 0.01);
      for (let j = 0; j < n; j++) {
        const t = j / n,
          x = a[0] + (b[0] - a[0]) * t,
          z = a[1] + (b[1] - a[1]) * t;
        this.box(x, base + h / 2, z, Math.abs(nx) * 0.6 + 0.15, h, Math.abs(nz) * 0.6 + 0.15, "ivory");
      }
    }
  }

  skyGarden(cx: number, y: number, cz: number, w: number, d: number, r = 3) {
    this.roundedSolid(cx, y, cz, w, 0.52, d, r, "terracotta");
    this.roundedSolid(cx, y + 0.32, cz, w - 0.5, 0.16, d - 0.5, Math.max(0.5, r - 0.3), "deck");
    this.roundedRail(cx, y + 0.5, cz, w, d, r, 1.05, "balconyGlass");
    this.roundedRail(cx, y + 1.55, cz, w, d, r, 0.1, "ivory");
    for (let x = cx - w / 2 + 3; x < cx + w / 2 - 1; x += 4.2) {
      for (const z of [cz - d / 2 + 1.9, cz + d / 2 - 1.9]) {
        this.box(x, y + 0.65, z, 3.7, 0.65, 1.5, "planter");
        this.sphere(x, y + 1.22, z, 1.7, 0.7, 0.7, "foliage", [0.29, 0.43, 0.2, 1], 6, 4);
        if (this.rand() < 0.65) this.tree(x, z, y + 0.8, 0.39 + this.rand() * 0.16);
      }
    }
    for (let z = cz - d / 2 + 4; z < cz + d / 2 - 2; z += 5)
      for (const x of [cx - w / 2 + 1.7, cx + w / 2 - 1.7]) this.tree(x, z, y + 0.6, 0.43);
  }

  /** One BufferGeometry per material that received vertices */
  build(): Map<MaterialKey, BufferGeometry> {
    const out = new Map<MaterialKey, BufferGeometry>();
    for (const [mat, b] of this.buckets) {
      const g = new BufferGeometry();
      g.setAttribute("position", new Float32BufferAttribute(b.position, 3));
      g.setAttribute("normal", new Float32BufferAttribute(b.normal, 3));
      g.setAttribute("uv", new Float32BufferAttribute(b.uv, 2));
      g.setAttribute("color", new Float32BufferAttribute(b.color, 4));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      out.set(mat, g);
    }
    this.buckets.clear();
    return out;
  }
}
