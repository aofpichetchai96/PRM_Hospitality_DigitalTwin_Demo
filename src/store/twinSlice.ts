// View, scene and UI state. setView() is the only way a view applies its hero
// shot, so showcase, URL and buttons never fight over the camera (PLAN R2).
import type { StateCreator } from "zustand";
import { FLOOR_PLANS } from "@/data/floorPlans";
import { ASSETS } from "@/data/assets";
import { FLOORS, isHotelFloor } from "@/data/property";
import { SHOWCASES, type ShowcaseAction, type ShowcasePath } from "@/data/showcase";
import { VIEWS } from "@/data/views";
import type {
  AssetId,
  CameraShot,
  FloorId,
  FloorPlanId,
  FloorSelection,
  LayerId,
  Layers,
  RightPanelTab,
  SceneMode,
  TimeOfDay,
  ViewConfig,
  ViewId,
  ZoneId,
} from "@/types";
import type { Quality } from "@/three/look";
import type { AppState } from "./useAppStore";

export type HotspotId = "hotel" | "mall" | "plant" | "security" | "ahu" | "people";

export type ModalKind =
  | "help"
  | "about"
  | "reference"
  | "methodology"
  | "event"
  | "room"
  | "allRooms"
  | "asset"
  | "cctv"
  | "value"
  | "roadmap";
export type ModalState = { kind: ModalKind; id?: string };

export interface TwinState {
  view: ViewId;
  zone: ZoneId;
  mode: SceneMode;
  floor: FloorSelection;
  /** Floor picked in 3D without slicing (click); double-click slices it */
  selectedFloor: FloorId | null;
  explode: boolean;
  timeOfDay: TimeOfDay;
  layers: Layers;
  asset: AssetId;
  panel: RightPanelTab;
  /** `n` increases on every request so flying to the same shot twice still moves */
  camera: { shot: CameraShot; n: number };
  autoRotate: boolean;
  presentation: boolean;
  chartsOpen: boolean;
  spatial: "building" | "plan";
  plan: { type: FloorPlanId; zone: string };
  /** Demo showcase ("ชมเดโม") on one of its paths; `n` restarts the beat timer on a jump */
  showcase: {
    path: ShowcasePath;
    chapter: number;
    beat: number;
    playing: boolean;
    loop: boolean;
    n: number;
  } | null;
  modal: ModalState | null;
  /** Incident the IOC workflow and the 3D marker follow (last opened or located) */
  incidentFocus: string | null;
  /** Incoming-alert card for a just-arrived incident; `n` replays its entrance */
  alert: { id: string; n: number } | null;
  toast: { text: string; n: number } | null;
  quality: Quality;
  /** Sidebar width chosen by the presenter; null = automatic (full from 1440px) */
  sidebarExpanded: boolean | null;
  /** Opening "constructing" sweep; true only until it finishes or is skipped */
  intro: boolean;
  /** Booth setting: play the showcase on its own after a period without input */
  attractEnabled: boolean;
  /** Attract mode is currently playing */
  attractActive: boolean;
  /** Zoom button requests for the camera rig */
  zoom: { dir: 1 | -1; n: number };
}

export interface TwinActions {
  setView: (id: ViewId, overrides?: Partial<Omit<ViewConfig, "id" | "title" | "subtitle">>) => void;
  selectZone: (zone: ZoneId) => void;
  selectFloor: (floor: FloorSelection) => void;
  pickFloor: (floor: FloorId | null) => void;
  /** Step the sliced floor up (+1) or down (−1) through the whole schedule */
  stepFloor: (dir: 1 | -1) => void;
  pickAsset: (asset: AssetId) => void;
  setMode: (mode: SceneMode) => void;
  toggleExplode: () => void;
  toggleLayer: (layer: LayerId) => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  selectAsset: (asset: AssetId) => void;
  setPanel: (panel: RightPanelTab) => void;
  flyTo: (shot: CameraShot) => void;
  setAutoRotate: (on: boolean) => void;
  togglePresentation: () => void;
  setChartsOpen: (open: boolean) => void;
  setSpatial: (spatial: "building" | "plan") => void;
  setPlanType: (type: FloorPlanId) => void;
  selectPlanZone: (zone: string) => void;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  notify: (text: string) => void;
  setQuality: (quality: Quality) => void;
  setSidebarExpanded: (expanded: boolean | null) => void;
  finishIntro: () => void;
  setAttractEnabled: (on: boolean) => void;
  setAttractActive: (on: boolean) => void;
  zoomCamera: (dir: 1 | -1) => void;
  activateHotspot: (id: HotspotId) => void;
  locateIncident: (id: string) => void;
  /** A new incident arrives: alert card, red edge flash and a flight to where it is */
  raiseAlert: (id: string) => void;
  dismissAlert: () => void;
  startShowcase: (opts?: { path?: ShowcasePath; loop?: boolean }) => void;
  goToChapter: (chapter: number) => void;
  nextBeat: () => void;
  setShowcasePlaying: (playing: boolean) => void;
  /** Stops the showcase and puts back the sim data it changed (incidents, scenario, chat) */
  endShowcase: () => void;
}

