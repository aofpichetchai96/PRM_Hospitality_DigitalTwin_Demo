// Selectable assets (prototype assetHtml L363). Live metrics are derived in
// store/selectors.ts because they depend on rooms, energy and incidents.
import type { AssetId, AssetInfo } from "@/types";

export const ASSETS: Record<AssetId, AssetInfo> = {
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
    position: [58, 6, -18],
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
