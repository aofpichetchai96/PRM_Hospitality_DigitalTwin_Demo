// Selectable assets (prototype assetHtml L363). Live metrics are derived in
// store/selectors.ts because they depend on rooms, energy and incidents.
import type { AssetId, AssetInfo, AssetMetric, RoofEquipmentId, Vec3 } from "@/types";
import { floorSpec } from "./property";

/** Roof deck level (H30 slab top), where the rooftop plant stands */
export const ROOF_Y = floorSpec("H30").y + 0.14;

export type EquipmentKind = "coolingTower" | "pump" | "tank" | "exhaustFan";

export interface RoofEquipment {
  id: RoofEquipmentId;
  kind: EquipmentKind;
  name: string;
  code: string;
  /** Centre of the unit on the roof deck (x, z) and its size (w, h, d), as modelled in roofFloor() */
  x: number;
  z: number;
  size: Vec3;
  health: number;
  /** Normal readings; an open alarm on the unit replaces the one with the same label */
  readings: AssetMetric[];
}

const KIND_LABEL: Record<EquipmentKind, string> = {
  coolingTower: "Cooling tower",
  pump: "Condenser water pump",
  tank: "Water storage tank",
  exhaustFan: "Exhaust fan",
};

const unit = (
  id: RoofEquipmentId,
  kind: EquipmentKind,
  x: number,
  z: number,
  size: Vec3,
  readings: AssetMetric[],
): RoofEquipment => ({
  id,
  kind,
  name: `${id} · ${KIND_LABEL[kind]}`,
  code: `PRM-RF-MEP-${id}`,
  x,
  z,
  size,
  health: 94,
  readings,
});

const tower = (id: RoofEquipmentId, x: number) =>
  unit(
    id,
    "coolingTower",
    x,
    3,
    [5.4, 4.6, 5.4],
    [
      { label: "Fan current", value: 18.4, unit: "A" },
      { label: "Condenser water out", value: 29.6, unit: "°C" },
      { label: "Fan speed", value: 88, unit: "%" },
    ],
  );
const pumpUnit = (id: RoofEquipmentId, x: number) =>
  unit(
    id,
    "pump",
    x,
    -11.2,
    [1.1, 1, 1.4],
    [
      { label: "Vibration", value: 2.3, unit: "mm/s" },
      { label: "Flow", value: 42, unit: "L/s" },
      { label: "Motor current", value: 21, unit: "A" },
    ],
  );
const tank = (id: RoofEquipmentId, x: number) =>
  unit(
    id,
    "tank",
    x,
    -16,
    [4.2, 3.5, 4.2],
    [
      { label: "Leak sensor", value: "Dry" },
      { label: "Water level", value: 78, unit: "%" },
      { label: "Make-up valve", value: "Closed" },
    ],
  );
const fan = (id: RoofEquipmentId, x: number) =>
  unit(
    id,
    "exhaustFan",
    x,
    -18,
    [1.1, 0.8, 1.1],
    [
      { label: "Airflow", value: 3.2, unit: "m³/s" },
      { label: "Motor current", value: 4.1, unit: "A" },
      { label: "Run status", value: "Running" },
    ],
  );

/** Rooftop plant in the order the alarm list and pick proxies use it (positions match roofFloor()) */
export const ROOF_EQUIPMENT: readonly RoofEquipment[] = [
  tower("CT-01", 11),
  tower("CT-02", 18),
  tower("CT-03", 25),
  pumpUnit("P-01", 18),
  pumpUnit("P-02", 19.5),
  pumpUnit("P-03", 21),
  pumpUnit("P-04", 22.5),
  tank("T-01", 21.5),
  tank("T-02", 27),
  fan("EF-01", 7),
  fan("EF-02", 9),
  fan("EF-03", 11),
];

/** Chillers of the central plant on its pad (top at y 1.0): long axis along x, west → east */
export const CHILLERS = [
  { id: "CH-01", x: 56, z: -26 },
  { id: "CH-02", x: 56, z: -20 },
  { id: "CH-03", x: 56, z: -14 },
] as const;
export const PLANT_PAD_Y = 1.0;

export const isRoofEquipment = (id: AssetId): id is RoofEquipmentId => /^(CT|P|T|EF)-\d\d$/.test(id);
export const roofEquipment = (id: RoofEquipmentId) => ROOF_EQUIPMENT.find((e) => e.id === id)!;

/** Point just above a rooftop unit: where its alarm beacon sits and the camera looks */
export const equipmentTop = (e: RoofEquipment): Vec3 => [e.x, ROOF_Y + e.size[1] + 0.6, e.z];

const ROOF_ASSETS = Object.fromEntries(
  ROOF_EQUIPMENT.map((e) => [
    e.id,
    {
      id: e.id,
      name: e.name,
      code: e.code,
      health: e.health,
      status: "ok",
      position: [e.x, ROOF_Y + e.size[1] / 2, e.z],
      focusDistance: 75,
    } satisfies AssetInfo,
  ]),
) as Record<RoofEquipmentId, AssetInfo>;

export const ASSETS: Record<AssetId, AssetInfo> = {
  ...ROOF_ASSETS,
  site: {
    id: "site",
    name: "PRM Hospitality · Whole property",
    code: "PRM-SITE-01",
    health: 96.8,
    status: "ok",
    position: [0, 77, 0],
  },
  hotel: {
    id: "hotel",
    name: "Hotel tower · 600 keys",
    code: "PRM-HT-SPACE",
    health: 96.8,
    status: "ok",
    position: [31, 118, 3],
  },
  mall: {
    id: "mall",
    name: "Retail podium",
    code: "PRM-RP-SPACE",
    health: 96.8,
    status: "ok",
    position: [-31, 19, 26],
  },
  plant: {
    id: "plant",
    name: "CH-01 · Central plant",
    code: "PRM-CP-HVAC-CH-01",
    health: 88,
    status: "warn",
    position: [56, 6, -26],
  },
  ahu: {
    id: "ahu",
    name: "AHU-H12 · Hotel ventilation",
    code: "PRM-H12-HVAC-AHU-12",
    health: 86,
    status: "warn",
    position: [-12, 78, 3],
  },
  arrival: {
    id: "arrival",
    name: "Arrival & skywalk",
    code: "PRM-AR-SPACE",
    health: 96.8,
    status: "ok",
    position: [-5, 14, 23],
  },
};

/** Fixed AHU-H12 sensor readings (prototype L363) */
export const AHU_READINGS = { supplyAir: 17.8, targetBand: "14–16", filterDp: 180 };
export const CHILLER_COP = 5.2;
export const CONNECTED_FEEDS = 12;
