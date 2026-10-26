"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { FOG_RANGE, LOOK, SUN_POSITION, type TimeOfDay } from "./look";
import { createSkyTexture } from "./textures";

/** Sky, fog, lights, static shadow map and a file-free environment map */
export function Atmosphere({ time, shadows }: { time: TimeOfDay; shadows: boolean }) {
  const look = LOOK[time];
  const invalidate = useThree((s) => s.invalidate);
  const sky = useMemo(() => createSkyTexture(look.sky, look.skyCenter), [look]);
  useEffect(() => () => sky.dispose(), [sky]);

  // Static shadow map: re-render it once per look change instead of every
  // frame (3D_PLAN 4.3). Geometry does not move in Phase 1.
  const shadowDirty = useRef(true);
  useEffect(() => {
    shadowDirty.current = true;
    invalidate();
  }, [time, shadows, invalidate]);
  useFrame(({ gl }) => {
    gl.shadowMap.autoUpdate = false;
    if (shadowDirty.current) {
      gl.shadowMap.needsUpdate = true;
      shadowDirty.current = false;
    }
  });

  return (
    <>
      <primitive attach="background" object={sky} />
      <fog attach="fog" args={[look.fog, ...FOG_RANGE]} />
      <hemisphereLight args={[look.hemi.sky, look.hemi.ground, look.hemi.intensity]} />
      <directionalLight
        position={SUN_POSITION}
        color={look.sun.color}
        intensity={look.sun.intensity}
        castShadow={shadows}
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-camera-near={10}
        shadow-camera-far={600}
      />
      {/*
        Environment built from Lightformers — no HDR file and no CDN request
        (drei presets load from the network; PLAN R10). Rendered once per look.
      */}
      <Environment key={time} resolution={256} frames={1} environmentIntensity={look.envIntensity}>
        {look.envLights.map((l, i) => (
          <Lightformer key={i} form="rect" {...l} />
        ))}
      </Environment>
    </>
  );
}
