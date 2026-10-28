"use client";

// Public Area: people counting at the main entrance and a zone table (people,
// density, AQI) on the right; entrance flow per hour and zone load at the
// bottom. Same zone readings as the 3D labels and heatmap (selectPublic).
import { ArrowDownToLine, ArrowUpFromLine, Users } from "lucide-react";
import { aqiBand } from "@/data/airQuality";
import { DENSITY_LABEL, hourlyEntrance } from "@/data/publicZones";
import { fmt } from "@/lib/format";
import { usePublic } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { EventList, SectionTitle } from "./common";

function Count({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        {icon} {label}
      </p>
      <p className="text-[20px] font-semibold tabular-nums">{fmt(value)}</p>
    </div>
  );
}

export function PublicPanel() {
  const p = usePublic();
  const ask = useAppStore((s) => s.ask);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>People counting · ประตูหลัก</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Count icon={<ArrowDownToLine size={13} className="text-green" />} label="เข้า" value={p.entrance.in} />
          <Count icon={<ArrowUpFromLine size={13} className="text-blue" />} label="ออก" value={p.entrance.out} />
          <Count icon={<Users size={13} className="text-accent" />} label="อยู่ในโถง" value={p.people} />
        </div>
        <p className="text-[13px] text-muted">นับตั้งแต่ 06:00 · ข้อมูลรวม ไม่ระบุตัวตน · SIM</p>
      </section>

      <section className="flex flex-col gap-1.5 border-t border-line pt-3">
        <SectionTitle>Zone · คน · ความหนาแน่น · AQI</SectionTitle>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="py-1 font-normal">Zone</th>
              <th className="py-1 text-right font-normal">People</th>
              <th className="py-1 pl-2 font-normal">Density</th>
              <th className="py-1 text-right font-normal">AQI</th>
            </tr>
          </thead>
          <tbody>
            {p.zones.map((z) => {
              const density = DENSITY_LABEL[z.level];
              const band = aqiBand(z.air.aqi);
              return (
                <tr key={z.zone.id} className="border-t border-line/70">
                  <td className="py-1.5 pr-1 leading-tight">
                    {z.zone.name}
                    <span className="block text-[11px] text-muted">CO₂ {fmt(z.air.co2)} ppm</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{z.people}</td>
                  <td className="py-1.5 pl-2">
                    <span className="flex items-center gap-1.5 text-[12px]" style={{ color: density.color }}>
                      <span className="size-2 rounded-full" style={{ background: density.color }} />
                      {density.label} · {Math.round(z.load * 100)}%
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    <span className="tabular-nums">{z.air.aqi}</span>{" "}
                    <span className="text-[11px]" style={{ color: band.color }}>
                      {band.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-[13px] text-muted">
          หนาแน่นสุด: <b className="text-text">{p.busiest.zone.name}</b> · AQI เฉลี่ยในโถง {p.avgAqi}
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <SectionTitle>เหตุการณ์ค้าง</SectionTitle>
        <EventList limit={3} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-3 text-[13px]">
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-accent">PRIVACY BY DESIGN</p>
        <p>
          นับจำนวนและความหนาแน่นแบบรวม ไม่มี Face recognition · ระบบจริงจะใช้ People counter และ IAQ sensor ราย Zone
        </p>
        <button
          onClick={() => ask("Lobby หนาแน่นไหม คุณภาพอากาศเป็นอย่างไร")}
          className="mt-1.5 text-[12px] text-accent"
        >
          ถาม AI เรื่อง Lobby →
        </button>
      </section>
    </div>
  );
}

/** Bottom panel: entrance in / out per hour today and each zone's load against its capacity */
/** Zone load that raises a crowd alert (crowd scenario: limit ≤ 80 %) */
const ALERT_PCT = 80;

export function PeopleCounting() {
  const p = usePublic();
  const time = useAppStore((s) => s.time);
  const hours = hourlyEntrance(time);
  const max = Math.max(1, ...hours.map((h) => Math.max(h.in, h.out)));

  return (
    <section className="grid h-[164px] shrink-0 grid-cols-[1.1fr_1fr] gap-5 rounded-[var(--radius-card)] border border-line bg-panel px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted">
          MAIN ENTRANCE · IN / OUT PER HOUR
          <span className="flex gap-3 font-normal tracking-normal">
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-sm bg-green" /> In
            </span>
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-sm bg-blue" /> Out
            </span>
          </span>
        </p>
        <div className="flex min-h-0 flex-1 items-end gap-1" aria-label="จำนวนคนเข้าออกรายชั่วโมง">
          {hours.map((h) => (
            <div key={h.hour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
              <div className="flex h-full w-full items-end justify-center gap-px">
                <i className="w-1/2 rounded-t-sm bg-green/80" style={{ height: `${(h.in / max) * 100}%` }} />
                <i className="w-1/2 rounded-t-sm bg-blue/70" style={{ height: `${(h.out / max) * 100}%` }} />
              </div>
              <span className="font-mono text-[9px] text-muted">{String(h.hour).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-between border-l border-line pl-5 leading-[1.6] whitespace-nowrap">
        <p className="flex items-baseline justify-between gap-2 text-[13px] font-semibold">
          ความหนาแน่นราย Zone ตอนนี้
          <span className="flex items-center gap-1.5 text-[13px] font-normal text-muted">
            <i className="h-3 w-0.5 bg-text/70" aria-hidden /> เกณฑ์แจ้งเตือน {ALERT_PCT}%
          </span>
        </p>
        {p.zones.map((z) => {
          const density = DENSITY_LABEL[z.level];
          const pct = Math.round(z.load * 100);
          return (
            <div
              key={z.zone.id}
              className="grid grid-cols-[92px_1fr_76px_104px] items-center gap-2"
              title={`${z.zone.th} · ${z.people} คน จากความจุ ${z.zone.capacity} คน`}
            >
              <span className="truncate text-[13px]">{z.zone.name}</span>
              {/* Bar = people ÷ capacity; the tick marks the alert threshold */}
              <div className="relative h-2.5 rounded-full bg-line/60">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, pct)}%`, background: density.color }}
                />
                <i
                  className="absolute -top-1 h-[18px] w-0.5 bg-text/70"
                  style={{ left: `${ALERT_PCT}%` }}
                  aria-hidden
                />
              </div>
              <span className="text-right text-[13px] tabular-nums">
                {z.people}
                <span className="text-muted">/{z.zone.capacity} คน</span>
              </span>
              <span className="flex items-center justify-end gap-1.5 text-[13px]" style={{ color: density.color }}>
                <i className="size-2 rounded-full" style={{ background: density.color }} aria-hidden />
                {pct}% {density.th}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
