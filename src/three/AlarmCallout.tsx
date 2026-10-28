"use client";

// Back of House: the unit of the alarm being worked on turns red (a pulsing red
// copy of its shape over it) and gets a card pinned to it — what was measured,
// the likely cause, the SOP steps for its stage, and a button that asks the AI
// Assistant what to do next. Back of House opens over the central plant, where
// CH-01 (one of the three chillers) turns red with the card beside it; rooftop
// alarms fly to the roof. The card follows plantAlarm(): the focused alarm, else
// the most urgent open one on a rooftop unit or the chiller plant.
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { X } from "lucide-react";
import { type RefObject, useRef, useState } from "react";
import type { Group, MeshBasicMaterial } from "three";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { AssistantIcon } from "@/components/ui/AssistantIcon";
import { AlarmStatusChip, ReadingLine, SeverityChip, SopChecklist } from "@/components/panels/alarm";
import { isRoofEquipment, ROOF_Y, roofEquipment } from "@/data/assets";
import { plantAlarm } from "@/data/events";
import { SOPS } from "@/data/sop";
import { useAppStore } from "@/store/useAppStore";
import type { AssetId, Incident, Vec3 } from "@/types";

/** Tower centre line (x): units east of it get the card on their left */
const TOWER_X = 9;
const RED = "#ff4d5a";

type Shape = { kind: "box" | "cylinder"; centre: Vec3; size: Vec3 };
/**
 * The alarmed unit as red shapes over the real ones, the point the card pins to, whether it is seen through the
 * roof, and `beside`: the card sits level with the unit, off its edge (the close plant view), not above it
 */
type Highlight = { shapes: Shape[]; pin: Vec3; through: boolean; beside?: boolean };

/** Red copy of a unit, or nothing for alarms the roof view can't point at (doors, AHU on H12) */
function highlightFor(device: AssetId | undefined): Highlight | null {
  if (!device) return null;
  if (device === "plant") {
    // CH-01: the southernmost of the three chillers (geometry/site.ts), the right-hand one in the plant view;
    // the card pins to its outer edge and opens into the free space beyond it
    // ChillerPlant paints CH-01 itself, so no red copy here
    return {
      shapes: [],
      pin: [56, 2.6, -27.6],
      through: false,
      beside: true,
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

export function AlarmCallout({ portal }: { portal: RefObject<HTMLElement | null> }) {
  // "INC-003", or "" — a string so the store subscription stays cheap
  // Not over a chiller that is opened up
  const id = useAppStore((s) =>
    s.view === "boh" && s.chillerView === null ? (plantAlarm(s.incidents, s.incidentFocus)?.id ?? "") : "",
  );
  const incident = useAppStore((s) => s.incidents.find((e) => e.id === id));
  // A dismissed card comes back with the next camera move to a shot (Home, opening the scene again)
  const shot = useAppStore((s) => s.camera.n);
  const [dismissed, setDismissed] = useState({ id: "", shot: -1 });
  if (!incident || (dismissed.id === incident.id && dismissed.shot === shot)) return null;
  return <Callout e={incident} portal={portal} onClose={() => setDismissed({ id: incident.id, shot })} />;
}

function Callout({ e, portal, onClose }: { e: Incident; portal: RefObject<HTMLElement | null>; onClose: () => void }) {
  const h = highlightFor(e.device);
  const ask = useAppStore((s) => s.ask);
  const openModal = useAppStore((s) => s.openModal);
  const sop = SOPS[e.sop];
  if (!h) return null;
  const left = !h.beside && h.pin[0] > TOWER_X;
  // Leader line end and the card's edge: up and to the side, or straight out to the side
  const [dx, dy] = h.beside ? [64, 0] : [left ? -56 : 56, -56];

  return (
    <>
      <RedUnit h={h} />
      {/* Stays below the viewport's 2D overlays (z-20 and up), above the hotspot labels */}
      <Html position={h.pin} portal={portal as RefObject<HTMLElement>} zIndexRange={[15, 11]}>
        <div className="relative">
          <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full border-2 border-white bg-red" />
          <svg className="absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden>
            <line x1={0} y1={0} x2={dx} y2={dy} stroke="#ff5c66" strokeWidth={2} />
          </svg>
          <section
            role="region"
            aria-label={`Alarm callout ${e.id}`}
            className={`pointer-events-auto absolute w-[310px] rounded-[var(--radius-card)] border border-red/60 bg-bg/92 p-3 text-[13px] shadow-[0_8px_30px_rgb(0_0_0/0.45)] backdrop-blur short:w-[270px] ${
              h.beside
                ? "top-0 left-[64px] -translate-y-1/2"
                : left
                  ? "right-[56px] bottom-[56px]"
                  : "left-[56px] bottom-[56px]"
            }`}
          >
            <div className="flex items-center gap-2">
              <SeverityChip priority={e.priority} />
              <AlarmStatusChip status={e.status} />
              <span className="ml-auto font-mono text-[11px] text-muted">
                {e.id} · {e.time}
              </span>
              <button onClick={onClose} aria-label="ซ่อนการ์ด Alarm" className="text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>
            <p className="mt-1.5 leading-snug font-semibold">{e.title.th}</p>
            <p className="text-muted">{e.location}</p>
            <ReadingLine e={e} className="mt-1 block" />
            <p className="mt-2 font-semibold text-red">สาเหตุที่เป็นไปได้</p>
            <p className="leading-[1.6]">{sop.cause}</p>
            {/* Short screens leave the steps to the workflow panel below, which follows the same alarm */}
            <div className="mt-2 max-h-[150px] overflow-auto short:hidden">
              <SopChecklist e={e} compact />
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => ask(`${e.id} ${e.title.th} ต้อง Action อะไรต่อ ตาม SOP`)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-button)] bg-accent px-2 py-1.5 font-semibold text-bg"
              >
                <AssistantIcon size={18} /> ถาม AI: ทำอะไรต่อ
              </button>
              <button
                onClick={() => openModal({ kind: "event", id: e.id })}
                className="rounded-[var(--radius-button)] border border-line px-2.5 py-1.5 hover:border-accent/60"
              >
                เปิด Alarm
              </button>
            </div>
          </section>
        </div>
      </Html>
    </>
  );
}
