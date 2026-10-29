"use client";

// ICT scene: the racks of the server room (static room in geometry/
// serverRoom.ts). Each rack is a box whose front is a canvas drawn U by U —
// patch panels, switches with every port lit by status, servers with their
// drive bays and a red light when offline, storage shelves, the rack UPS — so
// zooming to a rack shows what is in it. Clicking a rack flies to its front
// (openRack); the right panel lists the same devices. The room's numbered
// areas are presets in a dropdown over the view (no markers in 3D); a card over
// the hall gives temperature, power and what is online. Same readings as the
// panel and KPIs (serverRoomAt).
import { Edges, Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { CircleAlert, Cpu, Thermometer, Zap } from "lucide-react";
import { type RefObject, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import {
  type Device,
  inletBand,
  isOnline,
  portStatus,
  type PortStatus,
  RACK_SIZE,
  RACK_U,
  type RackFace,
  type RackReading,
  ROOM_AREAS,
} from "@/data/serverRoom";
import { fmt } from "@/lib/format";
import { useServerRoom } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { setHover } from "./picking/hover";

export const RACK_YAW: Record<RackFace, number> = { "+z": 0, "-z": Math.PI, "-x": -Math.PI / 2 };
export const PORT_COLOR: Record<PortStatus, string> = {
  up: "#3ddc84",
  idle: "#3a4250",
  down: "#f2a65a",
  error: "#ff4d5a",
};

/** Canvas px per rack front: 42 U plus top and bottom caps */
const W = 320;
const UNIT = 24;
const PAD = 30;
const HEIGHT = RACK_U * UNIT + PAD * 2;

function drawDevice(x: CanvasRenderingContext2D, d: Device, time: number) {
  const top = PAD + (RACK_U - (d.u + d.height - 1)) * UNIT;
  const h = d.height * UNIT - 2;
  const left = 22;
  const w = W - 44;
  const fill: Record<Device["kind"], string> = {
    patch: "#4a505a",
    core: "#1e2a38",
    switch: "#202832",
    firewall: "#3a1e22",
    server: "#262a30",
    storage: "#22282f",
    ups: "#15171a",
  };
  x.fillStyle = fill[d.kind];
  x.fillRect(left, top, w, h);
  x.strokeStyle = "#0b0d10";
  x.strokeRect(left + 0.5, top + 0.5, w - 1, h - 1);
  x.fillStyle = "#c9d3dc";
  x.font = "bold 9px sans-serif";
  x.textBaseline = "top";
  if (d.ports) {
    // Two rows of 24 ports, lit by status
    const pw = (w - 70) / 24;
    for (let p = 1; p <= d.ports; p++) {
      const col = (p - 1) % 24;
      const row = p > 24 ? 1 : 0;
      x.fillStyle = PORT_COLOR[portStatus(d.id, p, time)];
      x.fillRect(left + 66 + col * pw, top + 3 + row * ((h - 4) / 2), pw - 2, (h - 8) / 2);
    }
    x.fillStyle = "#c9d3dc";
    x.fillText(d.kind === "core" ? "CORE" : "SW", left + 4, top + 4);
    x.fillStyle = "#3ddc84";
    x.fillRect(left + 46, top + 4, 6, 6);
    return;
  }
  if (d.kind === "patch") {
    for (let p = 0; p < 24; p++) {
      x.fillStyle = "#1a1d22";
      x.fillRect(left + 50 + p * 9.5, top + 6, 7, h - 12);
    }
    return;
  }
  if (d.kind === "server" || d.kind === "storage") {
    const bays = d.kind === "storage" ? 12 : 8;
    const bw = (w - 80) / bays;
    for (let b = 0; b < bays; b++) {
      x.fillStyle = "#3a414b";
      x.fillRect(left + 70 + b * bw, top + 4, bw - 3, h - 8);
      x.fillStyle = isOnline(d) ? "#3ddc84" : "#555";
      x.fillRect(left + 70 + b * bw + bw - 8, top + 6, 3, 3);
    }
    x.fillStyle = "#c9d3dc";
    x.fillText(d.kind === "storage" ? "STOR" : "SRV", left + 4, top + 4);
    x.fillStyle = isOnline(d) ? "#3ddc84" : "#ff4d5a";
    x.beginPath();
    x.arc(left + 54, top + h / 2, 4, 0, Math.PI * 2);
    x.fill();
    return;
  }
  // Firewall / UPS: a label and a small display
  x.fillText(d.kind === "firewall" ? "FW" : "UPS", left + 4, top + 4);
  x.fillStyle = d.kind === "ups" ? "#5ab8ff" : "#ff8a6a";
  x.fillRect(left + 60, top + h / 2 - 5, 60, 10);
}

/** The rack front as a texture, redrawn when a port status can change (every quarter hour of the clock) */
function useRackFront(r: RackReading, quarter: number) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = HEIGHT;
    const x = c.getContext("2d");
    if (x) {
      x.fillStyle = "#101216";
      x.fillRect(0, 0, W, HEIGHT);
      // Rails with U marks
      x.fillStyle = "#2b3038";
      x.fillRect(8, PAD, 10, RACK_U * UNIT);
      x.fillRect(W - 18, PAD, 10, RACK_U * UNIT);
      x.fillStyle = "#5c6470";
      for (let u = 0; u < RACK_U; u += 1) x.fillRect(10, PAD + u * UNIT + UNIT / 2, 6, 1);
      for (const d of r.rack.devices) drawDevice(x, d, quarter / 4);
      x.fillStyle = "#e6edf3";
      x.font = "bold 18px sans-serif";
      x.textBaseline = "middle";
      x.fillText(r.rack.id, 22, PAD / 2);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [r.rack, quarter]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * `ghost`: the row across the cold aisle from a rack being looked at stands between it and the camera, so it is
 * drawn as a faint outline only (and can't be clicked) until the view goes back to the room.
 */
function Rack({ r, quarter, selected, ghost }: { r: RackReading; quarter: number; selected: boolean; ghost: boolean }) {
  const front = useRackFront(r, quarter);
  const openRack = useAppStore((s) => s.openRack);
  if (ghost)
    return (
      <group position={[r.rack.x, 0, r.rack.z]}>
        <mesh position={[0, RACK_SIZE[1] / 2, 0]} raycast={() => null}>
          <boxGeometry args={[RACK_SIZE[0] - 0.02, RACK_SIZE[1], RACK_SIZE[2]]} />
          <meshBasicMaterial visible={false} />
          <Edges color="#5c6b78" />
        </mesh>
      </group>
    );
  const [w, h, d] = RACK_SIZE;
  const band = inletBand(r.inlet);
  const led = band === "high" ? "#ff4d5a" : band === "warm" ? "#f2a65a" : "#3ddc84";
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    setHover({
      title: `${r.rack.id} · ${r.rack.role}`,
      detail: `${fmt(r.kw, 1)} kW · inlet ${fmt(r.inlet, 1)} °C · ${r.online}/${r.devices} online · คลิกดูหน้า Rack`,
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    });
  };
  return (
    <group position={[r.rack.x, 0, r.rack.z]} rotation={[0, RACK_YAW[r.rack.face], 0]}>
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onPointerMove={over}
        onPointerOut={() => {
          document.body.style.cursor = "";
          setHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          openRack(r.rack.id);
        }}
      >
        <boxGeometry args={[w - 0.02, h, d]} />
        <meshStandardMaterial color={selected ? "#24323f" : "#16181c"} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Front: the devices, behind a perforated door's frame */}
      <mesh position={[0, h / 2, d / 2 + 0.006]} raycast={() => null}>
        <planeGeometry args={[w - 0.06, h - 0.06]} />
        <meshBasicMaterial map={front} toneMapped={false} />
      </mesh>
      {/* Status strip on top, and the selection frame */}
      <mesh position={[0, h + 0.01, d / 2 - 0.05]} raycast={() => null}>
        <boxGeometry args={[w - 0.1, 0.02, 0.04]} />
        <meshBasicMaterial color={led} toneMapped={false} />
      </mesh>
      {selected && (
        <mesh position={[0, h / 2, 0]} raycast={() => null}>
          <boxGeometry args={[w + 0.04, h + 0.04, d + 0.04]} />
          <meshBasicMaterial visible={false} />
          <Edges color="#6ce4df" lineWidth={2} />
        </mesh>
      )}
    </group>
  );
}

export function ServerRoomScene({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const shown = useAppStore((s) => s.view === "ict");
  if (!shown) return null;
  return <Room portal={portal} />;
}

function Room({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const room = useServerRoom();
  const time = useAppStore((s) => s.time);
  const selected = useAppStore((s) => s.rackFocus);
  const quarter = Math.floor(time * 4);
  const area = useAppStore((s) => s.roomArea);
  // The row across the aisle from a focused rack, or the one in front of a preset area, is drawn as outlines only
  const focusRow = room.racks.find((r) => r.rack.id === selected)?.rack.row;
  const ghostRow = focusRow === "A" ? "B" : focusRow === "B" ? "A" : ROOM_AREAS.find((a) => a.n === area)?.ghost;
  const warm = room.racks.filter((r) => inletBand(r.inlet) !== "ok");

  return (
    <>
      {room.racks.map((r) => (
        <Rack
          key={r.rack.id}
          r={r}
          quarter={quarter}
          selected={selected === r.rack.id}
          ghost={r.rack.row === ghostRow}
        />
      ))}

      {/* Room card over the north wall */}
      <Html position={[0, 3.6, -6]} portal={portal as RefObject<HTMLElement>} zIndexRange={[10, 0]} center>
        <div className="rounded-[var(--radius-card)] border border-accent/40 bg-bg/90 px-3 py-2 whitespace-nowrap backdrop-blur">
          <p className="text-[11px] font-semibold tracking-wider text-accent">SERVER ROOM · MDF-01</p>
          <div className="mt-1 flex gap-4 text-[13px] tabular-nums">
            <span className="flex items-center gap-1.5">
              <Thermometer size={14} className="text-blue" /> {fmt(room.coldAisle, 1)} °C
              <span className="text-[11px] text-muted">· {room.humidity}% RH</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-gold" /> {fmt(room.itKw, 1)} kW
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu size={14} className="text-green" /> {room.online}/{room.devices} online
            </span>
          </div>
        </div>
      </Html>

      {/* Racks running warm */}
      {warm.map((r) => (
        <Html
          key={r.rack.id}
          position={[r.rack.x, RACK_SIZE[1] + 1.1, r.rack.z]}
          portal={portal as RefObject<HTMLElement>}
          zIndexRange={[10, 0]}
          center
        >
          <span className="flex items-center gap-1 rounded-[var(--radius-button)] border border-orange/60 bg-bg/90 px-2 py-0.5 text-[11px] whitespace-nowrap text-orange">
            <CircleAlert size={12} /> {r.rack.id} · inlet {fmt(r.inlet, 1)} °C
          </span>
        </Html>
      ))}
    </>
  );
}
