"use client";

import { useHover } from "@/three/picking/hover";

/** One DOM tooltip that follows the pointer over pickable 3D objects */
export function SceneTooltip() {
  const hover = useHover((s) => s.hover);
  if (!hover) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-[var(--radius-button)] border border-line bg-bg/90 px-2.5 py-1.5 leading-tight shadow-lg backdrop-blur"
      style={{ left: hover.x + 14, top: hover.y + 14 }}
    >
      <p className="text-[12px] font-semibold">{hover.title}</p>
      <p className="text-[12px] text-muted">{hover.detail}</p>
    </div>
  );
}
