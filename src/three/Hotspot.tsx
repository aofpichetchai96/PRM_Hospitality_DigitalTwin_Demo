"use client";

import { Html } from "@react-three/drei";

export type HotspotTone = "info" | "warning" | "alert";

const PIN: Record<HotspotTone, string> = {
  info: "bg-accent shadow-[0_0_0_4px_rgb(108_228_223/0.25)]",
  warning: "bg-gold shadow-[0_0_0_4px_rgb(223_189_126/0.25)]",
  alert: "bg-red shadow-[0_0_0_4px_rgb(255_124_129/0.3)]",
};

/** Pin + label anchored to a world position (prototype updateHotspots, L321) */
export function Hotspot({
  position,
  title,
  detail,
  tone = "info",
}: {
  position: [number, number, number];
  title: string;
  detail: string;
  tone?: HotspotTone;
}) {
  return (
    // Stay below the viewport's 2D overlays (z-20 and up)
    <Html position={position} zIndexRange={[10, 0]} style={{ transform: "translate(-6px, -50%)" }}>
      <button className="flex items-center gap-2 text-left whitespace-nowrap">
        <span className={`size-3 shrink-0 rounded-full border-2 border-white/90 ${PIN[tone]}`} />
        <span className="rounded-[var(--radius-button)] border border-line bg-bg/85 px-2.5 py-1.5 leading-tight backdrop-blur">
          <strong className="block text-[11px] font-semibold tracking-wide">{title}</strong>
          <small className="text-[11px] text-muted">{detail}</small>
        </span>
      </button>
    </Html>
  );
}
