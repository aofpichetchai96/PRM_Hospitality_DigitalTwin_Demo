// Look settings per time of day (docs/3D_PLAN.md 4.3). Values start from the
// prototype shader (L112) and viewport CSS, then are tuned for tone mapping.
export type TimeOfDay = "day" | "dusk";
export type Quality = "high" | "medium" | "low";

export const QUALITY_LABEL: Record<Quality, string> = {
  high: "High · AO + Bloom + Shadows",
  medium: "Medium · Bloom + Shadows",
  low: "Low · no post-processing",
};

/** Prototype light direction (-0.6, 1, 0.9), placed far enough to cover the site */
export const SUN_POSITION: [number, number, number] = [-0.6 * 180, 1 * 180, 0.9 * 180];

type Vec3 = [number, number, number];
/** A rectangular light card in the environment map (what glass reflects) */
type EnvLight = { color: string; intensity: number; scale: Vec3; position: Vec3; rotation: Vec3 };

type Placement = Omit<EnvLight, "color" | "intensity">;
// Card placements: overhead sky, then horizon cards behind, left, right and in front of the site
const OVERHEAD: Placement = { scale: [400, 400, 1], position: [0, 220, 0], rotation: [Math.PI / 2, 0, 0] };
const BACK: Placement = { scale: [400, 120, 1], position: [0, 60, -220], rotation: [0, 0, 0] };
const LEFT: Placement = { scale: [400, 120, 1], position: [-220, 60, 0], rotation: [0, Math.PI / 2, 0] };
const RIGHT: Placement = { scale: [400, 120, 1], position: [220, 60, 0], rotation: [0, -Math.PI / 2, 0] };
const FRONT: Placement = { scale: [400, 80, 1], position: [0, 30, 220], rotation: [0, Math.PI, 0] };
const card = (place: Placement, color: string, intensity: number): EnvLight => ({ ...place, color, intensity });

export const LOOK: Record<
  TimeOfDay,
  {
    sky: readonly [string, string, string];
    skyCenter: readonly [number, number];
    fog: string;
    hemi: { sky: string; ground: string; intensity: number };
    sun: { color: string; intensity: number };
    envIntensity: number;
    /** Reflection colours follow the prototype's fresnel sky (#3b5779 → #8fb0c9) */
    envLights: EnvLight[];
    windows: boolean;
    bloom: number;
    /** Emissive strength of the city's lit windows */
    cityGlow: number;
  }
> = {
  day: {
    sky: ["#e0e9e8", "#b5ced8", "#708e9f"],
    skyCenter: [0.5, 0.22],
    // Light haze matching the sky, so the city fades out instead of turning into a dark band
    fog: "#b4c7d1",
    hemi: { sky: "#dfe9f3", ground: "#4d5862", intensity: 0.65 },
    sun: { color: "#fff0d8", intensity: 3.2 },
    envIntensity: 0.75,
    envLights: [
      card(OVERHEAD, "#a9c4da", 1.2),
      card(BACK, "#8fb0c9", 1.0),
      card(LEFT, "#ffe2bd", 0.8),
      card(RIGHT, "#8fb0c9", 0.6),
      card(FRONT, "#6f8fae", 0.4),
    ],
    windows: false,
    bloom: 0.2,
    cityGlow: 0,
  },
  dusk: {
    sky: ["#23435e", "#0f2236", "#081321"],
    skyCenter: [0.48, 0.35],
    fog: "#0e1d30",
    hemi: { sky: "#5a7698", ground: "#151c27", intensity: 0.45 },
    sun: { color: "#9db6da", intensity: 0.45 },
    envIntensity: 0.35,
    envLights: [
      card(OVERHEAD, "#5b7ea8", 0.6),
      card(BACK, "#2d4a6b", 0.35),
      card(LEFT, "#3b5274", 0.25),
      card(RIGHT, "#9fb6c8", 0.2),
      card(FRONT, "#f2b36b", 0.8),
    ],
    windows: true,
    bloom: 1.1,
    cityGlow: 0.28,
  },
};

/** Fog starts at 420 m so the hotel stays crisp even at full zoom-out (560 m), and is complete before the camera far plane (1,500 m) */
export const FOG_RANGE: [number, number] = [420, 1400];

export type Season = "summer" | "rainy" | "haze";
type Look = (typeof LOOK)[TimeOfDay];

/**
 * A season on top of the time of day: the hot season is the reference look; the rainy season greys the sky out,
 * dims the sun and pulls the fog in (with rain, three/Rain.tsx); the haze season tints everything dusty brown and
 * brings the fog close, so the city disappears into PM2.5.
 */
export function seasonLook(time: TimeOfDay, season: Season): Look & { fogRange: [number, number] } {
  const base = LOOK[time];
  if (season === "summer") return { ...base, fogRange: FOG_RANGE };
  const day = time === "day";
  if (season === "rainy")
    return {
      ...base,
      sky: day ? ["#c3cbd0", "#97a5ae", "#5f6e78"] : ["#1b2a38", "#111c27", "#0a121b"],
      fog: day ? "#9eabb3" : "#152230",
      hemi: { ...base.hemi, sky: day ? "#c9d3da" : base.hemi.sky, intensity: base.hemi.intensity * 1.15 },
      sun: { color: day ? "#dfe6ee" : base.sun.color, intensity: base.sun.intensity * 0.32 },
      envIntensity: base.envIntensity * 0.8,
      fogRange: [160, 900],
    };
  return {
    ...base,
    sky: day ? ["#d8c7a4", "#bba57f", "#8a7a60"] : ["#3a3022", "#241d15", "#14100b"],
    fog: day ? "#bfae8d" : "#2b2319",
    hemi: { ...base.hemi, sky: day ? "#e6d6b6" : base.hemi.sky },
    sun: { color: day ? "#ffd29a" : base.sun.color, intensity: base.sun.intensity * 0.6 },
    fogRange: [110, 700],
  };
}

export const SEASON_LABEL: Record<Season, { label: string; th: string }> = {
  summer: { label: "Hot season", th: "หน้าร้อน" },
  rainy: { label: "Rainy season", th: "หน้าฝน" },
  haze: { label: "Haze season · PM2.5", th: "หน้าฝุ่น PM2.5" },
};
