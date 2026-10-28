"use client";

// Shown while a chiller is opened up in 3D: which one, that the readings are simulated, and the way out
import { X } from "lucide-react";
import { CHILLERS } from "@/data/assets";
import { useAppStore } from "@/store/useAppStore";

export function ChillerBanner() {
  const index = useAppStore((s) => s.chillerView);
  const close = useAppStore((s) => s.openChiller);
  if (index === null) return null;
  return (
    <div className="absolute top-14 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius-card)] border border-accent/40 bg-bg/85 px-4 py-2 text-[13px] backdrop-blur">
      <span>
        <b className="text-accent">{CHILLERS[index].id}</b> · มุมมองภายในเครื่อง · ค่าจำลอง
      </span>
      <button
        onClick={() => close(null)}
        className="flex items-center gap-1 rounded-[var(--radius-button)] border border-line px-2 py-0.5 hover:border-accent/60"
      >
        <X size={13} /> ออก (Esc)
      </button>
    </div>
  );
}
