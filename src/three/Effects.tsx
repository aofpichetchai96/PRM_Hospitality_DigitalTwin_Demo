"use client";

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { LOOK, type Quality, type TimeOfDay } from "./look";

/**
 * Post-processing chain. The composer turns renderer tone mapping off, so Khronos Neutral
 * tone mapping is applied here after bloom (same operator the renderer uses when quality is
 * "low" and this component is not mounted).
 */
export function Effects({ time, quality }: { time: TimeOfDay; quality: Quality }) {
  return (
    <EffectComposer multisampling={0}>
      <>{quality === "high" && <N8AO halfRes aoRadius={6} distanceFalloff={1.5} intensity={2.2} quality="medium" />}</>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={LOOK[time].bloom} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  );
}
