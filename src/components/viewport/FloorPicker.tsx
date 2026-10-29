"use client";

// Floor picker under the 3D view: a button with the current floor, opening a
// card laid out like the building — the hotel tower as a grid of floors from
// H30 at the top down to H01 (coloured by use: guest rooms, sky courts, roof),
// then the retail podium L4 … G with their programme, then "all floors".
// Hovering a floor names it at the top of the card. Closes on a choice, a
// click outside or Esc (only the menu, not the slice behind it).
import { Building2, Check, ChevronDown, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FLOOR_PROGRAM, FLOORS } from "@/data/property";
import type { FloorSelection, FloorSpec, FloorType } from "@/types";

const TYPE: Record<FloorType, { label: string; chip: string; dot: string }> = {
  guest: { label: "Hotel · 28 keys", chip: "border-line bg-panel-2", dot: "bg-blue" },
  guestNarrow: { label: "Hotel · 17 keys", chip: "border-line bg-panel-2", dot: "bg-blue" },
  skyCourt: { label: "Sky court", chip: "border-accent/40 bg-accent/10", dot: "bg-accent" },
  roof: { label: "Roof · plant", chip: "border-gold/40 bg-gold/10", dot: "bg-gold" },
  retail: { label: "Retail", chip: "border-line bg-panel-2", dot: "bg-green" },
};

const floorName = (f: FloorSpec) => FLOOR_PROGRAM[f.id]?.label ?? TYPE[f.type].label;
const describe = (floor: FloorSelection) => {
  if (floor === "all") return "ทุกชั้น · มุมมองภายนอก";
  const f = FLOORS.find((x) => x.id === floor);
  return f ? `${f.id} · ${floorName(f)}` : floor;
};

/** Hotel floors top-down, so the grid reads like the tower */
const TOWER = FLOORS.filter((f) => f.type !== "retail").reverse();
const PODIUM = FLOORS.filter((f) => f.type === "retail").reverse();

export function FloorPicker({ value, onChange }: { value: FloorSelection; onChange: (f: FloorSelection) => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<FloorSelection | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const pick = (f: FloorSelection) => {
    onChange(f);
    setOpen(false);
  };
  const shown = hover ?? value;

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
        aria-label="เลือกชั้น"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 min-w-[220px] items-center gap-2 rounded-[var(--radius-button)] border bg-bg/85 pr-2.5 pl-2 text-[13px] backdrop-blur transition-colors ${
          open ? "border-accent/60" : "border-line hover:border-accent/60"
        }`}
      >
        <span className="grid h-6 min-w-9 place-items-center rounded bg-accent/15 px-1 font-mono text-[11px] font-semibold text-accent">
          {value === "all" ? <Building2 size={14} /> : value}
        </span>
        <span className="flex-1 truncate text-left">
          {value === "all" ? "ทุกชั้น · มุมมองภายนอก" : floorName(FLOORS.find((f) => f.id === value)!)}
        </span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกชั้น"
          className="absolute bottom-full left-0 z-30 mb-2 w-[340px] rounded-[var(--radius-card)] border border-line bg-panel/95 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.5)] backdrop-blur"
          onPointerLeave={() => setHover(null)}
        >
          <p className="mb-2 flex items-center gap-2 border-b border-line pb-2 text-[13px]">
            <Layers size={14} className="text-accent" />
            <span className="truncate font-semibold">{describe(shown)}</span>
          </p>

          <p className="mb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted">
            HOTEL TOWER
            <span className="flex gap-2.5 font-normal tracking-normal">
              {(["guest", "skyCourt", "roof"] as const).map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <i className={`size-1.5 rounded-full ${TYPE[t].dot}`} /> {TYPE[t].label.split(" · ")[0]}
                </span>
              ))}
            </span>
          </p>
          <div className="grid grid-cols-6 gap-1">
            {TOWER.map((f) => {
              const selected = f.id === value;
              return (
                <button
                  key={f.id}
                  aria-label={`${f.id} · ${floorName(f)}`}
                  aria-pressed={selected}
                  onClick={() => pick(f.id)}
                  onPointerEnter={() => setHover(f.id)}
                  onFocus={() => setHover(f.id)}
                  className={`relative h-7 rounded border font-mono text-[11px] transition-colors hover:border-accent/70 hover:text-text ${
                    selected ? "border-accent bg-accent text-bg" : `${TYPE[f.type].chip} text-text/85`
                  }`}
                >
                  {f.id}
                  {!selected && f.type !== "guest" && (
                    <i className={`absolute top-1 right-1 size-1 rounded-full ${TYPE[f.type].dot}`} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-3 mb-1.5 text-[11px] font-semibold tracking-wider text-muted">RETAIL PODIUM</p>
          <div className="flex flex-col gap-0.5">
            {PODIUM.map((f) => {
              const selected = f.id === value;
              return (
                <button
                  key={f.id}
                  aria-label={`${f.id} · ${floorName(f)}`}
                  aria-pressed={selected}
                  onClick={() => pick(f.id)}
                  onPointerEnter={() => setHover(f.id)}
                  onFocus={() => setHover(f.id)}
                  className={`flex items-center gap-2 rounded-[var(--radius-button)] px-1.5 py-1 text-left text-[13px] transition-colors ${
                    selected ? "bg-accent/12 text-accent" : "hover:bg-panel-2"
                  }`}
                >
                  <span
                    className={`grid h-6 w-9 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold ${
                      selected ? "bg-accent text-bg" : "bg-green/15 text-green"
                    }`}
                  >
                    {f.id}
                  </span>
                  <span className="flex-1 truncate">{floorName(f)}</span>
                  {selected && <Check size={14} />}
                </button>
              );
            })}
          </div>

          <button
            aria-label="ทุกชั้น · มุมมองภายนอก"
            aria-pressed={value === "all"}
            onClick={() => pick("all")}
            onPointerEnter={() => setHover("all")}
            className={`mt-2 flex w-full items-center gap-2 rounded-[var(--radius-button)] border px-2 py-1.5 text-[13px] transition-colors ${
              value === "all" ? "border-accent/60 bg-accent/10 text-accent" : "border-line hover:border-accent/60"
            }`}
          >
            <Building2 size={14} /> ทุกชั้น · มุมมองภายนอก
            {value === "all" && <Check size={14} className="ml-auto" />}
          </button>
        </div>
      )}
    </div>
  );
}
