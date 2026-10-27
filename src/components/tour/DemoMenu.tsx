"use client";

import { ChevronDown, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SHOWCASE_PATHS } from "@/data/showcase";
import { useAppStore } from "@/store/useAppStore";

/** "ชมเดโม" header button: pick the executive or the technical path */
export function DemoMenu() {
  const startShowcase = useAppStore((s) => s.startShowcase);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 font-semibold text-bg hover:brightness-110"
      >
        <Play size={16} fill="currentColor" />
        ชมเดโม
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="เลือกเส้นทางเดโม"
          className="absolute top-11 right-0 z-[60] w-[300px] rounded-[var(--radius-card)] border border-line bg-panel p-1.5 shadow-2xl"
        >
          {SHOWCASE_PATHS.map((p) => (
            <button
              key={p.id}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                startShowcase({ path: p.id });
              }}
              className="flex w-full flex-col rounded-[var(--radius-button)] px-3 py-2 text-left hover:bg-panel-2"
            >
              <span className="text-[14px] font-semibold">{p.title}</span>
              <span className="text-[13px] text-muted">{p.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
