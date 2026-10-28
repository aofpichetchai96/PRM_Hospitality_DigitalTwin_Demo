// Domain types shared by data/, store/, three/ and components/ (PLAN 7).
import type { Answer } from "@/data/aiScript";
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

/** Red = guest in the room · yellow = booked, not yet arrived · green = vacant and ready to sell */
export type RoomStatus = "occupied" | "reserved" | "available";
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
/** Shown as severity: high = Critical, medium = Major, low = Minor */
export type Priority = "high" | "medium" | "low";
/** New → Acknowledged → In progress → Closed */
export type IncidentStatus = 0 | 1 | 2 | 3;
/** Standard operating procedure per alarm type (data/sop.ts) */
export type SopId = "security" | "ahu" | "chillerEfficiency" | "chwsHigh" | "ctTrip" | "vibration" | "leak" | "crowd";
/** What tripped the alarm: the measured value against its limit */
export interface AlarmReading {
  metric: string;
  value: string;
  threshold: string;
}
/** An incident or equipment alarm; the same record feeds Case Management, Alarm & Events and the assistant */
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
  /** Equipment in 3D that blinks and gets the focus */
  device?: AssetId;
  reading?: AlarmReading;
  sop: SopId;
}

export interface WorkOrder {
  id: string;
  assetCode: string;
  owner: string;
  status: "Assigned" | "Completed";
  incidentId?: string;
  time: string;
}

/** Rooftop plant (Back of House): cooling towers, pumps, tanks, exhaust fans */
export type RoofEquipmentId =
  "CT-01" | "CT-02" | "CT-03" | "P-01" | "P-02" | "P-03" | "P-04" | "T-01" | "T-02" | "EF-01" | "EF-02" | "EF-03";
export type AssetId = "site" | "hotel" | "mall" | "plant" | "ahu" | "arrival" | RoofEquipmentId;
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
  /** Camera distance when the asset is picked (default 95) */
  focusDistance?: number;
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

/** The five scenes of the property explorer, in menu order (keys 1–5) */
export type SceneId = "overview" | "rooms" | "public" | "boh" | "ai";
/** Workspace pages (the AI Assistant is in both lists) and the scenes */
export type ViewId = "executive" | "twin" | "ioc" | "energy" | SceneId;
export type ZoneId = "all" | "mall" | "hotel" | "plant" | "arrival";
export type SceneMode = "exterior" | "xray" | "slice";
export type LayerId = "energy" | "security" | "people" | "assets";
export type Layers = Record<LayerId, boolean>;
export type TimeOfDay = "day" | "dusk";
export type RightPanelTab = "agent" | "details";

/** What the camera should frame: a named preset or a floor (Slice mode) */
export type CameraShot =
  | { preset: CameraPresetId }
  /** `top`: straight down on the plan (Guest Room, Public Area); `tilt`: north up at this polar angle (Back of House) */
  | { floor: FloorId; top?: boolean; tilt?: number }
  | { focus: Vec3; distance?: number }
  /** Turn to a heading, keeping target, distance and tilt (compass) */
  | { azimuth: number };

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

/** Rich text: paragraphs split by blank lines, **bold** spans */
export type ChatMessage =
  | { role: "user"; text: string }
  /** `view` and `time` stamp the scene and clock the answer was built from */
  | ({ role: "assistant"; view: ViewId; time: string } & Answer);
