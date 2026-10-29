"use client";

// ICT presets over the 3D view: a button with the area the camera shows,
// opening a card of the server room's numbered areas (ROOM_AREAS) plus the
// whole room; a choice flies there (openArea). A rack picked in 3D or in the
// panel shows here as "Rack A03". Closes on a choice, a click outside or Esc
// (only the menu, not the rack or area view behind it).
import { Check, ChevronDown, Server } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROOM_AREAS } from "@/data/serverRoom";
import { useAppStore } from "@/store/useAppStore";

const WHOLE_ROOM = "ทั้งห้อง Server · MDF-01";

function Badge({ n, active }: { n: number | null; active: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
        active ? "border-accent bg-accent/15 text-accent" : "border-text/50 text-text"
      }`}
    >
      {n ?? <Server size={12} />}
    </span>
  );
}

export function AreaPicker() {
  const area = useAppStore((s) => s.roomArea);
  const rackId = useAppStore((s) => s.rackFocus);
  const openArea = useAppStore((s) => s.openArea);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const current = ROOM_AREAS.find((a) => a.n === area);
  const pick = (n: number | null) => {
    openArea(n);
    setOpen(false);
  };
  const items: { n: number | null; name: string }[] = [{ n: null, name: WHOLE_ROOM }, ...ROOM_AREAS];

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          setOpen(false);
        }
      }}
    >
      <button
        aria-label="จุดในห้อง Server"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 min-w-[260px] items-center gap-2 rounded-[var(--radius-button)] border bg-bg/85 pr-2.5 pl-1.5 text-[13px] backdrop-blur transition-colors ${
          open ? "border-accent/60" : "border-line hover:border-accent/60"
        }`}
      >
        <Badge n={current?.n ?? null} active />
        <span className="flex-1 truncate text-left">
          {rackId ? `Rack ${rackId}` : current ? current.name : WHOLE_ROOM}
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="จุดในห้อง Server"
          className="absolute top-full right-0 z-30 mt-1.5 w-[300px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel/95 p-1 shadow-[0_12px_32px_rgb(0_0_0/0.45)] backdrop-blur"
        >
          {items.map((a) => {
            const selected = !rackId && a.n === (current?.n ?? null);
            return (
              <li
                key={a.n ?? "room"}
                role="option"
                aria-selected={selected}
                className={a.n === null ? "mb-1 border-b border-line/70 pb-1" : undefined}
              >
                <button
                  onClick={() => pick(a.n)}
                  className={`flex w-full items-center gap-2.5 rounded-[var(--radius-button)] px-2 py-1.5 text-left text-[13px] transition-colors ${
                    selected ? "bg-accent/10 text-accent" : "hover:bg-panel-2"
                  }`}
                >
                  <Badge n={a.n} active={selected} />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  {selected && <Check size={15} className="shrink-0 text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
