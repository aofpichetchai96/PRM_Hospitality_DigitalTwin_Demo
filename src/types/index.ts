// Domain types shared by data/, store/, three/ and components/ (PLAN 7).
import type { CameraPresetId } from "@/three/presets";

export type Vec3 = [number, number, number];

/** One text in Thai with an optional English line */
export type L10n = { th: string; en?: string };

export type PodiumFloorId = "G" | "L1" | "L2" | "L3" | "L4";
/** H01–H30 */
export type HotelFloorId = `H${string}`;
export type FloorId = PodiumFloorId | HotelFloorId;
/** "all" = whole building, exterior view */
export type FloorSelection = "all" | FloorId;

export type FloorType = "retail" | "guest" | "guestNarrow" | "skyCourt" | "roof";
export interface FloorSpec {
  id: FloorId;
  type: FloorType;
  /** Slab level (m) */
  y: number;
  height: number;
  /** Centre and size in plan (m) */
  footprint: { x: number; z: number; w: number; d: number };
  rooms: number;
}

export type RoomStatus = "occupied" | "ready" | "cleaning" | "maintenance";
export type RoomType = "Deluxe" | "Premier" | "Suite";
export interface Room {
  /** e.g. "H12-07" */
  id: string;
  floor: HotelFloorId;
  /** 1-based position on the floor */
  index: number;
  status: RoomStatus;
  type: RoomType;
}

export type IncidentType = "security" | "ahu" | "plant" | "leak" | "people";
export type Priority = "high" | "medium" | "low";
/** Detected → Verified → Dispatched → Resolved */
export type IncidentStatus = 0 | 1 | 2 | 3;
export interface Incident {
  id: string;
  title: L10n;
  location: string;
  floor?: FloorId;
  /** Where "Locate in 3D" flies to */
  position: Vec3;
  priority: Priority;
  type: IncidentType;
  status: IncidentStatus;
  time: string;
  owner: string;
  assetCode: string;
}

export interface WorkOrder {
  id: string;
  assetCode: string;
  owner: string;
  status: "Assigned" | "Completed";
  incidentId?: string;
  time: string;
}

export type AssetId = "site" | "hotel" | "mall" | "plant" | "ahu" | "arrival";
export type MetricStatus = "ok" | "warn" | "alert";
export interface AssetMetric {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
}
export interface AssetInfo {
  id: AssetId;
  name: string;
  code: string;
  /** 0–100 */
  health: number;
  status: MetricStatus;
  position: Vec3;
}

export interface EnergyInput {
  /** Occupied rooms / 600 */
  occupancy: number;
  setpoint: number;
  outdoor: number;
  tariff: number;
  footfallFactor: number;
  operatingHours: number;
}
export interface EnergyResult {
  /** Demand at the 24 °C reference setpoint (kW) */
  base: number;
  /** Current demand (kW) */
  current: number;
  saved: number;
  hotel: number;
  mall: number;
  other: number;
  savingPct: number;
  dayKwh: number;
  dayCost: number;
}

export type ViewId = "overview" | "twin" | "ioc" | "energy" | "hotel" | "ai";
export type ZoneId = "all" | "mall" | "hotel" | "plant" | "arrival";
export type SceneMode = "exterior" | "xray" | "slice";
export type LayerId = "energy" | "security" | "people" | "assets";
export type Layers = Record<LayerId, boolean>;
export type TimeOfDay = "day" | "dusk";
export type RightPanelTab = "agent" | "details";

/** What the camera should frame: a named preset or a floor (Slice mode) */
export type CameraShot = { preset: CameraPresetId } | { floor: FloorId } | { focus: Vec3; distance?: number };

export interface ViewConfig {
  id: ViewId;
  title: string;
  subtitle: string;
  camera: CameraShot;
  timeOfDay: TimeOfDay;
  mode: SceneMode;
  floor: FloorSelection;
  zone: ZoneId;
  layers: Layers;
  asset: AssetId;
  panel: RightPanelTab;
  autoRotate?: boolean;
}

export type FloorPlanId = "residence" | "social";
export interface PlanZone {
  id: string;
  name: string;
  sub: string;
  /** Marker position in % of the image */
  x: number;
  y: number;
  desc: string;
  ideas: string;
}
export interface FloorPlan {
  id: FloorPlanId;
  title: string;
  label: string;
  subtitle: string;
  image: string;
  width: number;
  height: number;
  number: string;
  count: string;
  countLabel: string;
  type: "2D" | "3D";
  typeLabel: string;
  intro: string;
  zones: PlanZone[];
}

export interface TourStep {
  view: ViewId;
  title: string;
  body: string;
  zone?: ZoneId;
  mode?: SceneMode;
  floor?: FloorId;
}

/** Rich text: paragraphs split by blank lines, **bold** spans */
export type ChatMessage = { role: "user"; text: string } | { role: "assistant"; text: string; source: string };
