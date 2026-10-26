"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export type FpsSample = { fps: number; calls: number; triangles: number };

/**
 * Reports frame rate and draw calls once per second. Runs before each render
 * (negative priority — a positive one would stop R3F's own rendering) and
 * reads the previous frame's renderer stats, summed over all composer passes.
 */
export function FpsProbe({ onSample }: { onSample: (s: FpsSample) => void }) {
  const acc = useRef({ frames: 0, start: 0 });

  useFrame(({ gl, clock }) => {
    const a = acc.current;
    const now = clock.elapsedTime;
    if (a.start === 0) a.start = now;
    a.frames++;
    if (now - a.start >= 1) {
      onSample({ fps: a.frames / (now - a.start), calls: gl.info.render.calls, triangles: gl.info.render.triangles });
      a.frames = 0;
      a.start = now;
    }
    gl.info.autoReset = false;
    gl.info.reset();
  }, -1);

  return null;
}
