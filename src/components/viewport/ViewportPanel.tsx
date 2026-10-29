"use client";

// The 3D viewport with its 2D overlays: scene mode, time of day, camera
// toolbar, floor selector, floating KPI strip, CCTV feeds on Public Area and
// the incoming-alert card.
import {
  Box,
  Camera,
  Check,
  ChevronDown,
  CloudRain,
  Haze,
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
import { type RefObject, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { KpiStrip } from "@/components/layout/KpiStrip";
import { CAMERAS, CctvFeed } from "@/components/cctv/CctvFeed";
import { AlarmCard } from "./AlarmCard";
import { ChillerBanner } from "./ChillerBanner";
import { AreaPicker } from "./AreaPicker";
import { FloorPicker } from "./FloorPicker";
import { FloorPlanExplorer } from "@/components/floorplan/FloorPlanExplorer";
import { AlertFlash, IncomingAlert } from "./IncomingAlert";
import { Segmented } from "@/components/ui/Segmented";
import { VIEWS } from "@/data/views";
import { SHORT_SCREEN, useMediaQuery } from "@/lib/useMediaQuery";
import { useAppStore } from "@/store/useAppStore";
import { capturePng } from "@/lib/capturePng";
import { HotspotSet } from "@/three/HotspotSet";
import { LayerEffects } from "@/three/effects/LayerEffects";
import { COMPASS_NEEDLE_ID, CompassSync } from "@/three/Compass";
import { EquipmentAlarms } from "@/three/EquipmentAlarms";
import { IncidentMarker } from "@/three/IncidentMarker";
import { AlarmCallout } from "@/three/AlarmCallout";
import { ChillerPlant } from "@/three/ChillerPlant";
import { SiteLamps } from "@/three/SiteLamps";
import { EventHallLayer } from "@/three/EventHallLayer";
import { ServerRoomScene } from "@/three/ServerRoomScene";
import { LobbyZones } from "@/three/LobbyZones";
import { RoomPower } from "@/three/RoomPower";
import { RoomTint } from "@/three/RoomTint";
import { FloorHighlight } from "@/three/picking/FloorHighlight";
import { PickProxies } from "@/three/picking/PickProxies";
import { SceneTooltip } from "./SceneTooltip";
import type { Season, SceneMode, TimeOfDay } from "@/types";
import { SEASON_LABEL } from "@/three/look";

const Viewport = dynamic(() => import("@/three/Viewport"), { ssr: false });

/** Height of the floating KPI strip plus its margins (px) */
const KPI_INSET = 96;

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

const SEASON_ICON: Record<Season, LucideIcon> = { summer: Sun, rainy: CloudRain, haze: Haze };

const SEASON_TONE: Record<Season, { text: string; bg: string; note: string }> = {
  summer: { text: "text-orange", bg: "bg-orange/15", note: "Clear sky · strong sun" },
  rainy: { text: "text-blue", bg: "bg-blue/15", note: "Rain · dust washed out" },
  haze: { text: "text-gold", bg: "bg-gold/15", note: "Dusty haze · AQI high" },
};

/**
 * Season dropdown beside the day / dusk toggle: a button with the current season, opening a card of the three with
 * an icon, a one-line description and a tick. Closes on a choice, a click outside or Esc.
 */
function SeasonSelect({ value, onChange }: { value: Season; onChange: (s: Season) => void }) {
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
  const Icon = SEASON_ICON[value];

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          // Close the menu only, not the slice / presentation behind it (useKeyboard)
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          setOpen(false);
        }
      }}
    >
      <button
        aria-label="ฤดูกาล"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="ฤดูกาล"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-full items-center gap-1.5 rounded-[var(--radius-button)] border bg-bg/70 py-1 pr-2 pl-2.5 text-[13px] backdrop-blur transition-colors ${
          open ? "border-accent/60" : "border-line hover:border-accent/60"
        }`}
      >
        <Icon size={14} className={SEASON_TONE[value].text} />
        {SEASON_LABEL[value].th}
        <ChevronDown size={13} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="ฤดูกาล"
          className="absolute top-full right-0 z-30 mt-1.5 w-[248px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel/95 p-1 shadow-[0_12px_32px_rgb(0_0_0/0.45)] backdrop-blur"
        >
          {(Object.keys(SEASON_LABEL) as Season[]).map((s) => {
            const ItemIcon = SEASON_ICON[s];
            const selected = s === value;
            return (
              <li key={s} role="option" aria-selected={selected}>
                <button
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-[var(--radius-button)] px-2 py-1.5 text-left transition-colors ${
                    selected ? "bg-accent/10" : "hover:bg-panel-2"
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${SEASON_TONE[s].bg}`}>
                    <ItemIcon size={16} className={SEASON_TONE[s].text} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className={`block text-[13px] font-semibold ${selected ? "text-accent" : ""}`}>
                      {SEASON_LABEL[s].th}
                    </span>
                    <span className="block truncate text-[11px] text-muted">{SEASON_TONE[s].note}</span>
                  </span>
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

