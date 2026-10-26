"use client";

// The 3D viewport with its 2D overlays: scene mode, time of day, camera
// toolbar, floor selector, reference thumbnail, floating KPI strip and the
// guided-demo card. The Floor Plan switch arrives in Phase 8.
import {
  Box,
  Camera,
  Map as MapIcon,
  House,
  Layers,
  Maximize,
  Minimize,
  Minus,
  Moon,
  Plus,
  RotateCw,
  SeparatorHorizontal,
  Sun,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { type RefObject, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { KpiStrip } from "@/components/layout/KpiStrip";
import { CAMERAS, SyntheticFeed } from "@/components/cctv/SyntheticFeed";
import { FloorPlanExplorer } from "@/components/floorplan/FloorPlanExplorer";
import { TourCard } from "@/components/tour/TourCard";
import { Segmented } from "@/components/ui/Segmented";
import { FLOORS } from "@/data/property";
import { VIEWS } from "@/data/views";
import { SHORT_SCREEN, useMediaQuery } from "@/lib/useMediaQuery";
import { useAppStore } from "@/store/useAppStore";
import { capturePng } from "@/lib/capturePng";
import { HotspotSet } from "@/three/HotspotSet";
import { IncidentMarker } from "@/three/IncidentMarker";
import { FloorHighlight } from "@/three/picking/FloorHighlight";
import { PickProxies } from "@/three/picking/PickProxies";
import { SceneTooltip } from "./SceneTooltip";
import type { FloorSelection, SceneMode, TimeOfDay } from "@/types";

const Viewport = dynamic(() => import("@/three/Viewport"), { ssr: false });

/** Height of the floating KPI strip plus its margins (px) */
const KPI_INSET = 96;

const FLOOR_LABEL: Record<string, string> = {
  retail: "Retail",
  guest: "Hotel · 28 keys",
  guestNarrow: "Hotel · 17 keys",
  skyCourt: "Sky court",
  roof: "Roof terrace",
};

function ToolButton({
  icon: Icon,
  label,
  onClick,
  pressed,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-[var(--radius-button)] border bg-bg/70 backdrop-blur transition-colors hover:text-accent ${
        pressed ? "border-accent/60 text-accent" : "border-line text-text/90"
      }`}
    >
      <Icon size={16} strokeWidth={1.7} />
    </button>
  );
}

function Scene({ topInset, hotspots }: { topInset: number; hotspots: RefObject<HTMLDivElement | null> }) {
  const s = useAppStore(
    useShallow((st) => ({
      time: st.timeOfDay,
      quality: st.quality,
      camera: st.camera,
      zoom: st.zoom,
      autoRotate: st.autoRotate,
      mode: st.mode,
      floor: st.floor,
      explode: st.explode,
      rooms: st.rooms,
      layers: st.layers,
    })),
  );
  const pickFloor = useAppStore((st) => st.pickFloor);
  return (
    <Viewport settings={{ ...s, topInset }} onPointerMissed={() => pickFloor(null)}>
      <HotspotSet portal={hotspots} />
      <PickProxies />
      <FloorHighlight />
      <IncidentMarker />
    </Viewport>
  );
}

export function ViewportPanel() {
  const short = useMediaQuery(SHORT_SCREEN);
  const presentation = useAppStore((s) => s.presentation);
  const floatKpi = short && !presentation;
  const st = useAppStore(
    useShallow((s) => ({
      view: s.view,
      floor: s.floor,
      mode: s.mode,
      explode: s.explode,
      timeOfDay: s.timeOfDay,
      autoRotate: s.autoRotate,
      panel: s.panel,
      spatial: s.spatial,
    })),
  );
  const a = useAppStore(
    useShallow((s) => ({
      flyTo: s.flyTo,
      setAutoRotate: s.setAutoRotate,
      setPanel: s.setPanel,
      zoomCamera: s.zoomCamera,
      togglePresentation: s.togglePresentation,
      setTimeOfDay: s.setTimeOfDay,
      setMode: s.setMode,
      toggleExplode: s.toggleExplode,
      selectFloor: s.selectFloor,
      openModal: s.openModal,
      setSpatial: s.setSpatial,
      notify: s.notify,
    })),
  );
  const top = floatKpi ? "top-[96px]" : "top-3";
  const hotspots = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel">
      <Scene topInset={floatKpi ? KPI_INSET : 0} hotspots={hotspots} />
      {/* Hotspot labels mount here, above the canvas and below the overlays */}
      <div ref={hotspots} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" />
      <SceneTooltip />

      {floatKpi && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30">
          <KpiStrip floating />
        </div>
      )}

      <div className={`absolute left-3 z-20 ${top}`}>
        <Segmented<"building" | "plan">
          label="มุมมองพื้นที่"
          value={st.spatial}
          onChange={a.setSpatial}
          options={[
            {
              value: "building",
              label: (
                <>
                  <Box size={14} /> อาคาร 3D
                </>
              ),
            },
            {
              value: "plan",
              label: (
                <>
                  <MapIcon size={14} /> Floor Plan
                </>
              ),
            },
          ]}
        />
      </div>

      <div className={`absolute right-3 z-20 flex gap-2 ${top}`}>
        <Segmented<SceneMode>
          label="โหมดการแสดงผล"
          value={st.mode}
          onChange={a.setMode}
          options={[
            { value: "exterior", label: "Exterior", title: "ภายนอกอาคาร" },
            { value: "xray", label: "X-ray", title: "มองทะลุโครงสร้างและงานระบบ" },
            { value: "slice", label: "Slice", title: "ตัดอาคารที่ชั้นที่เลือก" },
          ]}
        />
        <button
          aria-pressed={st.explode}
          title="แยกชั้นอาคาร"
          onClick={a.toggleExplode}
          className={`flex items-center gap-1.5 rounded-[var(--radius-button)] border bg-bg/70 px-2.5 text-[12px] backdrop-blur transition-colors ${
            st.explode ? "border-accent/60 text-accent" : "border-line text-muted hover:text-text"
          }`}
        >
          <SeparatorHorizontal size={14} /> Explode
        </button>
        <Segmented<TimeOfDay>
          label="ช่วงเวลา"
          value={st.timeOfDay}
          onChange={a.setTimeOfDay}
          options={[
            { value: "day", label: <Sun size={14} />, title: "กลางวัน" },
            { value: "dusk", label: <Moon size={14} />, title: "พลบค่ำ" },
          ]}
        />
      </div>

      <div className="absolute top-1/2 left-3 z-20 flex -translate-y-1/2 flex-col gap-1.5 short:translate-y-[-30%]">
        <ToolButton icon={House} label="มุมมองเริ่มต้น" onClick={() => a.flyTo(VIEWS[st.view].camera)} />
        <ToolButton
          icon={RotateCw}
          label="หมุนอัตโนมัติ"
          pressed={st.autoRotate}
          onClick={() => a.setAutoRotate(!st.autoRotate)}
        />
        <ToolButton
          icon={Layers}
          label="Layers & Asset"
          pressed={!presentation && st.panel === "details"}
          onClick={() => a.setPanel("details")}
        />
        <ToolButton icon={Plus} label="ซูมเข้า" onClick={() => a.zoomCamera(1)} />
        <ToolButton icon={Minus} label="ซูมออก" onClick={() => a.zoomCamera(-1)} />
        <ToolButton
          icon={presentation ? Minimize : Maximize}
          label={presentation ? "ออกจาก Presentation (P)" : "Presentation mode (P)"}
          pressed={presentation}
          onClick={a.togglePresentation}
        />
        <ToolButton
          icon={Camera}
          label="บันทึกภาพ 3D (PNG)"
          onClick={() => {
            const ok = capturePng(document.querySelector<HTMLCanvasElement>("canvas"), useAppStore.getState().time);
            a.notify(ok ? "บันทึกภาพ 3D แล้ว" : "3D renderer ยังไม่พร้อม");
          }}
        />
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex items-end gap-3">
        <select
          aria-label="เลือกชั้น"
          value={st.floor}
          onChange={(e) => a.selectFloor(e.target.value as FloorSelection)}
          className="h-9 rounded-[var(--radius-button)] border border-line bg-bg/85 px-3 text-[13px] backdrop-blur"
        >
          <option value="all">ทุกชั้น · มุมมองภายนอก</option>
          <optgroup label="Retail podium">
            {FLOORS.filter((f) => f.type === "retail").map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · Retail
              </option>
            ))}
          </optgroup>
          <optgroup label="Hotel tower">
            {FLOORS.filter((f) => f.type !== "retail").map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} · {FLOOR_LABEL[f.type]}
              </option>
            ))}
          </optgroup>
        </select>
        <span className="hidden rounded-[var(--radius-button)] bg-bg/60 px-2 py-1 text-[11px] text-text/80 backdrop-blur wide:inline">
          ลากเพื่อหมุน · เลื่อนเพื่อซูม · คลิกขวาลากเพื่อเลื่อน
        </span>
      </div>

      <button
        onClick={() => a.openModal({ kind: "reference" })}
        className="absolute right-3 bottom-3 z-20 overflow-hidden rounded-[var(--radius-button)] border border-line bg-bg/80 text-center hover:border-accent/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static reference thumbnail */}
        <img src="/images/reference.webp" alt="ภาพอ้างอิงอาคาร" className="h-[84px] w-[56px] object-cover" />
        <span className="block py-0.5 text-[9px] tracking-wider text-muted">REFERENCE</span>
      </button>

      {st.view === "ioc" && (
        // Two synthetic camera feeds over the scene (prototype cctv-overlay)
        <div className="absolute bottom-16 left-3 z-20 grid w-[min(440px,45%)] grid-cols-2 gap-2">
          {CAMERAS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => a.openModal({ kind: "cctv", id: String(i) })}
              className="relative h-[110px] overflow-hidden rounded-[var(--radius-button)] border border-line bg-bg/80 hover:border-accent/60"
            >
              <SyntheticFeed camera={i} />
              <span className="absolute top-1.5 left-2 font-mono text-[10px] tracking-wider text-[#b2e4cf]">
                {c.id} · SYNTHETIC
              </span>
            </button>
          ))}
        </div>
      )}

      {st.spatial === "plan" && <FloorPlanExplorer />}

      <TourCard />
    </div>
  );
}
