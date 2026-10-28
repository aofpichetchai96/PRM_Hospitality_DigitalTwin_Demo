"use client";

// Guest Room scene: a translucent colour lid over every room of the sliced
// floor at section height, red occupied · yellow reserved · green available,
// so the status reads from the floor-view distance where the bed runner and
// door light are too small. Same colours as the 2D grid (StatusChip).
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, type InstancedMesh, Matrix4 } from "three";
import { FLOORS, isHotelFloor } from "@/data/property";
import { useAppStore } from "@/store/useAppStore";
import type { RoomStatus } from "@/types";
import { floorLevel, roomSlots } from "./geometry/schematic";

const TINT: Record<RoomStatus, Color> = {
  occupied: new Color("#ef8d98"),
  reserved: new Color("#f0cc62"),
  available: new Color("#69d7a8"),
};
/** Just above the 2.9 m section cut, so walls and furniture stay visible under it */
const LID_HEIGHT = 3.0;
const matrix = new Matrix4();

export function RoomTint() {
  const floor = useAppStore((s) => (s.view === "rooms" && s.mode === "slice" ? s.floor : "all"));
  const rooms = useAppStore((s) => s.rooms);
  const ref = useRef<InstancedMesh>(null);

  const spec = floor !== "all" && isHotelFloor(floor) ? FLOORS.find((f) => f.id === floor) : undefined;
  const floorRooms = useMemo(() => (spec ? rooms.filter((r) => r.floor === spec.id) : []), [spec, rooms]);
  const slots = useMemo(() => (spec ? roomSlots(spec) : []), [spec]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !spec) return;
    const y = floorLevel(spec.id, false) + LID_HEIGHT;
    slots.forEach((slot, i) => {
      matrix.makeScale(slot.cell * 0.9, 0.05, slot.depth * 0.92);
      matrix.setPosition(slot.x, y, slot.z);
      mesh.setMatrixAt(i, matrix);
      const room = floorRooms[i];
      if (room) mesh.setColorAt(i, TINT[room.status]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spec, slots, floorRooms]);

  if (!spec || !slots.length) return null;
  return (
    <instancedMesh key={spec.id} ref={ref} args={[undefined, undefined, slots.length]} raycast={() => null}>
      <boxGeometry />
      <meshBasicMaterial transparent opacity={0.42} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}
