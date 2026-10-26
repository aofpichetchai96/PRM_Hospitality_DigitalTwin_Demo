"use client";

import { CameraControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, Vector3 } from "three";
import { CAMERA_LIMITS, CAMERA_PRESETS, type CameraPose, type CameraPresetId, nearestAngle } from "./presets";

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

type Props = {
  /** Changing `request` (even to the same preset) triggers a new flight */
  request: { preset: CameraPresetId; n: number };
  autoRotate: boolean;
};

export function CameraRig({ request, autoRotate }: Props) {
  const ref = useRef<CameraControls>(null);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const dragging = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { min, max } = CAMERA_LIMITS.boundary;
    c.setBoundary(new Box3(new Vector3(...min), new Vector3(...max)));
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // First pose is applied instantly; later requests fly
    void flyTo(c, CAMERA_PRESETS[request.preset], !first.current);
    first.current = false;
  }, [request]);

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
      minDistance={CAMERA_LIMITS.minDistance}
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
