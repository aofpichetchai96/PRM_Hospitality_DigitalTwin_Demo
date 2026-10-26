"use client";

// Mode transition (3D_PLAN 6.4): when the building changes (Exterior ↔ X-ray /
// Slice / Explode) the new one rises from the ground behind a clipping plane,
// instead of the prototype's instant swap. Only the building's materials clip;
// the site and context stay put.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Plane, Vector3 } from "three";
import { DURATION } from "@/lib/motion";

/** Above everything: nothing clipped */
const OPEN = 1e4;
/** Height the reveal sweeps to — top of the exploded crown */
const TOP = 210;
const SECONDS = DURATION.slow * 1.5;

/** Shared by the building materials; keeps fragments with y ≤ constant */
export const REVEAL_PLANE = new Plane(new Vector3(0, -1, 0), OPEN);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function BuildingReveal({ revealKey }: { revealKey: string }) {
  const invalidate = useThree((s) => s.invalidate);
  const start = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    // The first building appears as is; reduced motion skips the sweep
    if (first.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      first.current = false;
      return;
    }
    start.current = -1;
    invalidate();
  }, [revealKey, invalidate]);

  useFrame(({ clock, gl }) => {
    if (start.current === null) return;
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / SECONDS);
    REVEAL_PLANE.constant = t < 1 ? easeOut(t) * TOP : OPEN;
    if (t < 1) invalidate();
    else {
      start.current = null;
      // Shadows were rendered while the building was still clipped
      gl.shadowMap.needsUpdate = true;
    }
  });

  return null;
}
