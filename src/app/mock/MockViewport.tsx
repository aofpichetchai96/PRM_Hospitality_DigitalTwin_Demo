"use client";

// Phase 2 mock: the real 3D scene with static overlays. Overlay buttons do not
// work yet — wiring happens in Phase 4 / 5.
import {
  Box,
  Camera,
  ChevronDown,
  House,
  Layers,
  Map as MapIcon,
  Maximize,
  Minus,
  Moon,
  Plus,
  RotateCw,
  Sun,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { KpiStrip } from "@/components/layout/KpiStrip";
import { Hotspot } from "@/three/Hotspot";
import type { TimeOfDay } from "@/three/look";

const Viewport = dynamic(() => import("@/three/Viewport"), { ssr: false });

const TOOLS = [House, RotateCw, Layers, Plus, Minus, Maximize, Camera];

function Segmented({ options, active }: { options: ReactNode[]; active: number }) {
  return (
    <div className="flex rounded-[var(--radius-button)] border border-line bg-bg/70 p-0.5 text-[12px] backdrop-blur">
      {options.map((o, i) => (
        <span
          key={i}
          className={`flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 ${i === active ? "bg-panel-2 text-accent" : "text-muted"}`}
        >
          {o}
        </span>
      ))}
    </div>
  );
}

export function MockViewport({ time, showSecurity }: { time: TimeOfDay; showSecurity?: boolean }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
      <Viewport settings={{ time, quality: "high", camera: { preset: "all", n: 0 }, autoRotate: false }}>
        <Hotspot position={[31, 118, 3]} title="HOTEL · 600 KEYS" detail="84% occupied · PMS demo" />
        <Hotspot position={[-31, 19, 26]} title="RETAIL PODIUM" detail="People flow + tenant operations" />
        <Hotspot position={[58, 6, -18]} tone="warning" title="CH-01 · CENTRAL PLANT" detail="Energy + asset health" />
        <Hotspot position={[-12, 78, 3]} tone="warning" title="AHU-H12" detail="Temperature advisory" />
        {showSecurity && (
          <Hotspot position={[38, 10, 24]} tone="alert" title="SECURITY EVENT" detail="L2 service access · Demo" />
        )}
      </Viewport>

      {/* Screens under 900px tall: KPI strip floats over the top edge (PLAN 8) */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 tall:hidden">
        <KpiStrip floating />
      </div>

      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 short:top-[96px]">
        <Segmented
          active={0}
          options={[
            <>
              <Box size={14} /> อาคาร 3D
            </>,
            <>
              <MapIcon size={14} /> Floor Plan
            </>,
          ]}
        />
      </div>

      <div className="absolute top-3 right-3 z-20 flex gap-2 short:top-[96px]">
        <Segmented active={0} options={["Exterior", "X-ray", "Slice", "Explode"]} />
        <Segmented active={time === "day" ? 0 : 1} options={[<Sun key="d" size={14} />, <Moon key="n" size={14} />]} />
      </div>

      <div className="absolute top-1/2 left-3 z-20 flex -translate-y-1/2 flex-col gap-1.5 short:translate-y-[-30%]">
        {TOOLS.map((Icon, i) => (
          <span
            key={i}
            className="grid size-9 place-items-center rounded-[var(--radius-button)] border border-line bg-bg/70 text-text/90 backdrop-blur"
          >
            <Icon size={16} strokeWidth={1.7} />
          </span>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex items-end gap-3">
        <span className="flex h-9 items-center gap-6 rounded-[var(--radius-button)] border border-line bg-bg/80 px-3 text-[13px] backdrop-blur">
          ทุกชั้น · มุมมองภายนอก <ChevronDown size={14} />
        </span>
        <span className="hidden rounded-[var(--radius-button)] bg-bg/60 px-2 py-1 text-[11px] text-text/80 backdrop-blur wide:inline">
          ลากเพื่อหมุน · เลื่อนเพื่อซูม · คลิกอาคารเพื่อเลือกชั้น
        </span>
      </div>

      <div className="absolute right-3 bottom-3 z-20 flex items-end gap-2">
        <figure className="overflow-hidden rounded-[var(--radius-button)] border border-line bg-bg/80 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static reference thumbnail */}
          <img src="/images/reference.webp" alt="ภาพอ้างอิงอาคาร" className="h-[84px] w-[56px] object-cover" />
          <figcaption className="py-0.5 text-[9px] tracking-wider text-muted">REFERENCE</figcaption>
        </figure>
      </div>
    </div>
  );
}
