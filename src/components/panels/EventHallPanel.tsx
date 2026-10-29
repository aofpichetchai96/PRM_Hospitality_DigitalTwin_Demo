"use client";

// Event Hall (L3): who is in the ballroom and the meeting rooms now, the floor's
// power and air, today's bookings with their status.
// Same readings as the 3D labels (eventHallAt).
import { CalendarCheck, CircleCheck, CircleDot, Clock3, type LucideIcon, Users, Wind, Zap } from "lucide-react";
import { co2Band } from "@/data/airQuality";
import { BOOKINGS, type BookingStatus, bookingStatus, venue } from "@/data/eventHall";
import { fmt, timeStr } from "@/lib/format";
import { useEventHall } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "./common";

const STATUS: Record<BookingStatus, { label: string; icon: LucideIcon; color: string }> = {
  live: { label: "Live", icon: CircleDot, color: "var(--green)" },
  next: { label: "Upcoming", icon: Clock3, color: "var(--gold)" },
  done: { label: "Done", icon: CircleCheck, color: "var(--muted)" },
};

function Stat({ icon: Icon, label, value, unit }: { icon: LucideIcon; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <Icon size={13} /> {label}
      </p>
      <p className="text-[18px] font-semibold tabular-nums">
        {value} <span className="text-[11px] font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}

export function EventHallPanel() {
  const hall = useEventHall();
  const time = useAppStore((s) => s.time);
  const ask = useAppStore((s) => s.ask);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>Event Hall · L3 ตอนนี้</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Users} label="คน" value={fmt(hall.people)} unit={`/ ${hall.capacity}`} />
          <Stat icon={Zap} label="ไฟฟ้า" value={fmt(hall.kw)} unit="kW" />
          <Stat icon={CalendarCheck} label="งาน" value={String(hall.bookings)} unit="วันนี้" />
        </div>
      </section>

      <section className="flex flex-col gap-1.5 border-t border-line pt-3">
        <SectionTitle>ห้อง · คน · CO₂</SectionTitle>
        {hall.venues.map((v) => {
          const band = co2Band(v.co2);
          return (
            <div
              key={v.venue.id}
              className="grid grid-cols-[1fr_auto] gap-x-2 border-b border-line/70 py-1.5 text-[13px]"
            >
              <span className="font-semibold">{v.venue.name}</span>
              <span className="text-right tabular-nums">
                {v.people}
                <span className="text-muted">/{v.venue.capacity}</span>
              </span>
              <span className="truncate text-muted">{v.booking ? v.booking.title : "ว่าง"}</span>
              <span
                className="flex items-center justify-end gap-1 text-right text-[12px]"
                style={{ color: band.color }}
              >
                <Wind size={12} /> {fmt(v.co2)} ppm
              </span>
              <div className="col-span-2 mt-1 h-1.5 rounded-full bg-line/60">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, v.load * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-1.5 border-t border-line pt-3">
        <SectionTitle>งานวันนี้</SectionTitle>
        <ul className="flex flex-col">
          {BOOKINGS.map((b) => {
            const st = STATUS[bookingStatus(b, time)];
            return (
              <li key={b.id} className="flex gap-2 border-b border-line/70 py-1.5 text-[13px] last:border-0">
                <st.icon size={14} className="mt-1 shrink-0" style={{ color: st.color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.title}</span>
                  <span className="block text-muted">
                    {venue(b.venue).name} · {b.pax} คน · {b.setup}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[11px] text-muted">
                    {timeStr(b.start)}–{timeStr(b.end)}
                  </span>
                  <span className="text-[12px]" style={{ color: st.color }}>
                    {st.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <button onClick={() => ask("วันนี้มีงานอะไรใน Event Hall บ้าง")} className="self-start text-[13px] text-accent">
          ถาม AI เรื่องงานวันนี้ →
        </button>
      </section>

      <p className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-3 text-[13px]">
        ตารางงานจำลอง · ระบบจริงจะดึงจากระบบจองห้องจัดเลี้ยง และนับคนจากกล้องแบบไม่ระบุตัวตน
      </p>
    </div>
  );
}
