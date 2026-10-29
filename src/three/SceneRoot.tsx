"use client";

import { useThree } from "@react-three/fiber";
import type { CameraShot, FloorSelection, Layers, Room, SceneMode } from "@/types";
import { type ReactNode, useEffect, useMemo } from "react";
import { BuildingReveal, REVEAL_PLANE } from "./BuildingReveal";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { FpsProbe, type FpsSample } from "./FpsProbe";
import { buildCity } from "./geometry/city";
import { buildExterior } from "./geometry/exterior";
import { buildLayers } from "./geometry/layers";
import { buildSchematic } from "./geometry/schematic";
import { buildServerRoom } from "./geometry/serverRoom";
import { buildSite } from "./geometry/site";
import { Atmosphere } from "./Atmosphere";
import { AmbientLife } from "./AmbientLife";
import type { Quality, Season, TimeOfDay } from "./look";
import { Rain } from "./Rain";
import { LOOK } from "./look";
import { createFacadeMaterial, createMaterials } from "./materials";
import { SceneBatches } from "./SceneBatches";
import { createFacadeTextures, createRoadTexture, createSignTexture } from "./textures";
import { useMediaQuery } from "@/lib/useMediaQuery";

export type SceneSettings = {
  time: TimeOfDay;
  /** Weather season: sky, fog and rain (look.ts seasonLook, Rain) */
  season?: Season;
  /** ICT scene: draw only the server room (geometry/serverRoom.ts), none of the building, site or city */
  ict?: boolean;
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
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const site = useMemo(() => buildSite(), []);
  const city = useMemo(() => buildCity(), []);
  const exterior = useMemo(() => buildExterior(), []);
  const { materials, buildingMaterials, sign, road, facade } = useMemo(() => {
    const sign = createSignTexture();
    const road = createRoadTexture();
    const facade = createFacadeTextures();
    const textures = { road, sign: sign.texture, facade };
    // A second set for the building only, so the mode reveal clips nothing else
    const buildingMaterials = createMaterials(textures);
    for (const m of Object.values(buildingMaterials)) m.clippingPlanes = [REVEAL_PLANE];
    return { materials: createMaterials(textures), buildingMaterials, sign, road, facade };
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
      facade.map.dispose();
      facade.lights.dispose();
    };
  }, [materials, buildingMaterials, sign, road, facade, invalidate]);

  // City windows light up at dusk: its own material set with the facade per time of day
  const cityGlow = LOOK[settings.time].cityGlow;
  const cityMaterials = useMemo(
    () => ({ ...materials, facade: createFacadeMaterial(facade, cityGlow) }),
    [materials, facade, cityGlow],
  );
  useEffect(() => () => cityMaterials.facade.dispose(), [cityMaterials]);

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

  const serverRoom = useMemo(() => (settings.ict ? buildServerRoom() : null), [settings.ict]);
  const hidden = LOOK[settings.time].windows ? [] : (["windowLight"] as const);
  const buildingKey = schematicOn ? `${mode}-${floor}-${explode}` : "exterior";

  return (
    <>
      <Atmosphere
        time={settings.time}
        season={settings.season}
        shadows={settings.quality !== "low"}
        shadowKey={serverRoom ? "ict" : buildingKey}
      />
      {serverRoom ? (
        <SceneBatches geometries={serverRoom} materials={materials} />
      ) : (
        <>
          {settings.season === "rainy" && <Rain still={settings.quality === "low" || reduced} />}
          <BuildingReveal revealKey={buildingKey} />
          <SceneBatches geometries={city} materials={cityMaterials} />
          <SceneBatches geometries={site} materials={materials} hidden={hidden} />
          {schematic ? (
            <SceneBatches geometries={schematic} materials={buildingMaterials} />
          ) : (
            <SceneBatches geometries={exterior} materials={buildingMaterials} hidden={hidden} />
          )}
          {layerGeometry && <SceneBatches geometries={layerGeometry} materials={buildingMaterials} />}
          {/* Moving cars and people keep the canvas rendering every frame: not on Low quality */}
          {settings.quality !== "low" && <AmbientLife time={settings.time} />}
        </>
      )}
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
