// Material palette — prototype `material()` table (L125) mapped to three.js
// (docs/3D_PLAN.md 4.2). All materials use vertex colours written by the
// GeometryBuilder, so the material colour itself stays white.
import {
  AdditiveBlending,
  Color,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
} from "three";

export type MaterialKey =
  | "ivory"
  | "terracotta"
  | "facadeGlass"
  | "balconyGlass"
  | "deck"
  | "planter"
  | "stone"
  | "glass"
  | "metal"
  | "warm"
  | "glow"
  | "blue"
  | "red"
  | "green"
  | "foliage"
  | "wood"
  | "base"
  | "road"
  | "line"
  | "transparent"
  | "sign"
  | "windowLight"
  /** Surrounding city: tiling window texture, lit windows at dusk */
  | "facade";

/** Default vertex colour per material (prototype values, sRGB 0–1 + alpha) */
export const MATERIAL_COLORS: Record<MaterialKey, [number, number, number, number]> = {
  ivory: [0.89, 0.9, 0.85, 1],
  terracotta: [0.62, 0.24, 0.16, 1],
  facadeGlass: [0.3, 0.43, 0.47, 1],
  balconyGlass: [0.57, 0.72, 0.71, 0.3],
  deck: [0.6, 0.53, 0.4, 1],
  planter: [0.52, 0.52, 0.42, 1],
  stone: [0.82, 0.83, 0.82, 1],
  glass: [0.24, 0.36, 0.47, 1],
  metal: [0.72, 0.78, 0.81, 1],
  warm: [0.96, 0.76, 0.43, 1],
  glow: [0.3, 0.87, 0.84, 1],
  blue: [0.3, 0.61, 0.89, 1],
  red: [1, 0.33, 0.37, 1],
  green: [0.36, 0.75, 0.6, 1],
  foliage: [0.19, 0.33, 0.24, 1],
  wood: [0.32, 0.24, 0.18, 1],
  base: [0.19, 0.26, 0.33, 1],
  road: [0.72, 0.79, 0.84, 1],
  line: [0.5, 0.67, 0.76, 0.35],
  transparent: [0.24, 0.72, 0.8, 0.15],
  sign: [1, 1, 1, 1],
  windowLight: [1, 0.74, 0.42, 1],
  facade: [1, 1, 1, 1],
};

/** Materials whose geometry should not cast shadows */
export const NO_SHADOW: ReadonlySet<MaterialKey> = new Set([
  "balconyGlass",
  "glow",
  "blue",
  "red",
  "line",
  "transparent",
  "sign",
  "windowLight",
]);

export type MaterialSet = Record<MaterialKey, Material>;

export function createMaterials(textures: {
  road: Texture;
  sign: Texture;
  facade: { map: Texture; lights: Texture };
}): MaterialSet {
  const standard = (roughness: number, metalness = 0, extra: Partial<MeshStandardMaterial> = {}) =>
    Object.assign(new MeshStandardMaterial({ vertexColors: true, roughness, metalness }), extra);
  const glass = () =>
    new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.08,
      metalness: 0.1,
      ior: 1.5,
      envMapIntensity: 1.3,
    });
  const unlit = (extra: Partial<MeshBasicMaterial> = {}) =>
    Object.assign(new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), extra);
  const overlay = () => new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });

  return {
    ivory: standard(0.55),
    terracotta: standard(0.75),
    facadeGlass: glass(),
    glass: glass(),
    balconyGlass: Object.assign(glass(), { transparent: true, depthWrite: false }),
    deck: standard(0.85),
    planter: standard(0.9),
    stone: standard(0.7),
    metal: standard(0.35, 0.6),
    warm: standard(0.6, 0, { emissive: new Color("#f5c26e"), emissiveIntensity: 0.4 }),
    glow: unlit(),
    blue: unlit(),
    red: unlit(),
    green: standard(0.6, 0, { emissive: new Color("#5cbf99"), emissiveIntensity: 0.15 }),
    foliage: standard(0.9),
    wood: standard(0.8),
    base: standard(0.85),
    road: standard(0.95, 0, { map: textures.road }),
    line: Object.assign(overlay(), { polygonOffset: true, polygonOffsetFactor: -1 }),
    transparent: overlay(),
    sign: new MeshBasicMaterial({ map: textures.sign, transparent: true, vertexColors: true }),
    // HDR colour (> 1) so the bloom pass picks lit windows up at dusk
    windowLight: unlit({
      color: new Color(2.2, 2.2, 2.2),
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
    facade: createFacadeMaterial(textures.facade, 0),
  };
}

/** City facade with lit windows at `glow` (look.ts cityGlow); re-created when the time of day changes */
export function createFacadeMaterial(facade: { map: Texture; lights: Texture }, glow: number) {
  return new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.05,
    map: facade.map,
    emissiveMap: facade.lights,
    emissive: new Color("#ffd29a"),
    emissiveIntensity: glow,
  });
}