function Scene({ topInset, hotspots }: { topInset: number; hotspots: RefObject<HTMLDivElement | null> }) {
  const s = useAppStore(
    useShallow((st) => ({
      time: st.timeOfDay,
      season: st.season,
      quality: st.quality,
      camera: st.camera,
      zoom: st.zoom,
      autoRotate: st.autoRotate,
      mode: st.mode,
      floor: st.floor,
      explode: st.explode,
      rooms: st.rooms,
      layers: st.layers,
      ict: st.view === "ict",
    })),
  );
  const pickFloor = useAppStore((st) => st.pickFloor);
  const openRack = useAppStore((st) => st.openRack);
  // The ICT scene shows the server room on its own: none of the building layers
  if (s.ict)
    return (
      <Viewport settings={{ ...s, topInset }} onPointerMissed={() => openRack(null)}>
        <ServerRoomScene portal={hotspots} />
        <CompassSync />
      </Viewport>
    );
  return (
    <Viewport settings={{ ...s, topInset }} onPointerMissed={() => pickFloor(null)}>
      <HotspotSet portal={hotspots} />
      <PickProxies />
      <FloorHighlight />
      <IncidentMarker />
      <EquipmentAlarms />
      <ChillerPlant portal={hotspots} />
      <SiteLamps />
      <AlarmCallout />
      <RoomTint />
      <RoomPower />
      <LobbyZones portal={hotspots} />
      <EventHallLayer portal={hotspots} />
      <LayerEffects />
      <CompassSync />
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
      season: s.season,
      autoRotate: s.autoRotate,
      panel: s.panel,
      spatial: s.spatial,
      intro: s.intro,
    })),
  );
  const a = useAppStore(
    useShallow((s) => ({
      flyTo: s.flyTo,
      openArea: s.openArea,
      setAutoRotate: s.setAutoRotate,
      setPanel: s.setPanel,
      zoomCamera: s.zoomCamera,
      togglePresentation: s.togglePresentation,
      setTimeOfDay: s.setTimeOfDay,
      setSeason: s.setSeason,
      setMode: s.setMode,
      toggleExplode: s.toggleExplode,
      selectFloor: s.selectFloor,
      openModal: s.openModal,
      setSpatial: s.setSpatial,
      finishIntro: s.finishIntro,
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

      {st.view !== "ict" && (
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
      )}

      {/* ICT: presets for the server room's numbered areas instead of the building controls */}
      {st.view === "ict" && (
        <div className={`absolute right-3 z-20 ${top}`}>
          <AreaPicker />
        </div>
      )}

      {/* Building controls; the ICT server room has none (it is not part of the building model) */}
      {st.view !== "ict" && (
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
          <SeasonSelect value={st.season} onChange={a.setSeason} />
        </div>
      )}

      <div className="absolute top-1/2 left-3 z-20 flex -translate-y-1/2 flex-col gap-1.5 short:translate-y-[-30%]">
        <ToolButton
          icon={House}
          label="มุมมองเริ่มต้น"
          onClick={() => (st.view === "ict" ? a.openArea(null) : a.flyTo(VIEWS[st.view].camera))}
        />
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
        {st.view !== "ict" && <FloorPicker value={st.floor} onChange={a.selectFloor} />}
        <span className="hidden rounded-[var(--radius-button)] bg-bg/60 px-2 py-1 text-[13px] text-text/80 backdrop-blur wide:inline">
          ลากเพื่อหมุน · เลื่อนเพื่อซูม · คลิกขวาลากเพื่อเลื่อน
        </span>
      </div>

      {/* Compass (prototype L321): needle follows the camera, click turns to north */}
      <button
        onClick={() => a.flyTo({ azimuth: 0 })}
        title="หันไปทิศเหนือ"
        aria-label="เข็มทิศ · หันไปทิศเหนือ"
        className="absolute right-3 bottom-3 z-20 grid size-11 place-items-center rounded-full border border-line bg-bg/80 backdrop-blur hover:border-accent/60"
      >
        <span className="absolute -top-4 text-[10px] text-muted">N</span>
        <span id={COMPASS_NEEDLE_ID} className="block h-7 w-1.5 will-change-transform" aria-hidden>
          <span className="block h-1/2 w-full rounded-t-full bg-red" />
          <span className="block h-1/2 w-full rounded-b-full bg-text/60" />
        </span>
      </button>

      {(st.view === "public" || st.view === "ioc") && (
        // Two sample analytics feeds over the scene (prototype cctv-overlay)
        <div className="absolute bottom-16 left-3 z-20 grid w-[min(440px,45%)] grid-cols-2 gap-2 short:w-[min(260px,28%)]">
          {CAMERAS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => a.openModal({ kind: "cctv", id: String(i) })}
              className="relative h-[110px] overflow-hidden rounded-[var(--radius-button)] border border-line bg-bg/80 hover:border-accent/60"
            >
              <CctvFeed camera={i} />
              <span className="absolute bottom-1 left-1.5 rounded bg-bg/80 px-1.5 font-mono text-[10px] tracking-wider text-[#b2e4cf]">
                {c.id} · SAMPLE
              </span>
            </button>
          ))}
        </div>
      )}

      <ChillerBanner />
      <AlarmCard />
      {st.spatial === "plan" && <FloorPlanExplorer />}

      {st.intro && (
        // Opening sweep caption; any click skips it
        <button
          onClick={a.finishIntro}
          className="absolute inset-0 z-[45] flex cursor-default flex-col items-center justify-start pt-[18%]"
          aria-label="ข้ามการแสดงเปิด"
        >
          <span className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-line bg-bg/75 px-5 py-2.5 backdrop-blur">
            <span className="font-mono text-[12px] tracking-[0.35em] text-text">CONSTRUCTING SPATIAL TWIN</span>
            <span className="text-[13px] text-muted">คลิกหรือกดปุ่มใดก็ได้เพื่อข้าม</span>
          </span>
        </button>
      )}

      <AlertFlash />
      <IncomingAlert />
    </div>
  );
}
