// View, scene and UI state. setView() is the only way a view applies its hero
// shot, so tour, URL and buttons never fight over the camera (PLAN R2).
import type { StateCreator } from "zustand";
import { FLOOR_PLANS } from "@/data/floorPlans";
import { ASSETS } from "@/data/assets";
import { FLOORS, isHotelFloor } from "@/data/property";
import { ACTIVE_TOUR, TOURS, type TourSetId } from "@/data/tour";
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
  "help" | "about" | "reference" | "methodology" | "event" | "room" | "allRooms" | "asset" | "cctv";
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
  tour: { set: TourSetId; step: number } | null;
  modal: ModalState | null;
  toast: { text: string; n: number } | null;
  quality: Quality;
  /** Sidebar width chosen by the presenter; null = automatic (full from 1440px) */
  sidebarExpanded: boolean | null;
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
  zoomCamera: (dir: 1 | -1) => void;
  activateHotspot: (id: HotspotId) => void;
  locateIncident: (id: string) => void;
  startTour: (set?: TourSetId) => void;
  goToTourStep: (step: number) => void;
  endTour: () => void;
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
    tour: null,
    modal: null,
    toast: null,
    quality: "high",
    sidebarExpanded: null,
    zoom: { dir: 1, n: 0 },
  };
}

export const createTwinSlice: StateCreator<AppState, [], [], TwinState & TwinActions> = (set, get) => ({
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
  setSpatial: (spatial) => set({ spatial }),
  setPlanType: (type) => set({ plan: { type, zone: FLOOR_PLANS[type].zones[0].id } }),
  selectPlanZone: (zone) => set((s) => ({ plan: { ...s.plan, zone } })),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  notify: (text) => set((s) => ({ toast: { text, n: (s.toast?.n ?? 0) + 1 } })),
  setQuality: (quality) => set({ quality }),
  setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
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
    g.closeModal();
    if (e.floor) return g.selectFloor(e.floor);
    g.selectZone(e.type === "people" ? "arrival" : "plant");
  },

  startTour: (tourSet = ACTIVE_TOUR) => {
    set({ tour: { set: tourSet, step: 0 }, modal: null });
    get().goToTourStep(0);
  },

  goToTourStep: (step) => {
    const tour = get().tour;
    if (!tour) return;
    const steps = TOURS[tour.set];
    if (step < 0) return;
    if (step >= steps.length) {
      get().endTour();
      get().notify("จบ Guided Demo · ทดลองแต่ละฟังก์ชันต่อได้");
      return;
    }
    const t = steps[step];
    set({ tour: { ...tour, step }, modal: null });
    get().setView(t.view);
    if (t.zone) get().selectZone(t.zone);
    if (t.mode) get().setMode(t.mode);
    if (t.floor) get().selectFloor(t.floor);
  },

  endTour: () => set({ tour: null }),
});