export function initialTwin(): TwinState {
  const v = VIEWS.overview;
  return {
    view: v.id,
    zone: v.zone,
    mode: v.mode,
    floor: v.floor,
    selectedFloor: null,
    explode: false,
    timeOfDay: v.timeOfDay,
    layers: { ...v.layers },
    asset: v.asset,
    panel: v.panel,
    camera: { shot: v.camera, n: 0 },
    autoRotate: v.autoRotate ?? false,
    presentation: false,
    chartsOpen: false,
    spatial: "building",
    plan: { type: "residence", zone: FLOOR_PLANS.residence.zones[0].id },
    showcase: null,
    modal: null,
    incidentFocus: null,
    alert: null,
    toast: null,
    quality: "high",
    sidebarExpanded: null,
    intro: true,
    attractEnabled: false,
    attractActive: false,
    zoom: { dir: 1, n: 0 },
  };
}

/** Sim data a showcase run changes and gives back when it ends */
const SAVED_KEYS = [
  "incidents",
  "workOrders",
  "incidentFocus",
  "setpoint",
  "outdoor",
  "occupancy",
  "tariff",
  "rooms",
  "chat",
  "time",
  "footfall",
] as const satisfies readonly (keyof AppState)[];
type ShowcaseSaved = Pick<AppState, (typeof SAVED_KEYS)[number]>;

