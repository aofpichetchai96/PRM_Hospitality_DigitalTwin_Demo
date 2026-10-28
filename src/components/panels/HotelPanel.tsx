"use client";

// Guest Room right panel (prototype L367): status counts and guests, the
// selected floor's summary (load and rooms by status) and its room plan.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { RoomCell, STATUS_META, STATUS_ORDER, StatusIcon, StatusLegend } from "@/components/ui/StatusChip";
import { FLOOR_AMENITY, FLOOR_PROGRAM, floorSpec, isHotelFloor } from "@/data/property";
import { fmt } from "@/lib/format";
import { useGuests, useRoomCounts, useRoomPowers } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import type { HotelFloorId } from "@/types";
import { SectionTitle } from "./common";

/** Floor the room plan shows: the sliced or picked hotel floor, else H12 */
export function useHotelFloor(): HotelFloorId {
  return useAppStore((s) => {
    if (s.floor !== "all" && isHotelFloor(s.floor)) return s.floor;
    if (s.selectedFloor && isHotelFloor(s.selectedFloor)) return s.selectedFloor;
    return "H12";
  });
}

export function HotelPanel() {
  const c = useRoomCounts();
  const floor = useHotelFloor();
  const rooms = useAppStore((s) => s.rooms);
  const stepFloor = useAppStore((s) => s.stepFloor);
  const selectFloor = useAppStore((s) => s.selectFloor);
  const openModal = useAppStore((s) => s.openModal);
  const ask = useAppStore((s) => s.ask);
  const spec = floorSpec(floor);
  const floorRooms = useMemo(() => rooms.filter((r) => r.floor === floor), [rooms, floor]);
  const powers = useRoomPowers();
  const guests = useGuests();
  const floorKw = floorRooms.reduce((n, r) => n + (powers.get(r.id) ?? 0), 0);
  const onFloor = (status: string) => floorRooms.filter((r) => r.status === status).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>Guest rooms · 600 keys</SectionTitle>
        <p className="text-[13px] text-muted">
          ผู้เข้าพัก {fmt(guests.inHouse)} คน · รอเข้าพักวันนี้ {guests.arrivals} ห้อง · ไม่ระบุตัวตนแขก
        </p>
        <div className="grid grid-cols-3 gap-2">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
              <p className="text-[20px] font-semibold tabular-nums" style={{ color: STATUS_META[s].color }}>
                {fmt(c[s])}
              </p>
              <p className="flex items-center gap-1.5 text-[13px] leading-tight text-muted">
                <StatusIcon status={s} /> {STATUS_META[s].label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              aria-label="ชั้นล่างลงไป"
              onClick={() => (floor === "H01" ? null : stepFloor(-1))}
              disabled={floor === "H01"}
              className="grid size-7 place-items-center rounded-[var(--radius-button)] border border-line text-muted hover:text-text disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => selectFloor(floor)}
              title="ดูชั้นนี้ใน 3D"
              className="min-w-14 text-center font-mono text-[15px] font-semibold hover:text-accent"
            >
              {floor}
            </button>
            <button
              aria-label="ชั้นถัดขึ้นไป"
              onClick={() => stepFloor(1)}
              disabled={floor === "H30"}
              className="grid size-7 place-items-center rounded-[var(--radius-button)] border border-line text-muted hover:text-text disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={() => openModal({ kind: "allRooms" })} className="text-[12px] text-accent">
            ห้องทั้งหมด 600 →
          </button>
        </div>

        {spec.rooms > 0 ? (
          <>
            {/* Floor summary: the floor's load is the sum of its room cards */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
              <p className="text-[13px] text-muted">ไฟฟ้ารวมของชั้น · Real-time (จำลอง)</p>
              <p className="row-span-2 text-right text-[20px] font-semibold tabular-nums">
                {fmt(floorKw, 1)} <span className="text-[12px] font-normal text-muted">kW</span>
              </p>
              <p className="flex flex-wrap gap-x-3 text-[13px]">
                {STATUS_ORDER.map((st) => (
                  <span key={st} className="flex items-center gap-1">
                    <StatusIcon status={st} /> <b className="font-semibold tabular-nums">{onFloor(st)}</b>
                  </span>
                ))}
                <span className="text-muted">/ {spec.rooms} ห้อง</span>
              </p>
            </div>
            <p className="text-[13px] text-muted">คลิกห้องเพื่อดูผู้เข้าพัก Check-in / out และพลังงาน</p>
            {/* Two rows of the corridor, as laid out in 3D */}
            <div className="grid grid-cols-7 gap-1">
              {floorRooms.map((r) => (
                <RoomCell
                  key={r.id}
                  id={r.id}
                  status={r.status}
                  onClick={() => openModal({ kind: "room", id: r.id })}
                />
              ))}
            </div>
            <StatusLegend className="mt-1" />
          </>
        ) : (
          <p className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-3 text-[13px] text-muted">
            {FLOOR_PROGRAM[spec.id]?.detail ?? FLOOR_AMENITY[spec.type]} · ไม่มีห้องพักในชั้นนี้
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-3 text-[13px]">
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-accent">SERVICE-TO-ENERGY LINK</p>
        <p>
          สถานะ PMS สั่ง GRMS: ห้องจอง Pre-cool ก่อนแขกมาถึง ห้องว่างอยู่โหมด Eco แขกออกจากห้องแล้ว Setback อัตโนมัติ ·
          ระบบจริงจะเชื่อม PMS และ GRMS ภายใต้สิทธิ์ของทีมโรงแรม
        </p>
        <button onClick={() => ask("ห้องพักพร้อมขายกี่ห้อง")} className="mt-1.5 text-[12px] text-accent">
          ถามสถานะห้องพัก →
        </button>
      </section>
      <p className="text-[12px] text-muted">
        ผังห้องจัดตามรูปอาคารอ้างอิง (19 ชั้น × 28 ห้อง + 4 ชั้น × 17 ห้อง = 600 keys) ใช้อธิบายการทำงานเท่านั้น
        ต้องแทนที่ด้วย BIM / แบบโครงการก่อนใช้งานจริง
      </p>
    </div>
  );
}

/** Bottom panel: inventory of all 600 rooms as one stacked bar (prototype L375) */
export function HotelInventory() {
  const c = useRoomCounts();
  const openModal = useAppStore((s) => s.openModal);
  return (
    <section className="flex h-[92px] shrink-0 flex-col justify-center gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-muted">HOTEL INVENTORY · ALL 600 ROOMS</p>
        <button onClick={() => openModal({ kind: "allRooms" })} className="text-[12px] text-accent">
          สำรวจ 600 ห้อง →
        </button>
      </div>
      <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full" aria-hidden>
        {STATUS_ORDER.map((s) => (
          <i key={s} style={{ width: `${c[s] / 6}%`, background: STATUS_META[s].color }} />
        ))}
      </div>
      <div className="flex justify-between text-[12px] text-muted">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <StatusIcon status={s} /> {STATUS_META[s].label}
            <b className="font-semibold text-text tabular-nums">{fmt(c[s])}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
