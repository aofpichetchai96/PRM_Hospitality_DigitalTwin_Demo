// View, scene and UI state. setView() is the only way a view applies its hero
// shot, so tour, URL and buttons never fight over the camera (PLAN R2).
import type { StateCreator } from "zustand";
import { FLOOR_PLANS } from "@/data/floorPlans";
import { isHotelFloor } from "@/data/property";
import { ACTIVE_TOUR, TOURS, type TourSetId } from "@/data/tour";
import { VIEWS } from "@/data/views";
import type {
  AssetId,
  CameraShot,
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
import type { AppState } from "./useAppStore";

export type ModalKind =
  "help" | "about" | "reference" | "methodology" | "event" | "room" | "allRooms" | "asset" | "cctv";
export type ModalState = { kind: ModalKind; id?: string };

export interface TwinState {
  view: ViewId;
  zone: ZoneId;
  mode: SceneMode;
  floor: FloorSelection;
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
}

export interface TwinActions {
  setView: (id: ViewId, overrides?: Partial<Omit<ViewConfig, "id" | "title" | "subtitle">>) => void;
  selectZone: (zone: ZoneId) => void;
  selectFloor: (floor: FloorSelection) => void;
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
    set({ mode, floor: "all", explode: false });
  },

  toggleExplode: () => set((s) => ({ explode: !s.explode, mode: s.explode ? "exterior" : "xray", floor: "all" })),
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
