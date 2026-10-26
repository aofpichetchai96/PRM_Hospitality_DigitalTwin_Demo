// Hotel room detail (prototype roomModal L391) — simulated PMS / GRMS data,
// no guest information.
import { Box, Check, Wrench } from "lucide-react";
import { SourceNotice } from "@/components/ui/Modal";
import { floorSpec } from "@/data/property";
import { STATUS_LABEL } from "@/data/rooms";
import { useAppStore } from "@/store/useAppStore";
import type { RoomStatus } from "@/types";

const STATUS_TONE: Record<RoomStatus, string> = {
  occupied: "border-green/60 text-green",
  ready: "border-blue/60 text-blue",
  cleaning: "border-gold/60 text-gold",
  maintenance: "border-red/60 text-red",
};

export function RoomModal({ id }: { id: string }) {
  const room = useAppStore((s) => s.rooms.find((r) => r.id === id));
  const setRoomStatus = useAppStore((s) => s.setRoomStatus);
  const createWorkOrder = useAppStore((s) => s.createWorkOrder);
  const selectFloor = useAppStore((s) => s.selectFloor);
  const closeModal = useAppStore((s) => s.closeModal);
  const notify = useAppStore((s) => s.notify);
  if (!room) return <p className="text-muted">ไม่พบห้อง {id}</p>;

  const spec = floorSpec(room.floor);
  const temperature = (23.3 + (Number(room.floor.slice(1)) % 6) * 0.2).toFixed(1);
  const rows: [string, string][] = [
    ["ชั้น", `${room.floor} · ${spec.rooms} ห้อง / ชั้น`],
    ["ประเภทห้อง", room.type],
    ["Space ID", `PRM-${room.id}-SPACE`],
    ["PMS status", room.status],
    ["GRMS mode", room.status === "occupied" ? "Comfort / occupied" : "Standby / controlled by room policy"],
    ["อุณหภูมิห้อง", `${temperature}°C · simulated`],
    ["Door / presence", "Mock status only; no identifying information"],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 text-[13px] ${STATUS_TONE[room.status]}`}>
          {STATUS_LABEL[room.status]}
        </span>
        <span className="rounded border border-gold/50 px-2 text-[11px] tracking-wider text-gold">
          NO REAL GUEST DATA
        </span>
      </div>
      <table className="mt-3 w-full text-[13px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-line first:border-0">
              <td className="w-36 py-1.5 text-muted">{k}</td>
              <td className="py-1.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            closeModal();
            selectFloor(room.floor);
          }}
          className="flex items-center gap-2 rounded-[var(--radius-button)] border border-line px-4 py-2"
        >
          <Box size={16} /> ดูชั้นนี้ใน 3D
        </button>
        {room.status === "cleaning" && (
          <button
            onClick={() => {
              setRoomStatus(room.id, "ready");
              notify(`ห้อง ${room.id} ทำความสะอาดเสร็จ · พร้อมขาย`);
            }}
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 py-2 font-semibold text-bg"
          >
            <Check size={16} /> ทำความสะอาดเสร็จ / พร้อมขาย
          </button>
        )}
        {room.status === "maintenance" && (
          <button
            onClick={() => createWorkOrder(`PRM-${room.id}-SPACE`, "Hotel engineering")}
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 py-2 font-semibold text-bg"
          >
            <Wrench size={16} /> สร้างใบงานซ่อม
          </button>
        )}
      </div>
      <SourceNotice>ผังและข้อมูลห้องพักสร้างเพื่อสาธิตจากจำนวน 600 keys ไม่ใช่ผังห้องพักจริงของโครงการ</SourceNotice>
    </>
  );
}
