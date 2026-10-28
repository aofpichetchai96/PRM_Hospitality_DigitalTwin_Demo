"use client";

// Back of House: the unit of the alarm being worked on turns red (a pulsing red
// copy of its shape over it; ChillerPlant paints CH-01 itself) and the alarm
// card (components/viewport/AlarmCard, top-left of the viewport) gets a leader
// line to it. Back of House opens over the central plant; rooftop alarms fly to
// the roof. Both follow plantAlarm(): the focused alarm, else the most urgent
// open one on a rooftop unit or the chiller plant.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { type Group, type MeshBasicMaterial, Vector3 } from "three";
import { ALARM_CARD_ID, ALARM_LEADER_DOT_ID, ALARM_LEADER_ID } from "@/components/viewport/AlarmCard";
import { isRoofEquipment, ROOF_Y, roofEquipment } from "@/data/assets";
import { plantAlarm } from "@/data/events";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useAppStore } from "@/store/useAppStore";
import type { AssetId, Vec3 } from "@/types";

const RED = "#ff4d5a";

type Shape = { kind: "box" | "cylinder"; centre: Vec3; size: Vec3 };
/** The alarmed unit as red shapes over the real ones, the point the leader ends at, and whether it shows through the roof */
type Highlight = { shapes: Shape[]; pin: Vec3; through: boolean };

/** Red copy of a unit, or nothing for alarms the roof view can't point at (doors, AHU on H12) */
function highlightFor(device: AssetId | undefined): Highlight | null {
  if (!device) return null;
  if (device === "plant") {
    // CH-01: the southernmost of the three chillers (geometry/site.ts), the right-hand one in the plant view;
    // the card pins to its outer edge and opens into the free space beyond it
    // ChillerPlant paints CH-01 itself, so no red copy here
    return {
      shapes: [],
      pin: [56, 4.5, -26],
      through: false,
    };
  }
  if (!isRoofEquipment(device)) return null;
  const u = roofEquipment(device);
  const [w, h, d] = u.size;
  const y = ROOF_Y;
  const shapes: Shape[] =
    u.kind === "coolingTower"
      ? [
          { kind: "box", centre: [u.x, y + 1.9, u.z], size: [5.2, 3.7, 5.2] },
          { kind: "cylinder", centre: [u.x, y + 4.05, u.z], size: [4, 1, 4] },
        ]
      : u.kind === "tank"
        ? [{ kind: "cylinder", centre: [u.x, y + h / 2 + 0.3, u.z], size: [w + 0.2, h + 0.1, d + 0.2] }]
        : [{ kind: "box", centre: [u.x, y + h / 2, u.z], size: [w * 1.06, h * 1.06, d * 1.06] }];
  return { shapes, pin: [u.x, y + h + 0.4, u.z], through: false };
}

/** Pulsing red shapes over the unit; steady with reduced motion */
function RedUnit({ h }: { h: Highlight }) {
  const group = useRef<Group>(null);
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  useFrame(({ clock, invalidate }) => {
    if (still || !group.current) return;
    const k = 0.62 + 0.28 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 4));
    group.current.traverse((o) => {
      if ("material" in o) (o.material as MeshBasicMaterial).opacity = k;
    });
    invalidate();
  });
  return (
    <group ref={group}>
      {h.shapes.map((sh, i) => (
        <mesh key={i} position={sh.centre} renderOrder={h.through ? 20 : 2} raycast={() => null}>
          {sh.kind === "box" ? (
            <boxGeometry args={sh.size} />
          ) : (
            <cylinderGeometry args={[sh.size[0] / 2, sh.size[0] / 2, sh.size[1], 24]} />
          )}
          <meshBasicMaterial
            color={RED}
            transparent
            opacity={0.8}
            depthTest={!h.through}
            depthWrite={false}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}
    </group>
  );
}

export function AlarmCallout() {
  const id = useAppStore((s) =>
    s.view === "boh" && s.chillerView === null ? (plantAlarm(s.incidents, s.incidentFocus)?.id ?? "") : "",
  );
  const device = useAppStore((s) => s.incidents.find((e) => e.id === id)?.device);
  const h = id ? highlightFor(device) : null;
  if (!h) return null;
  return (
    <>
      <RedUnit h={h} />
      <Leader pin={h.pin} />
    </>
  );
}

const projected = new Vector3();

/**
 * Keeps the leader of the alarm card (components/viewport/AlarmCard) pointing at the unit: projects the pin to the
 * canvas every frame and moves the line's end and dot. Found by id, so the card never re-renders with the camera.
 */
function Leader({ pin }: { pin: Vec3 }) {
  const invalidate = useThree((s) => s.invalidate);
  // A first frame once the card is in the DOM, also when nothing else is animating (reduced motion)
  useEffect(() => {
    const t = window.setTimeout(invalidate, 50);
    return () => window.clearTimeout(t);
  }, [invalidate, pin]);
  useFrame(({ camera, size }) => {
    const line = document.getElementById(ALARM_LEADER_ID) as SVGLineElement | null;
    const dot = document.getElementById(ALARM_LEADER_DOT_ID);
    const card = document.getElementById(ALARM_CARD_ID);
    const svg = line?.ownerSVGElement;
    if (!line || !dot || !card || !svg) return;
    const v = projected.set(...pin).project(camera);
    const visible = v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05;
    const x = ((v.x + 1) / 2) * size.width;
    const y = ((1 - v.y) / 2) * size.height;
    const box = svg.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    // From the card's right edge, level with its title (or its bottom edge if the unit is below it)
    const right = x > c.right - box.left;
    const x1 = right ? c.right - box.left : c.left - box.left + c.width / 2;
    const y1 = right ? c.top - box.top + 46 : c.bottom - box.top;
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x));
    line.setAttribute("y2", String(y));
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
    line.setAttribute("visibility", visible ? "visible" : "hidden");
    dot.setAttribute("visibility", visible ? "visible" : "hidden");
  });
  return null;
}
