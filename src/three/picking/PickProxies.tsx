"use client";

// Invisible pick proxies (3D_PLAN 5.2): one box per floor, one instance per
// room on the sliced floor, one box per selectable asset (and per rooftop unit
// when the roof is sliced). Display meshes never
// raycast, so hovering stays cheap.
import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Matrix4 } from "three";
import { useShallow } from "zustand/react/shallow";
import { CHILLERS, PLANT_PAD_Y, ROOF_EQUIPMENT, ROOF_Y } from "@/data/assets";
import { FLOOR_PROGRAM, FLOORS, isHotelFloor } from "@/data/property";
import { STATUS_LABEL } from "@/data/rooms";
import { useAppStore } from "@/store/useAppStore";
import type { FloorSpec } from "@/types";
import { floorLevel, roomSlots } from "../geometry/schematic";
import { setHover } from "./hover";

/** Pointer travel (px) above which a press is a drag, not a click */
const CLICK_TOLERANCE = 4;

const FLOOR_LABEL: Record<FloorSpec["type"], string> = {
  retail: "Retail podium",
  guest: "Hotel floor",
  guestNarrow: "Hotel floor · narrow",
  skyCourt: "Sky court",
  roof: "Roof terrace",
};

const hidden = <meshBasicMaterial visible={false} />;

function pointer(e: ThreeEvent<PointerEvent>) {
  return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
}
function setCursor(e: ThreeEvent<PointerEvent>, cursor: string) {
  (e.nativeEvent.target as HTMLElement).style.cursor = cursor;
}

function FloorProxies() {
  const s = useAppStore(
    useShallow((st) => ({
      mode: st.mode,
      explode: st.explode,
      rooms: st.rooms,
      selectedFloor: st.selectedFloor,
    })),
  );
  const pickFloor = useAppStore((st) => st.pickFloor);
  const selectFloor = useAppStore((st) => st.selectFloor);

  const occupiedByFloor = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of s.rooms) if (r.status === "occupied") m.set(r.floor, (m.get(r.floor) ?? 0) + 1);
    return m;
  }, [s.rooms]);

  // Slice mode picks rooms instead of floors
  if (s.mode === "slice") return null;

  return FLOORS.map((spec) => {
    const { x, z, w, d } = spec.footprint;
    const y = floorLevel(spec.id, s.explode) + spec.height / 2;
    const detail =
      spec.rooms > 0
        ? `${occupiedByFloor.get(spec.id) ?? 0} / ${spec.rooms} occupied`
        : (FLOOR_PROGRAM[spec.id]?.label ?? FLOOR_LABEL[spec.type]);
    return (
      <mesh
        key={spec.id}
        position={[x, y, z]}
        onPointerMove={(e) => {
          e.stopPropagation();
          setCursor(e, "pointer");
          setHover({ title: `${spec.id} · ${FLOOR_LABEL[spec.type]}`, detail, floor: spec.id, ...pointer(e) });
        }}
        onPointerOut={(e) => {
          setCursor(e, "");
          setHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > CLICK_TOLERANCE) return;
          // Touch has no hover or double-click: tapping the selected floor again slices it
          if (s.selectedFloor === spec.id) selectFloor(spec.id);
          else pickFloor(spec.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          selectFloor(spec.id);
        }}
      >
        <boxGeometry args={[w, spec.height, d]} />
        {hidden}
      </mesh>
    );
  });
}

const matrix = new Matrix4();

