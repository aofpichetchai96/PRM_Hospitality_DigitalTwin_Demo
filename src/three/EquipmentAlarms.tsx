"use client";

// Back of House: every unit with an open alarm blinks in its severity colour
// (Critical fastest), with a ring on the deck around rooftop units. Drawn only
// in Back of House and only while an alarm is open, so other scenes keep
// rendering on demand. Reduced motion shows a steady beacon.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type Group, type MeshBasicMaterial } from "three";
import { useShallow } from "zustand/react/shallow";
import { ASSETS, isRoofEquipment, ROOF_Y, roofEquipment } from "@/data/assets";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useAppStore } from "@/store/useAppStore";
import type { AssetId, Priority, Vec3 } from "@/types";

const COLOR: Record<Priority, string> = { high: "#ff7c81", medium: "#f2a065", low: "#dfbd7e" };
/** Blink period (s) by severity */
const PERIOD: Record<Priority, number> = { high: 0.8, medium: 1.4, low: 2.2 };
const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function Beacon({
  position,
  ring,
  priority,
  still,
}: {
  position: Vec3;
  /** Deck ring around a rooftop unit: [x, z, radius] */
  ring?: [number, number, number];
  priority: Priority;
  still: boolean;
}) {
  const group = useRef<Group>(null);
  const color = COLOR[priority];

  useFrame(({ clock, invalidate }) => {
    const g = group.current;
    if (!g || still) return;
    // Sharp on, soft off: reads as a warning light rather than a glow
    const t = (clock.elapsedTime % PERIOD[priority]) / PERIOD[priority];
    const on = t < 0.5 ? 1 : Math.max(0.15, 1 - (t - 0.5) * 2);
    g.traverse((o) => {
      const m = (o as { material?: MeshBasicMaterial }).material;
      if (m) m.opacity = on * (m.userData.base ?? 1);
    });
    invalidate();
  });

  return (
    <group ref={group}>
      <mesh position={position} raycast={() => null} renderOrder={21}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshBasicMaterial color={color} transparent depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={position} raycast={() => null} renderOrder={21}>
        <sphereGeometry args={[1.6, 16, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35}
          userData={{ base: 0.35 }}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {ring && (
        <mesh position={[ring[0], ROOF_Y + 0.12, ring[1]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[ring[2], ring[2] + 0.45, 40]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function EquipmentAlarms() {
  // "CT-02:high" strings, so the shallow compare sees no change while nothing changes
  const alarms = useAppStore(
    useShallow((s) =>
      // Not while a chiller is opened up: the beacon would hang over its insides
      (s.view === "boh" || s.view === "ioc") && s.chillerView === null
        ? s.incidents.filter((e) => e.status < 3 && e.device).map((e) => `${e.device}:${e.priority}`)
        : [],
    ),
  );
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");

  // One beacon per unit, in the colour of its worst open alarm
  const units = useMemo(() => {
    const worst = new Map<AssetId, Priority>();
    for (const a of alarms) {
      const [id, p] = a.split(":") as [AssetId, Priority];
      if (!worst.has(id) || RANK[p] < RANK[worst.get(id)!]) worst.set(id, p);
    }
    return [...worst];
  }, [alarms]);

  return units.map(([id, priority]) => {
    if (isRoofEquipment(id)) {
      const unit = roofEquipment(id);
      const top: Vec3 = [unit.x, ROOF_Y + unit.size[1] + 1.4, unit.z];
      const radius = Math.max(unit.size[0], unit.size[2]) / 2 + 0.6;
      return <Beacon key={id} position={top} ring={[unit.x, unit.z, radius]} priority={priority} still={still} />;
    }
    const [x, y, z] = ASSETS[id].position;
    return <Beacon key={id} position={[x, y + 4, z]} priority={priority} still={still} />;
  });
}
