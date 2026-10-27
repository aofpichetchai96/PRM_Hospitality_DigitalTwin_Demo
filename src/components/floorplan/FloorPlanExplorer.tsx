"use client";

// Interior Atlas (prototype floor plan L415–448): reference plans on a light
// "paper" theme over the 3D viewport. Pan by dragging when zoomed, zoom with
// the wheel, buttons, keyboard (+ − 0 arrows) or a two-finger pinch.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FLOOR_PLANS } from "@/data/floorPlans";
import { useAppStore } from "@/store/useAppStore";
import type { FloorPlanId } from "@/types";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const PAN_STEP = 35;
/** Margin kept around the paper when fitting it into the stage (px) */
const FIT_MARGIN = { x: 40, y: 48 };

type View = { zoom: number; x: number; y: number };
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** Keyed by plan so switching plans starts again at "fit" */
export function FloorPlanExplorer() {
  const planType = useAppStore((s) => s.plan.type);
  return <Explorer key={planType} planType={planType} />;
}

function Explorer({ planType }: { planType: FloorPlanId }) {
  const selected = useAppStore((s) => s.plan.zone);
  const setPlanType = useAppStore((s) => s.setPlanType);
  const selectPlanZone = useAppStore((s) => s.selectPlanZone);
  const setSpatial = useAppStore((s) => s.setSpatial);
  const plan = FLOOR_PLANS[planType];

  const stage = useRef<HTMLDivElement>(null);
  const [paper, setPaper] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const [labels, setLabels] = useState(true);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  // Fit the plan image into the stage, keeping its aspect ratio (prototype fitFloorPlan)
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const s = Math.min((el.clientWidth - FIT_MARGIN.x) / plan.width, (el.clientHeight - FIT_MARGIN.y) / plan.height);
      setPaper({ w: Math.max(1, plan.width * s), h: Math.max(1, plan.height * s) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [plan]);

  /** Keep the zoomed paper from leaving the stage; zoom 1 always re-centres */
  const clamp = useCallback(
    (v: View): View => {
      const el = stage.current;
      if (!el || v.zoom <= 1) return { zoom: clampZoom(v.zoom), x: 0, y: 0 };
      const lx = Math.max(0, (paper.w * v.zoom - el.clientWidth) / 2 + 35);
      const ly = Math.max(0, (paper.h * v.zoom - el.clientHeight) / 2 + 35);
      return { zoom: clampZoom(v.zoom), x: Math.max(-lx, Math.min(lx, v.x)), y: Math.max(-ly, Math.min(ly, v.y)) };
    },
    [paper],
  );
  const update = useCallback((fn: (v: View) => View) => setView((v) => clamp(fn(v))), [clamp]);
  const zoomBy = (f: number) => update((v) => ({ ...v, zoom: v.zoom * f }));

  // Wheel zoom needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      update((v) => ({ ...v, zoom: v.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [update]);

  function pickZone(id: string) {
    selectPlanZone(id);
    const z = plan.zones.find((x) => x.id === id);
    // When zoomed in, bring the chosen zone to the centre
    if (z)
      update((v) =>
        v.zoom > 1 ? { ...v, x: -(z.x / 100 - 0.5) * paper.w * v.zoom, y: -(z.y / 100 - 0.5) * paper.h * v.zoom } : v,
      );
  }

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  return (
    <section
      aria-label="สำรวจแปลนอ้างอิง"
      className="absolute inset-0 z-[35] grid grid-rows-[auto_minmax(0,1fr)_auto] bg-[#eeeee7] text-[#203b3a]"
    >
      <header className="flex items-center justify-between gap-4 border-b border-[#cdd7cd] bg-[#f5f5ef] px-4 py-3">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-[#648178]">PRM HOSPITALITY / INTERIOR ATLAS</p>
          <h2 className="text-[20px] font-semibold">{plan.title}</h2>
        </div>
        <div role="group" aria-label="เลือกภาพแปลน" className="flex items-center gap-2">
          <button
            onClick={() => setSpatial("building")}
            className="mr-2 h-9 rounded-[var(--radius-button)] border border-[#cdd7cd] bg-white px-3 text-[13px] hover:border-[#204e46]"
          >
            ← อาคาร 3D
          </button>
          {(Object.keys(FLOOR_PLANS) as FloorPlanId[]).map((id) => {
            const p = FLOOR_PLANS[id];
            const active = id === planType;
            return (
              <button
                key={id}
                aria-pressed={active}
                onClick={() => setPlanType(id)}
                className={`flex items-center gap-2 rounded-[var(--radius-button)] border px-2 py-1.5 text-left ${
                  active ? "border-[#204e46] bg-white" : "border-[#cdd7cd] bg-[#f5f5ef] hover:bg-white"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local plan thumbnail */}
                <img src={p.image} alt="" className="size-9 rounded-[3px] object-cover" />
                <span className="leading-tight">
                  <strong className="block text-[13px]">{id === "residence" ? "Residences" : "Social floor"}</strong>
                  <small className="text-[12px] text-[#648178]">{p.label}</small>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div
        ref={stage}
        tabIndex={0}
        role="region"
        aria-label="แปลนที่ซูมและลากได้ · ปุ่ม + − เพื่อซูม · 0 เพื่อพอดีภาพ · ลูกศรเพื่อเลื่อน"
        className={`relative touch-none overflow-hidden bg-[#e9ece3] bg-[radial-gradient(#6783782b_0.65px,transparent_0.65px)] bg-[length:16px_16px] outline-none focus-visible:ring-2 focus-visible:ring-[#204e46] ${
          view.zoom > 1 ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          // Capture keeps the drag alive outside the stage; some pointers cannot be captured
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          if (pointers.current.size === 2) pinch.current = distance();
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2 && pinch.current) {
            // Two fingers: zoom by the change in finger distance
            const d = distance();
            const f = d / pinch.current;
            pinch.current = d;
            update((v) => ({ ...v, zoom: v.zoom * f }));
          } else if (pointers.current.size === 1) {
            update((v) => ({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }));
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          pinch.current = null;
        }}
        onKeyDown={(e) => {
          const actions: Record<string, () => void> = {
            "+": () => zoomBy(1.25),
            "=": () => zoomBy(1.25),
            "-": () => zoomBy(0.8),
            "0": () => setView({ zoom: 1, x: 0, y: 0 }),
            ArrowLeft: () => update((v) => ({ ...v, x: v.x + PAN_STEP })),
            ArrowRight: () => update((v) => ({ ...v, x: v.x - PAN_STEP })),
            ArrowUp: () => update((v) => ({ ...v, y: v.y + PAN_STEP })),
            ArrowDown: () => update((v) => ({ ...v, y: v.y - PAN_STEP })),
          };
          const act = actions[e.key];
          if (!act) return;
          // Keep the stage's arrows from also stepping the guided demo
          e.preventDefault();
          e.stopPropagation();
          act();
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 origin-center bg-white shadow-[0_12px_42px_#34494020] will-change-transform"
          style={{
            width: paper.w,
            height: paper.h,
            transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local reference plan */}
          <img
            src={plan.image}
            alt={`${plan.label} — ภาพอ้างอิง`}
            draggable={false}
            className="h-full w-full select-none"
          />
          {labels &&
            plan.zones.map((z) => {
              const active = z.id === selected;
              return (
                <button
                  key={z.id}
                  onClick={() => pickZone(z.id)}
                  aria-pressed={active}
                  aria-label={`${z.name} · ${z.sub}`}
                  title={z.name}
                  // Counter-scale so markers stay the same size while zooming
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    transform: `translate(-50%, -50%) scale(${1 / view.zoom})`,
                  }}
                  className="group absolute flex items-center gap-1.5"
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full border-2 border-white text-[12px] font-semibold shadow-md ${
                      active ? "bg-[#c9733f] text-white" : "bg-[#204e46] text-[#fff9e7]"
                    }`}
                  >
                    {z.id}
                  </span>
                  <span
                    className={`rounded-[4px] bg-white/95 px-1.5 py-0.5 text-[12px] whitespace-nowrap shadow ${
                      active ? "block" : "hidden group-hover:block"
                    }`}
                  >
                    {z.name}
                  </span>
                </button>
              );
            })}
        </div>
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-[5px] border border-[#cbd8c8] bg-[#fafcf0df] px-2.5 py-1.5 text-[11px] leading-snug text-[#627c70]">
          <strong className="block text-[13px] text-[#203b3a]">{plan.label}</strong>
          REFERENCE COLLECTION · NOT FLOOR-ASSIGNED
        </p>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[#cdd7cd] bg-[#f5f5ef] px-4 py-2">
        <span className="text-[12px] text-[#667b6e]">
          เลือกจุดบนแปลนเพื่อสำรวจ · ซูมแล้วลากภาพเพื่อดูรายละเอียด · ใช้สองนิ้วซูมบน iPad
        </span>
        <div role="group" aria-label="เครื่องมือแปลน" className="flex items-center gap-1 text-[13px]">
          <PlanButton label="ย่อแปลน" onClick={() => zoomBy(0.8)} disabled={view.zoom <= MIN_ZOOM}>
            −
          </PlanButton>
          <output aria-live="polite" className="w-12 text-center tabular-nums">
            {Math.round(view.zoom * 100)}%
          </output>
          <PlanButton label="ขยายแปลน" onClick={() => zoomBy(1.25)} disabled={view.zoom >= MAX_ZOOM}>
            +
          </PlanButton>
          <PlanButton label="พอดีภาพ" onClick={() => setView({ zoom: 1, x: 0, y: 0 })} wide>
            พอดีภาพ
          </PlanButton>
          <PlanButton label="จุดสำรวจ" onClick={() => setLabels((l) => !l)} pressed={labels} wide>
            จุดสำรวจ
          </PlanButton>
        </div>
      </footer>
    </section>
  );
}

function PlanButton({
  label,
  onClick,
  disabled,
  pressed,
  wide,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 rounded-[var(--radius-button)] border border-[#cdd7cd] bg-white whitespace-nowrap disabled:opacity-40 ${
        wide ? "px-3" : "w-8"
      } ${pressed ? "border-[#204e46] text-[#204e46]" : ""}`}
    >
      {children}
    </button>
  );
}
