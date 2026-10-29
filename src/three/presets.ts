// Camera presets — prototype `focus()` / `floorView()` (L323–324).
// θ / φ / distance use the same spherical convention as three.js and
// camera-controls (azimuth / polar / distance), so they port 1:1.
import { FLOOR_HEIGHT, TOWER_BASE_Y } from "./geometry/exterior";

export type CameraPresetId =
  "all" | "hotel" | "mall" | "plant" | "arrival" | "roof" | "explode" | "chillers" | "serverRoom";

export type CameraPose = {
  target: [number, number, number];
  azimuth: number;
  polar: number;
  distance: number;
};

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPose> = {
  all: { target: [0, 77, 0], azimuth: 0.43, polar: 1.34, distance: 282 },
  hotel: { target: [9, 94, -6], azimuth: 0.47, polar: 1.18, distance: 192 },
  mall: { target: [0, 18, 3], azimuth: 0.65, polar: 1.02, distance: 161 },
  plant: { target: [50, 10, -15], azimuth: 1.15, polar: 1.0, distance: 121 },
  arrival: { target: [-5, 14, 23], azimuth: 0.55, polar: 1.12, distance: 175 },
  roof: { target: [9, 110, -6], azimuth: 0.65, polar: 0.55, distance: 209 },
  // New: the exploded building is ~46 m taller, so frame it from further back
  explode: { target: [0, 96, 0], azimuth: 0.43, polar: 1.3, distance: 345 },
  // Back of House: the central plant house (cut open) from the east, a little towards CH-01 so its card has room on
  // the right
  // ICT: the server room on its own (geometry/serverRoom.ts, origin at the hall centre), seen from the NOC side
  // with every room in frame
  serverRoom: { target: [-1, 0.3, 2.4], azimuth: 0, polar: 0.8, distance: 37 },
  chillers: { target: [57, 2, -22], azimuth: Math.PI / 2, polar: 0.62, distance: 60 },
};

/** Tilt of the plan view: almost straight down, north up (camera-controls is unstable at exactly 0) */
export const TOP_POLAR = 0.02;

/** Floor view used by Slice mode: H01–H30 (tower) or G / L1–L4 (podium); `top` looks straight down */
export function floorPose(floor: string, top = false, tilt?: number): CameraPose {
  const h = /^H\d+$/.test(floor) ? Number(floor.slice(1)) - 1 : -1;
  if (h >= 0) {
    // Centre on the floor plate: the narrow upper floors (H26–H29) sit east of the tower axis
    const [x, z] = h >= 25 && h < 29 ? [19, -7] : [9, -6];
    const target: [number, number, number] = [x, TOWER_BASE_Y + h * FLOOR_HEIGHT, z];
    if (top) return { target, azimuth: 0, polar: TOP_POLAR, distance: 46 };
    if (tilt !== undefined) return { target, azimuth: 0, polar: tilt, distance: 126 };
    return { target, azimuth: 0.35, polar: 0.52, distance: 126 };
  }
  const level = floor === "G" ? 0 : Number(floor.slice(1));
  // Plan view a little south of the plate centre, so the lobby sits clear of the camera feeds at the bottom
  // (the Event Hall on L3 has no feeds: centred)
  if (top) return { target: [0, level * 5.2, floor === "G" ? 6.5 : 0], azimuth: 0, polar: TOP_POLAR, distance: 148 };
  return { target: [0, level * 5.2, 0], azimuth: 0.35, polar: 0.52, distance: 148 };
}

/** Room around the plate in the plan view: a hotel floor fills the view, the podium keeps its surroundings */
export const PLAN_MARGIN = { hotel: 1.4, podium: 1.65, tilted: 1.75, event: 1.24 };

/**
 * Distance at which the plan view fits a floor plate (w × d m) into the visible viewport, with a margin for the
 * overlaid controls. `inset`: pixels hidden under the floating KPI strip (the frustum is that much taller).
 */
export function planDistance(
  plate: { w: number; d: number },
  view: { width: number; height: number; inset: number; fov: number },
  margin = PLAN_MARGIN.hotel,
) {
  const { width, height, inset, fov } = view;
  const tan = Math.tan(((fov / 2) * Math.PI) / 180);
  const full = height + inset;
  const free = Math.max(1, height - inset);
  const fit = Math.max((plate.d * margin * full) / (2 * tan * free), (plate.w * margin * full) / (2 * tan * width));
  return Math.min(CAMERA_LIMITS.maxDistance, Math.max(CAMERA_LIMITS.minDistance, fit));
}

export const CAMERA_LIMITS = {
  /** Close enough for the plan view to fill the viewport with a floor */
  minDistance: 40,
  /** Closest the camera may come while a chiller is opened up */
  insideDistance: 6,
  /** Closest the camera may come in the server room (a rack front) */
  rackDistance: 1.8,
  /** Farthest the camera may go in the server room: the whole room with a margin, never a speck */
  roomMaxDistance: 48,
  maxDistance: 560,
  minPolarAngle: TOP_POLAR,
  maxPolarAngle: 1.56,
  /** Prototype auto-rotate: 0.0016 rad/frame at 60 Hz, now time-based */
  autoRotateSpeed: 0.096,
  /** Box the orbit target may not leave (prototype panning was unbounded) */
  boundary: { min: [-120, 0, -90], max: [120, 170, 90] } as const,
  /** The same for the server room: the target stays over the room (geometry/serverRoom.ts) */
  roomBoundary: { min: [-16, 0, -8], max: [14, 6, 12] } as const,
};

/** Equivalent of `target` (mod 2π) closest to `current`, so flights never spin the long way */
export function nearestAngle(current: number, target: number) {
  const twoPi = Math.PI * 2;
  return target + Math.round((current - target) / twoPi) * twoPi;
}

/** Close orbit around a point, used when an asset or incident is picked */
export function focusPose(target: [number, number, number], distance = 95, azimuth = 0.6, polar = 1.05): CameraPose {
  return { target, azimuth, polar, distance };
}

/** Pose for a store camera shot: a named preset, a floor or a point of focus */
export function shotPose(
  shot:
    | { preset: CameraPresetId }
    | { floor: string; top?: boolean; tilt?: number }
    | { focus: [number, number, number]; distance?: number; azimuth?: number; polar?: number },
): CameraPose {
  if ("preset" in shot) return CAMERA_PRESETS[shot.preset];
  if ("floor" in shot) return floorPose(shot.floor, shot.top, shot.tilt);
  return focusPose(shot.focus, shot.distance, shot.azimuth, shot.polar);
}
