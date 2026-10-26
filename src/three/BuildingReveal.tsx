"use client";

// Mode transition (3D_PLAN 6.4): when the building changes (Exterior ↔ X-ray /
// Slice / Explode) the new one rises from the ground behind a clipping plane,
// instead of the prototype's instant swap. Only the building's materials clip;
// the site and context stay put.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Plane, Vector3 } from "three";
import { DURATION } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";

/** Above everything: nothing clipped */
const OPEN = 1e4;
/** Height the reveal sweeps to — top of the exploded crown */
const TOP = 210;
const SECONDS = DURATION.slow * 1.5;

/** Shared by the building materials; keeps fragments with y ≤ constant */
export const REVEAL_PLANE = new Plane(new Vector3(0, -1, 0), OPEN);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Opening sweep: slower and linear, so floors visibly stack up (PLAN 6.5 intro) */
const INTRO_SECONDS = 2.6;

export function BuildingReveal({ revealKey }: { revealKey: string }) {
  const invalidate = useThree((s) => s.invalidate);
  const intro = useAppStore((s) => s.intro);
  const finishIntro = useAppStore((s) => s.finishIntro);
  const start = useRef<number | null>(null);
  const duration = useRef(SECONDS);
  const first = useRef(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (first.current) {
      first.current = false;
      // First load: play the "constructing" sweep unless motion is reduced
      if (!intro || reduced) return finishIntro();
      duration.current = INTRO_SECONDS;
      REVEAL_PLANE.constant = 0;
    } else {
      if (reduced) return;
      duration.current = SECONDS;
    }
    start.current = -1;
    invalidate();
    // Only a new building (or the first mount) starts a sweep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey, invalidate]);

  // Skipping the intro finishes the sweep at once
  useEffect(() => {
    if (!intro && duration.current === INTRO_SECONDS && start.current !== null) {
      start.current = null;
      REVEAL_PLANE.constant = OPEN;
      invalidate();
    }
  }, [intro, invalidate]);

  useFrame(({ clock, gl }) => {
    if (start.current === null) return;
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / duration.current);
    const eased = duration.current === INTRO_SECONDS ? t : easeOut(t);
    REVEAL_PLANE.constant = t < 1 ? eased * TOP : OPEN;
    if (t < 1) invalidate();
    else {
      start.current = null;
      // Shadows were rendered while the building was still clipped
      gl.shadowMap.needsUpdate = true;
      if (duration.current === INTRO_SECONDS) finishIntro();
    }
  });

  return null;
}
