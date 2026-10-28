"use client";

// Guest Room scene: each room's live load in kW, written on the window side of
// the room just above the colour lid (RoomTint), so the plan view reads status
// and power together. One canvas texture for the whole floor, redrawn only when
// a value changes at 0.01 kW; the numbers are the room cards' (roomPowers).
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { FLOORS, isHotelFloor } from "@/data/property";
import { useRoomPowers } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import type { FloorSpec, RoomStatus } from "@/types";
import { floorLevel, roomSlots } from "./geometry/schematic";

/** Just above the lid at 3.0 m */
const LABEL_HEIGHT = 3.08;
const PX_PER_M = 40;
/** Depth of the label band along the facade (m) */
const BAND = 2.2;

const INK: Record<RoomStatus, string> = {
  occupied: "#ffd6db",
  reserved: "#fff0bf",
  available: "#c9f5e1",
};

export function RoomPower() {
  const floor = useAppStore((s) => (s.view === "rooms" && s.mode === "slice" ? s.floor : "all"));
  const spec = floor !== "all" && isHotelFloor(floor) ? FLOORS.find((f) => f.id === floor) : undefined;
  if (!spec) return null;
  return <RoomPowerLabels spec={spec} />;
}

function RoomPowerLabels({ spec }: { spec: FloorSpec }) {
  const rooms = useAppStore((s) => s.rooms);
  const powers = useRoomPowers();
  const slots = useMemo(() => roomSlots(spec), [spec]);
  const { x, z, w, d } = spec.footprint;

  // "1.42:occupied,0.60:reserved,…" in slot order, so the texture only redraws on a visible change
  const key = rooms
    .filter((r) => r.floor === spec.id)
    .map((r) => `${(powers.get(r.id) ?? 0).toFixed(2)}:${r.status}`)
    .join(",");

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w * PX_PER_M;
    canvas.height = d * PX_PER_M;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const px = (v: number) => (v - (x - w / 2)) * PX_PER_M;
      const pz = (v: number) => (v - (z - d / 2)) * PX_PER_M;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      key.split(",").forEach((entry, i) => {
        const slot = slots[i];
        if (!slot) return;
        const [kw, status] = entry.split(":") as [string, RoomStatus];
        // Window side: the outer end of the room
        const cz = slot.z + (slot.front ? 1 : -1) * (slot.depth / 2 - BAND / 2 - 0.15);
        const cx = px(slot.x);
        const cy = pz(cz);
        const bw = slot.cell * 0.86 * PX_PER_M;
        const bh = BAND * PX_PER_M;
        ctx.fillStyle = "rgba(8, 17, 28, 0.78)";
        ctx.beginPath();
        ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
        ctx.fill();
        ctx.fillStyle = INK[status];
        ctx.font = `600 ${Math.round(0.62 * PX_PER_M)}px Inter, system-ui, sans-serif`;
        ctx.fillText(kw, cx, cy - 0.22 * PX_PER_M);
        ctx.fillStyle = "#9fb3c8";
        ctx.font = `500 ${Math.round(0.42 * PX_PER_M)}px Inter, system-ui, sans-serif`;
        ctx.fillText("kW", cx, cy + 0.42 * PX_PER_M);
      });
    }
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [key, slots, x, z, w, d]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh
      position={[x, floorLevel(spec.id, false) + LABEL_HEIGHT, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
      renderOrder={7}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
