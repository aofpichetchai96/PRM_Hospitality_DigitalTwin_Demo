// Room detail (prototype roomModal L391): status, stay (guests, check-in / out),
// live room load with its 12 h trend, and the GRMS state of HVAC and lights.
// Simulated PMS / GRMS data — no guest information.
import { Box, LogIn, LogOut } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { SourceNotice } from "@/components/ui/Modal";
import { STATUS_META, StatusIcon } from "@/components/ui/StatusChip";
import { floorSpec } from "@/data/property";
import { roomControl, roomStay, roomTrend, stayDayLabel } from "@/data/rooms";
import { fmt, timeStr } from "@/lib/format";
import { useRoomPowers } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
      <p className="text-[13px] text-muted">{label}</p>
      <div className="text-[15px] font-semibold tabular-nums">{children}</div>
    </div>
  );
}

export function RoomModal({ id }: { id: string }) {
  const room = useAppStore((s) => s.rooms.find((r) => r.id === id));
  const time = useAppStore((s) => s.time);
  const setpoint = useAppStore((s) => s.setpoint);
  const powers = useRoomPowers();
  const setRoomStatus = useAppStore((s) => s.setRoomStatus);
  const selectFloor = useAppStore((s) => s.selectFloor);
  const closeModal = useAppStore((s) => s.closeModal);
  const notify = useAppStore((s) => s.notify);
  if (!room) return <p className="text-muted">ไม่พบห้อง {id}</p>;

  const spec = floorSpec(room.floor);
  const meta = STATUS_META[room.status];
  const stay = roomStay(room);
  const kw = powers.get(room.id) ?? 0;
  const trend = roomTrend(room, time, kw);
  const control = roomControl(room, time, setpoint);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded border px-2 text-[13px]"
          style={{ color: meta.color, borderColor: meta.color }}
        >
          <StatusIcon status={room.status} size={13} /> {meta.label} · {meta.th}
        </span>
        <span className="text-[13px] text-muted">
          {room.floor} · {room.type} · {spec.rooms} ห้อง / ชั้น
        </span>
        <span className="ml-auto rounded border border-gold/50 px-2 text-[11px] tracking-wider text-gold">
          NO REAL GUEST DATA
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Field label="จำนวนผู้เข้าพัก">
          {stay ? (
            <>
              {stay.guests}{" "}
              <span className="text-[13px] font-normal text-muted">คน{stay.expected ? " (จอง)" : ""}</span>
            </>
          ) : (
            "—"
          )}
        </Field>
        <Field label={stay?.expected ? "Check-in (คาดว่ามาถึง)" : "Check-in"}>
          {stay ? stayDayLabel(stay.checkIn) : "—"}
        </Field>
        <Field label="Check-out">{stay ? stayDayLabel(stay.checkOut) : "—"}</Field>
      </div>

      <div className="mt-2 grid grid-cols-[1.3fr_1fr] gap-2">
        <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
          <p className="flex items-baseline justify-between text-[13px] text-muted">
            ใช้ไฟฟ้าในห้อง · Real-time (จำลอง)
            <span className="font-mono text-[11px]">12 h → {timeStr(time)}</span>
          </p>
          <p className="flex items-end justify-between gap-3">
            <span className="text-[24px] leading-tight font-semibold tabular-nums">
              {fmt(kw, 2)} <span className="text-[13px] font-normal text-muted">kW</span>
            </span>
            <Sparkline values={trend} color={meta.color} className="h-8 w-[140px]" />
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2 text-[13px]">
          <p className="flex justify-between gap-2">
            <span className="text-muted">HVAC</span> <span className="text-right">{control.hvac}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-muted">ไฟส่องสว่าง</span> <span>{control.lights}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-muted">Presence</span>
            <span>{room.status === "occupied" ? (control.present ? "มีคนในห้อง" : "ไม่มีคนในห้อง") : "ว่าง"}</span>
          </p>
        </div>
      </div>

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
        {room.status === "reserved" && (
          <button
            onClick={() => {
              setRoomStatus(room.id, "occupied");
              notify(`ห้อง ${room.id} Check-in แล้ว (จำลอง)`);
            }}
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 py-2 font-semibold text-bg"
          >
            <LogIn size={16} /> Check-in
          </button>
        )}
        {room.status === "occupied" && (
          <button
            onClick={() => {
              setRoomStatus(room.id, "available");
              notify(`ห้อง ${room.id} Check-out แล้ว · ว่างพร้อมขาย (จำลอง)`);
            }}
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 py-2 font-semibold text-bg"
          >
            <LogOut size={16} /> Check-out
          </button>
        )}
      </div>
      <SourceNotice>
        ข้อมูลห้อง แขก และพลังงานเป็นข้อมูลจำลองจาก PMS / GRMS mock state ผลรวมไฟฟ้าของทุกห้องเท่ากับภาระ Hotel
        ในแบบจำลองพลังงาน ระบบจริงจะอ่านจาก PMS และมิเตอร์ / GRMS รายห้อง
      </SourceNotice>
    </>
  );
}
