"use client";

import { useThree } from "@react-three/fiber";
import type { CameraShot, FloorSelection, Layers, Room, SceneMode } from "@/types";
import { type ReactNode, useEffect, useMemo } from "react";
import { BuildingReveal, REVEAL_PLANE } from "./BuildingReveal";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { FpsProbe, type FpsSample } from "./FpsProbe";
import { buildExterior } from "./geometry/exterior";
import { buildLayers } from "./geometry/layers";
import { buildSchematic } from "./geometry/schematic";
import { buildSite } from "./geometry/site";
import { Atmosphere } from "./Atmosphere";
import type { Quality, TimeOfDay } from "./look";
import { LOOK } from "./look";
import { createMaterials } from "./materials";
import { SceneBatches } from "./SceneBatches";
import { createRoadTexture, createSignTexture } from "./textures";

export type SceneSettings = {
  time: TimeOfDay;
  quality: Quality;
  camera: { shot: CameraShot; n: number };
  zoom?: { dir: 1 | -1; n: number };
  autoRotate: boolean;
  topInset?: number;
  /** Scene mode; X-ray, Slice and Explode swap the exterior for the schematic building */
  mode?: SceneMode;
  floor?: FloorSelection;
  explode?: boolean;
  rooms?: readonly Room[];
  layers?: Layers;
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
  const { materials, buildingMaterials, sign, road } = useMemo(() => {
    const sign = createSignTexture();
    const road = createRoadTexture();
    // A second set for the building only, so the mode reveal clips nothing else
    const buildingMaterials = createMaterials({ road, sign: sign.texture });
    for (const m of Object.values(buildingMaterials)) m.clippingPlanes = [REVEAL_PLANE];
    return { materials: createMaterials({ road, sign: sign.texture }), buildingMaterials, sign, road };
  }, []);

  useEffect(() => {
    // Redraw the nameplate once the self-hosted font is available
    void document.fonts.ready.then(() => {
      sign.redraw();
      invalidate();
    });
    return () => {
      Object.values(materials).forEach((m) => m.dispose());
      Object.values(buildingMaterials).forEach((m) => m.dispose());
      sign.texture.dispose();
      road.dispose();
    };
  }, [materials, buildingMaterials, sign, road, invalidate]);

  const { mode = "exterior", floor = "all", explode = false, rooms } = settings;
  const schematicOn = mode !== "exterior" || explode;
  const schematic = useMemo(
    () => (schematicOn ? buildSchematic({ mode, floor, explode, rooms: rooms ?? [] }) : null),
    [schematicOn, mode, floor, explode, rooms],
  );

  const { layers } = settings;
  const layerGeometry = useMemo(
    () =>
      layers
        ? buildLayers({
            layers,
            xray: schematicOn,
            explode,
            rooms: rooms ?? [],
            cutFloor: mode === "slice" && floor !== "all" ? floor : undefined,
          })
        : null,
    [layers, schematicOn, explode, rooms, mode, floor],
  );

  const hidden = LOOK[settings.time].windows ? [] : (["windowLight"] as const);
  const buildingKey = schematicOn ? `${mode}-${floor}-${explode}` : "exterior";

  return (
    <>
      <Atmosphere time={settings.time} shadows={settings.quality !== "low"} shadowKey={buildingKey} />
      <BuildingReveal revealKey={buildingKey} />
      <SceneBatches geometries={site} materials={materials} hidden={hidden} />
      {schematic ? (
        <SceneBatches geometries={schematic} materials={buildingMaterials} />
      ) : (
        <SceneBatches geometries={exterior} materials={buildingMaterials} hidden={hidden} />
      )}
      {layerGeometry && <SceneBatches geometries={layerGeometry} materials={buildingMaterials} />}
      <CameraRig
        request={settings.camera}
        zoom={settings.zoom}
        autoRotate={settings.autoRotate}
        topInset={settings.topInset}
      />
      {settings.quality !== "low" && <Effects time={settings.time} quality={settings.quality} />}
      {onSample && <FpsProbe onSample={onSample} />}
      {children}
    </>
  );
}
