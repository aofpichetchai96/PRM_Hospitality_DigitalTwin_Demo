"use client";

// "Locate in 3D" marker (3D_PLAN 5.5): a ring pulsing 1 → 2.5× and fading,
// every 1.2 s, plus a thin vertical line so it reads from far away. Only drawn
// in the IOC view or for an incoming alert, so other views keep rendering on demand.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from "three";
import { useAppStore } from "@/store/useAppStore";

const PERIOD = 1.2;
const COLOR = { high: "#ff7c81", medium: "#dfbd7e", low: "#7eb7ff" };

export function IncidentMarker() {
  // Same incident the workflow panel follows: the focused one, else the first open one
  const incident = useAppStore((s) => {
    if (s.view !== "ioc") {
      const alerted = s.alert ? s.incidents.find((e) => e.id === s.alert?.id) : undefined;
      return alerted && alerted.status === 0 ? alerted : undefined;
    }
    const open = s.incidents.filter((e) => e.status < 3);
    return open.find((e) => e.id === s.incidentFocus) ?? open[0];
  });
  const ring = useRef<Mesh>(null);

  useFrame(({ clock, invalidate }) => {
    const m = ring.current;
    if (!m) return;
    const t = (clock.elapsedTime % PERIOD) / PERIOD;
    m.scale.setScalar(1 + 1.5 * t);
    (m.material as MeshBasicMaterial).opacity = 1 - t;
    invalidate();
  });

  if (!incident) return null;
  const [x, y, z] = incident.position;
  const color = COLOR[incident.priority];
  return (
    <group position={[x, y, z]} renderOrder={20}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[2.2, 3, 40]} />
        <meshBasicMaterial color={color} transparent depthTest={false} toneMapped={false} blending={AdditiveBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[1, 1.5, 32]} />
        <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 15, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.12, 0.12, 30, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
