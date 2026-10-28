"use client";

import { Html } from "@react-three/drei";
import type { RefObject } from "react";

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
  onClick,
  portal,
}: {
  position: [number, number, number];
  title: string;
  /** Second line; zone labels leave it out to stay compact */
  detail?: string;
  tone?: HotspotTone;
  onClick?: () => void;
  /** Fixed DOM container. Without it drei picks one that changes right after the
   *  Canvas connects, and the first label ends up mounted but empty */
  portal?: RefObject<HTMLElement | null>;
}) {
  return (
    // Stay below the viewport's 2D overlays (z-20 and up)
    <Html
      position={position}
      portal={portal as RefObject<HTMLElement>}
      zIndexRange={[10, 0]}
      style={{ transform: "translate(-6px, -50%)" }}
    >
      <button onClick={onClick} className="group flex items-center gap-2 text-left whitespace-nowrap">
        <span className={`size-3 shrink-0 rounded-full border-2 border-white/90 ${PIN[tone]}`} />
        <span className="rounded-[var(--radius-button)] border border-line bg-bg/85 px-2.5 transition-colors group-hover:border-accent/70 py-1.5 leading-tight backdrop-blur">
          <strong className="block text-[11px] font-semibold tracking-wide">{title}</strong>
          {detail && <small className="text-[11px] text-muted">{detail}</small>}
        </span>
      </button>
    </Html>
  );
}
