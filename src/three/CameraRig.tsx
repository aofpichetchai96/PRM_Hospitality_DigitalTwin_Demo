"use client";

import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, PerspectiveCamera, Vector3 } from "three";
import { useAppStore } from "@/store/useAppStore";
import type { CameraShot } from "@/types";
import { FLOORS, isHotelFloor } from "@/data/property";
import { CAMERA_LIMITS, type CameraPose, nearestAngle, PLAN_MARGIN, planDistance, shotPose } from "./presets";

/** Fly to a pose along an orbit, taking the shortest way round (3D_PLAN 6.2) */
export async function flyTo(controls: CameraControls, pose: CameraPose, animate = true) {
  controls.normalizeRotations();
  const azimuth = nearestAngle(controls.azimuthAngle, pose.azimuth);
  await Promise.all([
    controls.moveTo(...pose.target, animate),
    controls.rotateTo(azimuth, pose.polar, animate),
    controls.dollyTo(pose.distance, animate),
  ]);
}

/** Dolly factor per zoom button press */
const ZOOM_STEP = 0.8;

type Props = {
  /** Changing `request` (even to the same shot) triggers a new flight */
  request: { shot: CameraShot; n: number };
  /** Zoom buttons: `dir` 1 = in, -1 = out */
  zoom?: { dir: 1 | -1; n: number };
  autoRotate: boolean;
  /** Pixels covered by UI at the top (floating KPI strip); the picture is centred below it */
  topInset?: number;
};

export function CameraRig({ request, zoom, autoRotate, topInset = 0 }: Props) {
  const ref = useRef<CameraControls>(null);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const getState = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  // A chiller's inside view needs the camera much closer than the building views allow
  const inside = useAppStore((s) => s.chillerView !== null);
  const dragging = useRef(false);
  const first = useRef(true);
  // Read by the flight effect without re-flying when the strip comes or goes
  const inset = useRef(topInset);
  useEffect(() => {
    inset.current = topInset;
  }, [topInset]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { min, max } = CAMERA_LIMITS.boundary;
    c.setBoundary(new Box3(new Vector3(...min), new Vector3(...max)));
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const shot = request.shot;
    if ("azimuth" in shot) {
      // Compass: turn in place, the short way round
      c.normalizeRotations();
      void c.rotateTo(nearestAngle(c.azimuthAngle, shot.azimuth), c.polarAngle, true);
      return;
    }
    const pose = { ...shotPose(shot) };
    // Plan view: as close as the floor plate still fits this viewport
    const fitted = "floor" in shot && (shot.top || shot.tilt !== undefined) ? shot.floor : undefined;
    const plate = fitted && FLOORS.find((f) => f.id === fitted)?.footprint;
    const { camera, size: view } = getState();
    if (fitted && plate && camera instanceof PerspectiveCamera) {
      // A tilted view sees the plate foreshortened north to south
      const tilted = "tilt" in shot && shot.tilt !== undefined;
      pose.distance = planDistance(
        tilted ? { w: plate.w, d: plate.d * Math.cos(pose.polar) } : plate,
        { ...view, inset: inset.current, fov: camera.fov },
        tilted ? PLAN_MARGIN.tilted : isHotelFloor(fitted) ? PLAN_MARGIN.hotel : PLAN_MARGIN.podium,
      );
    }
    // First pose is applied instantly; later requests fly
    void flyTo(c, pose, !first.current);
    first.current = false;
  }, [request, getState]);

  useEffect(() => {
    const c = ref.current;
    // n = 0 is the initial state, not a button press
    if (!c || !zoom?.n) return;
    void c.dollyTo(c.distance * (zoom.dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP), true);
  }, [zoom]);

  // Render a taller virtual view and show its top part, so the scene centre
  // sits in the middle of the area left free below the overlay
  useEffect(() => {
    // Read the camera from R3F's state: three objects are mutable by design
    const { camera } = getState();
    if (!(camera instanceof PerspectiveCamera)) return;
    // Aspect must describe the full virtual view or the picture stretches
    camera.aspect = size.width / (size.height + topInset);
    if (topInset > 0) camera.setViewOffset(size.width, size.height + topInset, 0, 0, size.width, size.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    invalidate();
  }, [getState, size, topInset, invalidate]);

  // Auto-rotate needs continuous frames; everything else renders on demand
  useEffect(() => {
    setFrameloop(autoRotate ? "always" : "demand");
    return () => setFrameloop("demand");
  }, [autoRotate, setFrameloop]);

  useFrame((_, delta) => {
    if (autoRotate && !dragging.current) ref.current?.rotate(CAMERA_LIMITS.autoRotateSpeed * delta, 0, false);
  });

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={inside ? CAMERA_LIMITS.insideDistance : CAMERA_LIMITS.minDistance}
      maxDistance={CAMERA_LIMITS.maxDistance}
      minPolarAngle={CAMERA_LIMITS.minPolarAngle}
      maxPolarAngle={CAMERA_LIMITS.maxPolarAngle}
      smoothTime={0.25}
      draggingSmoothTime={0.1}
      dollyToCursor
      onControlStart={() => (dragging.current = true)}
      onControlEnd={() => (dragging.current = false)}
    />
  );
}
