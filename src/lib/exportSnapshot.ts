// "Export snapshot": download the simulated state as JSON (prototype L409).
// Local file only — nothing leaves the machine.
import { roomCounts, selectEnergy } from "@/store/selectors";
import type { AppState } from "@/store/useAppStore";
import { timeStr } from "./format";

export function exportSnapshot(s: AppState) {
  const payload = {
    project: "PRM Hospitality",
    purpose: "CONCEPT DEMO ONLY",
    exportedAt: new Date().toISOString(),
    disclaimer:
      "All operational values, assets and floor layouts are simulated. Not a BIM/as-built model or live system.",
    scenario: {
      time: timeStr(s.time),
      setpoint: s.setpoint,
      outdoor: s.outdoor,
      tariffAssumption: s.tariff,
      operatingHoursAssumption: s.operatingHours,
      hotelCounts: roomCounts(s.rooms),
      energy: selectEnergy(s),
      mallEntryCounts: s.footfall,
    },
    selection: { view: s.view, floor: s.floor, viewMode: s.mode, layers: s.layers },
    events: s.incidents,
    workOrders: s.workOrders,
    hotelRooms: s.rooms,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "PRMHospitality_Demo_Snapshot.json";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
