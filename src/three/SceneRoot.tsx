"use client";

import { useThree } from "@react-three/fiber";
import { type ReactNode, useEffect, useMemo } from "react";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { FpsProbe, type FpsSample } from "./FpsProbe";
import { buildExterior } from "./geometry/exterior";
import { buildSite } from "./geometry/site";
import { Atmosphere } from "./Atmosphere";
import type { Quality, TimeOfDay } from "./look";
import { LOOK } from "./look";
import { createMaterials } from "./materials";
import type { CameraPresetId } from "./presets";
import { SceneBatches } from "./SceneBatches";
import { createRoadTexture, createSignTexture } from "./textures";

export type SceneSettings = {
  time: TimeOfDay;
  quality: Quality;
  camera: { preset: CameraPresetId; n: number };
  autoRotate: boolean;
};

export function SceneRoot({
  settings,
  onSample,
  children,
}: {
  settings: SceneSettings;
  onSample?: (s: FpsSample) => void;
  children?: ReactNode;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const site = useMemo(() => buildSite(), []);
  const exterior = useMemo(() => buildExterior(), []);
  const { materials, sign, road } = useMemo(() => {
    const sign = createSignTexture();
    const road = createRoadTexture();
    return { materials: createMaterials({ road, sign: sign.texture }), sign, road };
  }, []);

  useEffect(() => {
    // Redraw the nameplate once the self-hosted font is available
    void document.fonts.ready.then(() => {
      sign.redraw();
      invalidate();
    });
    return () => {
      Object.values(materials).forEach((m) => m.dispose());
      sign.texture.dispose();
      road.dispose();
    };
  }, [materials, sign, road, invalidate]);

  const hidden = LOOK[settings.time].windows ? [] : (["windowLight"] as const);

  return (
    <>
      <Atmosphere time={settings.time} shadows={settings.quality !== "low"} />
      <SceneBatches geometries={site} materials={materials} hidden={hidden} />
      <SceneBatches geometries={exterior} materials={materials} hidden={hidden} />
      <CameraRig request={settings.camera} autoRotate={settings.autoRotate} />
      {settings.quality !== "low" && <Effects time={settings.time} quality={settings.quality} />}
      {onSample && <FpsProbe onSample={onSample} />}
      {children}
    </>
  );
}
