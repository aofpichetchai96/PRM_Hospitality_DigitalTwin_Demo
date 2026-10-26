"use client";

// Glowing outline around the picked floor and a fainter one around the hovered
// floor (3D_PLAN 5.3). Small geometries rebuilt only when the floor changes.
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { MeshBasicMaterial } from "three";
import { floorSpec } from "@/data/property";
import { useAppStore } from "@/store/useAppStore";
import type { FloorId } from "@/types";
import { GeometryBuilder } from "../geometry/builder";
import { floorLevel } from "../geometry/schematic";
import { useHover } from "./hover";

function Outline({
  floor,
  explode,
  opacity,
  width,
}: {
  floor: FloorId;
  explode: boolean;
  opacity: number;
  width: number;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => {
    const spec = floorSpec(floor);
    const { x, z, w, d } = spec.footprint;
    const g = new GeometryBuilder(1);
    const y = floorLevel(floor, explode);
    g.outline(x, y + 0.3, z, w + 1.8, d + 1.8, width);
    g.outline(x, y + spec.height - 0.2, z, w + 1.8, d + 1.8, width);
    return g.build().get("glow")!;
  }, [floor, explode, width]);
  const material = useMemo(
    () => new MeshBasicMaterial({ color: "#6ce4df", transparent: true, opacity, toneMapped: false, depthTest: false }),
    [opacity],
  );
  useEffect(() => {
    invalidate();
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material, invalidate]);
  return <mesh geometry={geometry} material={material} renderOrder={10} raycast={() => null} />;
}

export function FloorHighlight() {
  const selected = useAppStore((s) => s.selectedFloor);
  const explode = useAppStore((s) => s.explode);
  const sliced = useAppStore((s) => s.mode === "slice");
  const hovered = useHover((s) => s.hover?.floor);
  if (sliced) return null;
  return (
    <>
      {selected && <Outline floor={selected} explode={explode} opacity={1} width={0.45} />}
      {hovered && hovered !== selected && <Outline floor={hovered} explode={explode} opacity={0.55} width={0.25} />}
    </>
  );
}
