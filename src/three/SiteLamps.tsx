"use client";

// Dusk light pools under the site's lamp posts (geometry/landscape.ts): one
// warm radial glow per lamp on the ground, additive, instanced. The bulbs
// themselves are windowLight geometry, shown at dusk only; this draws nothing
// in daylight. Static: no per-frame work.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CanvasTexture, type InstancedMesh, Matrix4, SRGBColorSpace } from "three";
import { useAppStore } from "@/store/useAppStore";
import { SITE_LAMPS } from "./geometry/landscape";

/** Radius of the lit patch on the ground (m) */
const POOL = 5.5;

function poolTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,206,140,0.85)");
    g.addColorStop(0.35, "rgba(255,180,105,0.38)");
    g.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function SiteLamps() {
  const dusk = useAppStore((s) => s.timeOfDay === "dusk");
  if (!dusk) return null;
  return <Pools />;
}

function Pools() {
  const ref = useRef<InstancedMesh>(null);
  const texture = useMemo(() => poolTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    SITE_LAMPS.forEach((l, i) => {
      // Lying flat just above the paving it lights (lawns sit 12 cm higher and take the edge of it)
      m.makeRotationX(-Math.PI / 2).setPosition(l.x, l.ground + 0.2, l.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, SITE_LAMPS.length]} raycast={() => null} renderOrder={3}>
      <planeGeometry args={[POOL * 2, POOL * 2]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
}