export const createTwinSlice: StateCreator<AppState, [], [], TwinState & TwinActions> = (set, get) => {
  let saved: ShowcaseSaved | null = null;
  const save = () => {
    const s = get();
    return Object.fromEntries(SAVED_KEYS.map((k) => [k, s[k]])) as ShowcaseSaved;
  };
  const incident = (ref: string) => (ref === "focus" ? (get().incidentFocus ?? "") : ref);

  function run(action: ShowcaseAction) {
    const g = get();
    switch (action.do) {
      case "view":
        return g.setView(action.view, action.autoRotate === undefined ? {} : { autoRotate: action.autoRotate });
      case "zone":
        return g.selectZone(action.zone);
      case "mode":
        return g.setMode(action.mode);
      case "explode":
        if (g.explode !== action.on) g.toggleExplode();
        return;
      case "floor":
        return g.selectFloor(action.floor);
      case "pickFloor":
        return g.pickFloor(action.floor);
      case "stepFloor":
        return g.stepFloor(action.dir);
      case "layers":
        return set((s) => ({ layers: { ...s.layers, ...action.layers } }));
      case "time":
        return g.setTimeOfDay(action.time);
      case "azimuth":
        return g.flyTo({ azimuth: action.azimuth });
      case "zoom":
        return g.zoomCamera(action.dir);
      case "rotate":
        return g.setAutoRotate(action.on);
      case "presentation":
        if (g.presentation !== action.on) g.togglePresentation();
        return;
      case "plan":
        if (!action.type) return g.setSpatial("building");
        g.setPlanType(action.type);
        return g.setSpatial("plan");
      case "planZone":
        return g.selectPlanZone(action.zone);
      case "hotspot":
        return g.activateHotspot(action.id);
      case "asset":
        return g.pickAsset(action.asset);
      case "workOrder":
        g.createWorkOrder(ASSETS[g.asset].code);
        return;
      case "panel":
        return g.setPanel(action.panel);
      case "modal":
        return g.openModal(
          action.kind === "event"
            ? { kind: "event", id: incident(action.id) }
            : { kind: action.kind, id: "id" in action ? action.id : undefined },
        );
      case "roomModal": {
        const pick = (r: { id: string; status: string }) => r.status === action.status;
        const room = g.rooms.find((r) => pick(r) && r.id.startsWith("H12-")) ?? g.rooms.find(pick);
        if (room) g.openModal({ kind: "room", id: room.id });
        return;
      }
      case "roomStatus":
        if (g.modal?.kind === "room" && g.modal.id) g.setRoomStatus(g.modal.id, action.status);
        return;
      case "closeModal":
        return g.closeModal();
      case "simulateIncident":
        g.simulateIncident();
        return;
      case "incident":
        return g.advanceIncident(incident(action.id));
      case "locate":
        return g.locateIncident(incident(action.id));
      case "scenario":
        return g.setScenario({
          setpoint: action.setpoint,
          outdoor: action.outdoor,
          occupancy: action.occupancy,
          tariff: action.tariff,
        });
      case "clock":
        return g.setTime(action.hour);
      case "ask":
        return g.ask(action.question);
    }
  }
  const chapters = () => SHOWCASES[get().showcase?.path ?? "executive"];
  const runBeat = (chapter: number, beat: number) => chapters()[chapter].beats[beat].run.forEach(run);

  return {
    ...initialTwin(),

    setView: (id, overrides = {}) => {
      const v = { ...VIEWS[id], ...overrides };
      set((s) => ({
        view: id,
        zone: v.zone,
        mode: v.mode,
        floor: v.floor,
        selectedFloor: null,
        explode: false,
        timeOfDay: v.timeOfDay,
        layers: { ...v.layers },
        asset: v.asset,
        panel: v.panel,
        autoRotate: v.autoRotate ?? false,
        spatial: "building",
        camera: { shot: v.camera, n: s.camera.n + 1 },
      }));
    },

    selectZone: (zone) =>
      set((s) => ({
        zone,
        asset: zone === "all" ? "site" : zone,
        floor: "all",
        selectedFloor: null,
        mode: "exterior",
        explode: false,
        spatial: "building",
        autoRotate: false,
        camera: { shot: { preset: zone }, n: s.camera.n + 1 },
      })),

    selectFloor: (floor) =>
      set((s) => {
        const hotel = floor !== "all" && isHotelFloor(floor);
        return {
          floor,
          selectedFloor: null,
          mode: floor === "all" ? "exterior" : "slice",
          explode: false,
          asset: hotel ? "hotel" : floor === "all" ? "site" : "mall",
          zone: hotel ? "hotel" : floor === "all" ? "all" : "mall",
          spatial: "building",
          autoRotate: false,
          camera: { shot: floor === "all" ? { preset: "all" } : { floor }, n: s.camera.n + 1 },
        };
      }),

    setMode: (mode) => {
      // Slice needs a floor; the prototype opened H12 by default
      if (mode === "slice") return get().selectFloor(get().floor === "all" ? "H12" : get().floor);
      // Leaving a floor view: frame the whole building again
      const leavingFloor = get().floor !== "all";
      const wasExploded = get().explode;
      set({ mode, floor: "all", selectedFloor: null, explode: false });
      if (leavingFloor || wasExploded) get().flyTo({ preset: "all" });
    },

    toggleExplode: () => {
      const explode = !get().explode;
      set({ explode, mode: explode ? "xray" : "exterior", floor: "all", selectedFloor: null });
      // The exploded building is taller: step back so it stays in frame
      get().flyTo({ preset: explode ? "explode" : "all" });
    },

    pickFloor: (floor) => {
      if (!floor) return set({ selectedFloor: null });
      const hotel = isHotelFloor(floor);
      set({ selectedFloor: floor, asset: hotel ? "hotel" : "mall", zone: hotel ? "hotel" : "mall", panel: "details" });
    },

    stepFloor: (dir) => {
      const ids = FLOORS.map((f) => f.id);
      const { floor, selectedFloor } = get();
      const current = floor !== "all" ? floor : selectedFloor;
      const i = current ? ids.indexOf(current) + dir : dir > 0 ? 0 : ids.length - 1;
      get().selectFloor(ids[Math.min(ids.length - 1, Math.max(0, i))]);
    },

    pickAsset: (asset) => {
      set({ asset, panel: "details", selectedFloor: null });
      get().flyTo({ focus: ASSETS[asset].position });
    },
    toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
    setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
    selectAsset: (asset) => set({ asset }),
    setPanel: (panel) => set({ panel }),
    flyTo: (shot) => set((s) => ({ camera: { shot, n: s.camera.n + 1 }, autoRotate: false })),
    setAutoRotate: (autoRotate) => set({ autoRotate }),
    togglePresentation: () => set((s) => ({ presentation: !s.presentation })),
    setChartsOpen: (chartsOpen) => set({ chartsOpen }),
    // Opening the plan shows its zone details in the right panel (prototype setSpatialView)
    setSpatial: (spatial) =>
      set((s) => ({
        spatial,
        panel: spatial === "plan" ? "details" : s.panel,
        autoRotate: spatial === "plan" ? false : s.autoRotate,
      })),
    setPlanType: (type) => set({ plan: { type, zone: FLOOR_PLANS[type].zones[0].id } }),
    selectPlanZone: (zone) => set((s) => ({ plan: { ...s.plan, zone } })),
    // Opening the alerted incident takes over from its alert card
    openModal: (modal) =>
      set((s) =>
        modal.kind === "event" && modal.id
          ? { modal, incidentFocus: modal.id, alert: s.alert?.id === modal.id ? null : s.alert }
          : { modal },
      ),
    closeModal: () => set({ modal: null }),
    notify: (text) => set((s) => ({ toast: { text, n: (s.toast?.n ?? 0) + 1 } })),
    setQuality: (quality) => set({ quality }),
    setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
    finishIntro: () => set({ intro: false }),
    setAttractEnabled: (attractEnabled) => set({ attractEnabled }),
    setAttractActive: (attractActive) => set({ attractActive }),
    zoomCamera: (dir) => set((s) => ({ zoom: { dir, n: s.zoom.n + 1 }, autoRotate: false })),

    // Hotspot clicks (prototype hotspot(), L413)
    activateHotspot: (id) => {
      const g = get();
      switch (id) {
        case "security": {
          const e = g.incidents.find((x) => x.type === "security" && x.status < 3);
          if (e) g.openModal({ kind: "event", id: e.id });
          return;
        }
        case "ahu":
          set({ asset: "ahu", panel: "details" });
          g.flyTo({ preset: "hotel" });
          g.notify("AHU-H12 · ตำแหน่งและ Sensor เป็นข้อมูลจำลอง");
          return;
        case "hotel":
          return g.setView("hotel");
        case "plant":
          return g.setView("energy");
        case "mall":
          return g.selectZone("mall");
        case "people":
          set((s) => ({ layers: { ...s.layers, people: true } }));
          return g.selectZone("arrival");
      }
    },

    // "Locate in 3D": fly to the incident's floor, or its zone when it has none
    locateIncident: (id) => {
      const g = get();
      const e = g.incidents.find((x) => x.id === id);
      if (!e) return;
      // Close orbit on the incident, keeping the current mode; the marker shows where
      set({ modal: null, incidentFocus: id });
      g.flyTo({ focus: e.position, distance: 85 });
    },

    raiseAlert: (id) => {
      const e = get().incidents.find((x) => x.id === id);
      if (!e) return;
      set((s) => ({ alert: { id, n: (s.alert?.n ?? 0) + 1 }, incidentFocus: id }));
      get().flyTo({ focus: e.position, distance: 85 });
    },
    dismissAlert: () => set({ alert: null }),

    startShowcase: ({ path = "executive", loop = false } = {}) => {
      // Restarting from inside a run keeps the data saved when the first one began
      if (!get().showcase) saved = save();
      set({ showcase: { path, chapter: 0, beat: 0, playing: true, loop, n: 0 }, intro: false });
      get().goToChapter(0);
    },

    goToChapter: (chapter) => {
      const sc = get().showcase;
      if (!sc || chapter < 0) return;
      if (chapter >= chapters().length) {
        if (sc.loop) {
          if (saved) set(saved);
          return get().goToChapter(0);
        }
        get().endShowcase();
        get().notify("จบการสาธิต · ทดลองใช้งานแต่ละฟังก์ชันต่อได้");
        return;
      }
      set({
        showcase: { ...sc, chapter, beat: 0, n: sc.n + 1 },
        modal: null,
        spatial: "building",
        chartsOpen: false,
      });
      runBeat(chapter, 0);
    },

    nextBeat: () => {
      const sc = get().showcase;
      if (!sc) return;
      const beat = sc.beat + 1;
      if (beat >= chapters()[sc.chapter].beats.length) return get().goToChapter(sc.chapter + 1);
      set({ showcase: { ...sc, beat, n: sc.n + 1 } });
      runBeat(sc.chapter, beat);
    },

    setShowcasePlaying: (playing) => set((s) => (s.showcase ? { showcase: { ...s.showcase, playing } } : {})),

    endShowcase: () => {
      if (!get().showcase) return;
      set({
        ...saved,
        showcase: null,
        modal: null,
        spatial: "building",
        autoRotate: false,
        presentation: false,
        alert: null,
      });
      saved = null;
    },
  };
};
