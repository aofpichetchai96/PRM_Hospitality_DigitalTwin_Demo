"use client";

import { useFrame, useThree } from "@react-three/fiber";

/** DOM id of the compass needle rendered by the viewport overlay */
export const COMPASS_NEEDLE_ID = "scene-compass-needle";

/**
 * Turns the DOM compass needle with the camera heading (prototype compass,
 * L321). Writes straight to the element so the UI never re-renders per frame.
 */
export function CompassSync() {
  const controls = useThree((s) => s.controls) as { azimuthAngle?: number } | null;
  useFrame(() => {
    const el = document.getElementById(COMPASS_NEEDLE_ID);
    if (el && controls?.azimuthAngle !== undefined) el.style.transform = `rotate(${controls.azimuthAngle}rad)`;
  });
  return null;
}
