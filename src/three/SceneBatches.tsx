"use client";

import { useEffect } from "react";
import type { BufferGeometry } from "three";
import { type MaterialKey, type MaterialSet, NO_SHADOW } from "./materials";

/** Renders one mesh per material batch produced by a GeometryBuilder */
export function SceneBatches({
  geometries,
  materials,
  hidden = [],
}: {
  geometries: Map<MaterialKey, BufferGeometry>;
  materials: MaterialSet;
  hidden?: readonly MaterialKey[];
}) {
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  return (
    <>
      {[...geometries].map(([key, geometry]) => (
        <mesh
          key={key}
          geometry={geometry}
          material={materials[key]}
          visible={!hidden.includes(key)}
          castShadow={!NO_SHADOW.has(key)}
          receiveShadow={!NO_SHADOW.has(key)}
          // Picking uses dedicated proxies (3D_PLAN 5.2); display meshes never raycast
          raycast={() => null}
        />
      ))}
    </>
  );
}
