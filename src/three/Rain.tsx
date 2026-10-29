"use client";

// Rainy season: streaks of rain over the site. One static set of line
// segments in a box round the building, drawn twice one box-height apart and
// slid down together, so falling rain costs no buffer updates — just a group
// position per frame. Renders every frame while shown; held still with reduced
// motion. Haze season has no particles: its fog and sky do the work (look.ts).
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferGeometry, Float32BufferAttribute, type Group } from "three";
import { createRng } from "./geometry/builder";

/** Box the rain falls in (m) and how many streaks it holds */
const SPAN = 320;
const HEIGHT = 170;
const COUNT = 7000;
/** Streak length and slant (wind from the west) */
const LENGTH = 2.4;
const SLANT = 0.35;
/** Fall speed (m/s) */
const SPEED = 38;

function rainGeometry() {
  const rand = createRng(27011);
  const p: number[] = [];
  for (let i = 0; i < COUNT; i++) {
    const x = (rand() - 0.5) * SPAN;
    const z = (rand() - 0.5) * SPAN;
    const y = rand() * HEIGHT;
    p.push(x, y, z, x + SLANT, y + LENGTH, z);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(p, 3));
  g.computeBoundingSphere();
  return g;
}

export function Rain({ still = false }: { still?: boolean }) {
  const geometry = useMemo(() => rainGeometry(), []);
  const group = useRef<Group>(null);
  useFrame(({ clock, invalidate }) => {
    if (still || !group.current) return;
    const fall = (clock.elapsedTime * SPEED) % HEIGHT;
    group.current.position.set(-fall * (SLANT / LENGTH), -fall, 0);
    invalidate();
  });
  return (
    <group ref={group}>
      {[0, HEIGHT].map((dy) => (
        <lineSegments key={dy} geometry={geometry} position={[0, dy, 0]} frustumCulled={false} raycast={() => null}>
          <lineBasicMaterial color="#b9cad6" transparent opacity={0.38} depthWrite={false} fog={false} />
        </lineSegments>
      ))}
    </group>
  );
}
