"use client";

// Phase 9 layer effects (PLAN 6.5, stretch): chilled water flowing up the
// riser, a crowd-density heatmap and security camera view cones. Animated
// effects only request frames while they are visible.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  type InstancedMesh,
  Matrix4,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useShallow } from "zustand/react/shallow";
import { REFERENCE_FOOTFALL } from "@/data/energy";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { createLcg } from "@/lib/random";
import { useAppStore } from "@/store/useAppStore";
import { riserPath, SECURITY_CAMERAS } from "../geometry/layers";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// ---------------------------------------------------------------- Energy flow

const PARTICLES = 36;
/** Metres per second along the riser */
const FLOW_SPEED = 14;
const m4 = new Matrix4();
const pos = new Vector3();
const one = new Vector3(1, 1, 1);
const noRotation = new Quaternion();

function EnergyFlow() {
  const s = useAppStore(
    useShallow((st) => ({
      explode: st.explode,
      cut: st.mode === "slice" && st.floor !== "all" ? st.floor : undefined,
    })),
  );
  const ref = useRef<InstancedMesh>(null);
  const path = useMemo(() => riserPath(s.explode, s.cut), [s.explode, s.cut]);
  // Cumulative segment lengths for sampling the polyline by distance
  const lengths = useMemo(() => {
    const acc = [0];
    for (let i = 1; i < path.length; i++)
      acc.push(acc[i - 1] + new Vector3(...path[i]).distanceTo(new Vector3(...path[i - 1])));
    return acc;
  }, [path]);

  useFrame(({ clock, invalidate }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const total = lengths[lengths.length - 1];
    for (let k = 0; k < PARTICLES; k++) {
      const d = (clock.elapsedTime * FLOW_SPEED + (k / PARTICLES) * total) % total;
      let i = 1;
      while (i < lengths.length - 1 && lengths[i] < d) i++;
      const t = (d - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      pos.set(...path[i - 1]).lerp(new Vector3(...path[i]), t);
      mesh.setMatrixAt(k, m4.compose(pos, noRotation, one));
    }
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, PARTICLES]} raycast={() => null} frustumCulled={false}>
      <sphereGeometry args={[0.55, 8, 6]} />
      <meshBasicMaterial color="#9fe8ff" toneMapped={false} />
    </instancedMesh>
  );
}

// ------------------------------------------------------------- People heatmap

const HEAT = { x: [-36, 36], z: [2, 36], size: 256 } as const;
const HOTSPOTS = 42;

/** Gaussian blobs drawn on a canvas; density follows today's footfall */
function drawHeat(ctx: CanvasRenderingContext2D, intensity: number) {
  const n = HEAT.size;
  ctx.clearRect(0, 0, n, n);
  const rand = createLcg(77031);
  const r = () => rand() / 2 ** 32;
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < HOTSPOTS; i++) {
    // Denser towards the arrival canopy and the main entrance (front middle)
    const x = n * (0.15 + 0.7 * (r() * 0.6 + r() * 0.4));
    const y = n * (0.35 + 0.6 * r());
    const radius = n * (0.05 + 0.08 * r());
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(255,255,255,${0.16 * intensity})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  // Map accumulated brightness to a green → amber → red ramp
  const img = ctx.getImageData(0, 0, n, n);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.min(1, d[i] / 255);
    d[i] = Math.round(80 + 175 * Math.min(1, v * 1.6));
    d[i + 1] = Math.round(220 - 150 * Math.max(0, v - 0.45) * 1.8);
    d[i + 2] = Math.round(150 * (1 - v));
    d[i + 3] = Math.round(200 * Math.min(1, v * 1.4));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.putImageData(img, 0, 0);
}

function PeopleHeatmap() {
  // Recompute in steps of 5 % footfall so a tick does not redraw the canvas
  const level = useAppStore((st) => Math.round((st.footfall / REFERENCE_FOOTFALL) * 20) / 20);
  // A fresh texture per density level: drawing happens once, when it is created
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = HEAT.size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) drawHeat(ctx, Math.min(1.6, Math.max(0.3, level)));
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [level]);
  useEffect(() => () => texture.dispose(), [texture]);

  const w = HEAT.x[1] - HEAT.x[0];
  const d = HEAT.z[1] - HEAT.z[0];
  return (
    <mesh
      position={[(HEAT.x[0] + HEAT.x[1]) / 2, 0.45, (HEAT.z[0] + HEAT.z[1]) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
      renderOrder={5}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ------------------------------------------------------------- Security cones

const CONE = { length: 14, radius: 6 };
const down = new Vector3(0, -1, 0);

function SecurityCones() {
  // Each camera looks out from the building and down towards the plaza
  const cones = useMemo(
    () =>
      SECURITY_CAMERAS.map(([x, y, z]) => {
        const dir = new Vector3(x, 0, z)
          .normalize()
          .multiplyScalar(0.9)
          .add(new Vector3(0, -0.7, 0))
          .normalize();
        const q = new Quaternion().setFromUnitVectors(down, dir);
        const centre = new Vector3(x, y, z).addScaledVector(dir, CONE.length / 2);
        return { q, centre };
      }),
    [],
  );
  return cones.map(({ q, centre }, i) => (
    <mesh key={i} position={centre} quaternion={q} raycast={() => null} renderOrder={6}>
      {/* The cone's tip (+y) sits at the camera; its open base faces the view direction */}
      <coneGeometry args={[CONE.radius, CONE.length, 24, 1, true]} />
      <meshBasicMaterial
        color="#6ce4df"
        transparent
        opacity={0.1}
        depthWrite={false}
        side={2}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  ));
}

export function LayerEffects() {
  const layers = useAppStore((s) => s.layers);
  const reduced = useMediaQuery(REDUCED_MOTION);
  return (
    <>
      {layers.energy && !reduced && <EnergyFlow />}
      {layers.people && <PeopleHeatmap />}
      {layers.security && <SecurityCones />}
    </>
  );
}
