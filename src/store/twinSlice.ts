// View, scene and UI state. setView() is the only way a scene applies its hero
// shot, so the menu, keys 1–5 and the URL never fight over the camera (PLAN R2).
import type { StateCreator } from "zustand";
import { FLOOR_PLANS } from "@/data/floorPlans";
import { ASSETS, CHILLERS, isRoofEquipment, PLANT_PAD_Y } from "@/data/assets";

/** How close the camera comes for a chiller's inside view (CameraRig lets it closer than usual meanwhile) */
export const CHILLER_VIEW_DISTANCE = 21;
import { plantAlarm } from "@/data/events";
import { FLOORS, isHotelFloor } from "@/data/property";
import { ROOF_TILT, VIEWS } from "@/data/views";
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
  modal: ModalState | null;
  /** Incident the IOC workflow and the 3D marker follow (last opened or located) */
  incidentFocus: string | null;
  /** Chiller opened up in 3D (index into CHILLERS, double-click on the plant); null = none */
  chillerView: number | null;
  /** Incoming-alert card for a just-arrived incident; `n` replays its entrance */
  alert: { id: string; n: number } | null;
  toast: { text: string; n: number } | null;
  quality: Quality;
  /** Sidebar width chosen by the presenter; null = automatic (full from 1440px) */
  sidebarExpanded: boolean | null;
  /** Opening "constructing" sweep; true only until it finishes or is skipped */
  intro: boolean;
  /** Zoom button requests for the camera rig */
  zoom: { dir: 1 | -1; n: number };
}

export interface TwinActions {
  setView: (id: ViewId, overrides?: Partial<Omit<ViewConfig, "id" | "title" | "subtitle">>) => void;
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
  zoomCamera: (dir: 1 | -1) => void;
  activateHotspot: (id: HotspotId) => void;
  locateIncident: (id: string) => void;
  /** Alarm list click: follow the alarm and frame its unit (or where it is) */
  focusIncident: (id: string) => void;
  /** Open a chiller's inside view and fly close to it; null closes it and returns to the scene's shot */
  openChiller: (index: number | null) => void;
  /** A new incident arrives: alert card, red edge flash and a flight to where it is */
  raiseAlert: (id: string) => void;
  dismissAlert: () => void;
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
    modal: null,
    incidentFocus: null,
    chillerView: null,
    alert: null,
    toast: null,
    quality: "high",
    sidebarExpanded: null,
    intro: true,
    zoom: { dir: 1, n: 0 },
  };
}

export const createTwinSlice: StateCreator<AppState, [], [], TwinState & TwinActions> = (set, get) => {
  /**
   * Back of House shows the unit of the alarm in focus: a rooftop unit needs the roof sliced open (H30), the chiller
   * plant the whole building again. The camera is left to the caller, which flies to the unit.
   */
  const showAlarmUnit = (device: AssetId | undefined) => {
    if (get().view !== "boh" || !device) return;
    if (isRoofEquipment(device)) set({ mode: "slice", floor: "H30", selectedFloor: null, explode: false });
    else if (device === "plant") set({ mode: "exterior", floor: "all", selectedFloor: null, explode: false });
  };
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
        chillerView: null,
        camera: { shot: v.camera, n: s.camera.n + 1 },
        // Back of House opens on its plant alarm, so the 3D card and the workflow panel show the same one
        incidentFocus: id === "boh" ? (s.incidentFocus ?? plantAlarm(s.incidents, null)?.id ?? null) : s.incidentFocus,
      }));
    },

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
          // Guest Room looks straight down on a hotel floor (every room and its kW at once), Public Area on the Lobby
          camera: {
            shot:
              floor === "all"
                ? { preset: "all" }
                : s.view === "boh" && floor === "H30"
                  ? { floor, tilt: ROOF_TILT }
                  : {
                      floor,
                      top: (s.view === "rooms" && hotel) || (s.view === "public" && floor === "G") || undefined,
                    },
            n: s.camera.n + 1,
          },
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
      get().flyTo({ focus: ASSETS[asset].position, distance: ASSETS[asset].focusDistance });
    },
    openChiller: (index) => {
      if (index === null) {
        set({ chillerView: null });
        return get().flyTo(VIEWS[get().view].camera);
      }
      const c = CHILLERS[index];
      set({ chillerView: index, asset: "plant", panel: "details", selectedFloor: null });
      get().flyTo({ focus: [c.x, PLANT_PAD_Y + 1.6, c.z], distance: CHILLER_VIEW_DISTANCE });
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
          return g.setView("rooms");
        case "plant":
          return g.pickAsset("plant");
        case "mall":
          set({ zone: "mall", asset: "mall", panel: "details" });
          return g.flyTo({ preset: "mall" });
        case "people":
          return g.setView("public");
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

    focusIncident: (id) => {
      const e = get().incidents.find((x) => x.id === id);
      if (!e) return;
      showAlarmUnit(e.device);
      if (!e.device) {
        set({ incidentFocus: id });
        return get().flyTo({ focus: e.position, distance: 85 });
      }
      const unit = ASSETS[e.device];
      set({ incidentFocus: id, asset: e.device });
      get().flyTo({ focus: unit.position, distance: unit.focusDistance ?? 85 });
    },

    raiseAlert: (id) => {
      const e = get().incidents.find((x) => x.id === id);
      if (!e) return;
      showAlarmUnit(e.device);
      set((s) => ({ alert: { id, n: (s.alert?.n ?? 0) + 1 }, incidentFocus: id }));
      get().flyTo({ focus: e.position, distance: 85 });
    },
    dismissAlert: () => set({ alert: null }),
  };
};
