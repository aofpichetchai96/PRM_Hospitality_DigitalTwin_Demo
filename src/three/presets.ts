// Camera presets — prototype `focus()` / `floorView()` (L323–324).
// θ / φ / distance use the same spherical convention as three.js and
// camera-controls (azimuth / polar / distance), so they port 1:1.
import { FLOOR_HEIGHT, TOWER_BASE_Y } from "./geometry/exterior";

export type CameraPresetId = "all" | "hotel" | "mall" | "plant" | "arrival" | "roof";

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
};

/** Floor view used by Slice mode: H01–H30 (tower) or G / L1–L4 (podium) */
export function floorPose(floor: string): CameraPose {
  const h = /^H\d+$/.test(floor) ? Number(floor.slice(1)) - 1 : -1;
  if (h >= 0) return { target: [9, TOWER_BASE_Y + h * FLOOR_HEIGHT, -6], azimuth: 0.35, polar: 0.52, distance: 126 };
  const level = floor === "G" ? 0 : Number(floor.slice(1));
  return { target: [0, level * 5.2, 0], azimuth: 0.35, polar: 0.52, distance: 148 };
}

export const CAMERA_LIMITS = {
  minDistance: 70,
  maxDistance: 560,
  minPolarAngle: 0.18,
  maxPolarAngle: 1.56,
  /** Prototype auto-rotate: 0.0016 rad/frame at 60 Hz, now time-based */
  autoRotateSpeed: 0.096,
  /** Box the orbit target may not leave (prototype panning was unbounded) */
  boundary: { min: [-120, 0, -90], max: [120, 170, 90] } as const,
};

/** Equivalent of `target` (mod 2π) closest to `current`, so flights never spin the long way */
export function nearestAngle(current: number, target: number) {
  const twoPi = Math.PI * 2;
  return target + Math.round((current - target) / twoPi) * twoPi;
}
