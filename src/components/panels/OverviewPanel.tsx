"use client";

import { BedDouble, Store } from "lucide-react";
import type { ReactNode } from "react";
import { FOOTFALL_BY_ZONE } from "@/data/energy";
import { fmt } from "@/lib/format";
import { useOpenIncidents, useRoomCounts } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { EventList, SectionTitle } from "./common";

function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-semibold tabular-nums" style={{ color: tone }}>
        {value} {unit && <span className="text-[11px] font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

function BusinessCard({
  icon,
  title,
  tag,
  children,
}: {
  icon: ReactNode;
  title: string;
  tag: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3">
      <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
        {icon} {title}
        <span className="ml-auto font-mono text-[10px] font-normal text-muted">{tag}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

/** Overview: both businesses, top-3 priority events, intelligence brief (PLAN 5) */
export function OverviewPanel() {
  const c = useRoomCounts();
  const footfall = useAppStore((s) => s.footfall);
  const open = useOpenIncidents();
  const setView = useAppStore((s) => s.setView);
  const ask = useAppStore((s) => s.ask);
  const mallIncidents = open.filter((e) => e.floor && /^(G|L\d)$/.test(e.floor)).length;
  const [topZone] = FOOTFALL_BY_ZONE;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>สรุปธุรกิจ · สองธุรกิจในอาคารเดียว</SectionTitle>
        <BusinessCard icon={<BedDouble size={15} className="text-green" />} title="Hotel" tag="600 KEYS">
          <Stat label="Occupancy" value={fmt(c.occupied / 6)} unit="%" tone="var(--green)" />
          <Stat label="ห้องพร้อมขาย" value={fmt(c.ready)} unit="ห้อง" />
          <Stat label="ทำความสะอาด" value={fmt(c.cleaning)} unit="ห้อง" tone="var(--gold)" />
        </BusinessCard>
        <BusinessCard icon={<Store size={15} className="text-blue" />} title="Retail podium" tag="MALL">
          <Stat label="Footfall" value={fmt(footfall)} tone="var(--blue)" />
          <Stat label="โซนหนาแน่น" value={topZone[0].split(" ")[1]} unit={topZone[0].split(" ")[0]} />
          <Stat
            label="เหตุการณ์"
            value={String(mallIncidents)}
            unit="ค้าง"
            tone={mallIncidents ? "var(--red)" : undefined}
          />
        </BusinessCard>
      </section>

      <section className="flex flex-col gap-1">
        <SectionTitle action="ดูทั้งหมด" onAction={() => setView("ioc")}>
          Priority events
        </SectionTitle>
        <EventList limit={3} />
      </section>

      <section className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-3 text-[13px]">
        <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-accent">
          INTELLIGENCE BRIEF
        </p>
        <p>
          {open.length} เหตุการณ์ต้องติดตาม · {c.cleaning} ห้องกำลังทำความสะอาด · ทดลองลดภาระ Cooling ได้ใน Energy Lab
        </p>
        <button onClick={() => ask("สรุปสถานการณ์อาคารวันนี้")} className="mt-1.5 text-[12px] text-accent">
          ถามผู้ช่วยต่อ →
        </button>
      </section>
    </div>
  );
}