function RoomProxies() {
  const floor = useAppStore((st) => (st.mode === "slice" ? st.floor : "all"));
  const rooms = useAppStore((st) => st.rooms);
  const openModal = useAppStore((st) => st.openModal);
  const ref = useRef<InstancedMesh>(null);

  const spec = floor !== "all" && isHotelFloor(floor) ? FLOORS.find((f) => f.id === floor) : undefined;
  const floorRooms = useMemo(() => (spec ? rooms.filter((r) => r.floor === spec.id) : []), [spec, rooms]);
  const slots = useMemo(() => (spec ? roomSlots(spec) : []), [spec]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !spec) return;
    const y = floorLevel(spec.id, false) + 1.4;
    slots.forEach((slot, i) => {
      matrix.makeScale(slot.cell * 0.95, 2.8, slot.depth);
      matrix.setPosition(slot.x, y, slot.z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [spec, slots]);

  if (!spec || !slots.length) return null;
  return (
    <instancedMesh
      // Re-create when the room count changes (28 ↔ 17)
      key={spec.id}
      ref={ref}
      args={[undefined, undefined, slots.length]}
      onPointerMove={(e) => {
        e.stopPropagation();
        const room = e.instanceId !== undefined ? floorRooms[e.instanceId] : undefined;
        if (!room) return;
        setCursor(e, "pointer");
        setHover({ title: `ห้อง ${room.id} · ${room.type}`, detail: STATUS_LABEL[room.status], ...pointer(e) });
      }}
      onPointerOut={(e) => {
        setCursor(e, "");
        setHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > CLICK_TOLERANCE || e.instanceId === undefined) return;
        const room = floorRooms[e.instanceId];
        if (room) openModal({ kind: "room", id: room.id });
      }}
    >
      <boxGeometry />
      {hidden}
    </instancedMesh>
  );
}

/** Rooftop plant units, pickable while the roof (H30) is sliced open */
function RoofEquipmentProxies() {
  const roof = useAppStore((st) => st.mode === "slice" && st.floor === "H30");
  const pickAsset = useAppStore((st) => st.pickAsset);
  const alarms = useAppStore((st) => st.incidents);
  if (!roof) return null;
  return ROOF_EQUIPMENT.map((unit) => {
    const [w, h, d] = unit.size;
    const alarm = alarms.find((x) => x.device === unit.id && x.status < 3);
    return (
      <mesh
        key={unit.id}
        position={[unit.x, ROOF_Y + h / 2, unit.z]}
        onPointerMove={(e) => {
          e.stopPropagation();
          setCursor(e, "pointer");
          setHover({
            title: unit.name,
            detail: alarm ? `Alarm · ${alarm.title.th}` : "ทำงานปกติ · คลิกเพื่อดูข้อมูลอุปกรณ์",
            ...pointer(e),
          });
        }}
        onPointerOut={(e) => {
          setCursor(e, "");
          setHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= CLICK_TOLERANCE) pickAsset(unit.id);
        }}
      >
        {/* A little larger than the unit, so the small pumps and fans are easy to hit */}
        <boxGeometry args={[w + 0.6, h + 0.6, d + 0.6]} />
        {hidden}
      </mesh>
    );
  });
}

function AssetProxies() {
  const pickAsset = useAppStore((st) => st.pickAsset);
  const openChiller = useAppStore((st) => st.openChiller);
  // Central plant (prototype L303): one box per chiller — click for the plant card, double-click to look inside
  return CHILLERS.map((c, i) => (
    <mesh
      key={c.id}
      position={[c.x + 0.6, PLANT_PAD_Y + 1.5, c.z]}
      onPointerMove={(e) => {
        e.stopPropagation();
        setCursor(e, "pointer");
        setHover({ title: `${c.id} · Chiller`, detail: "คลิกดูข้อมูล · ดับเบิลคลิกดูภายในเครื่อง", ...pointer(e) });
      }}
      onPointerOut={(e) => {
        setCursor(e, "");
        setHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta <= CLICK_TOLERANCE) pickAsset("plant");
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setHover(null);
        openChiller(i);
      }}
    >
      <boxGeometry args={[10.6, 3.2, 3.4]} />
      {hidden}
    </mesh>
  ));
}

export function PickProxies() {
  return (
    <>
      <FloorProxies />
      <RoomProxies />
      <AssetProxies />
      <RoofEquipmentProxies />
    </>
  );
}
