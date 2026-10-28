import { beforeEach, describe, expect, it } from "vitest";
import { SCENE_IDS, WORKSPACE } from "@/data/nav";
import { isRoofEquipment } from "@/data/assets";
import { plantAlarm } from "@/data/events";
import { ROOF_TILT, VIEW_IDS } from "@/data/views";
import {
  askContextLabel,
  floorPower,
  roomCounts,
  selectAir,
  selectAssetCard,
  selectCases,
  selectEnergy,
  selectGuests,
  selectKpis,
} from "./selectors";
import type { AssetId } from "@/types";
import { useAppStore } from "./useAppStore";

const store = useAppStore;
const s = () => store.getState();
const selectAssetCardHotel = () => selectEnergy(s()).hotel;

beforeEach(() => s().resetDemo());

describe("KPIs at t0", () => {
  it("match the prototype: 84 % / 2,616 kW / 27,840 / 3 (1 high)", () => {
    const k = selectKpis(s());
    expect(k.occupancy.value).toBe(84);
    expect(k.occupancy.occupied).toBe(504);
    expect(Math.round(k.demand.value)).toBe(2616);
    expect(k.footfall.value).toBe(27840);
    expect(k.incidents.value).toBe(3);
    expect(k.incidents.high).toBe(1);
    expect(k.demand.trend.at(-1)).toBe(k.demand.value);
  });
});

describe("Overview widgets", () => {
  it("counts cases: 3 open at t0, then pending and resolved as they move on", () => {
    expect(selectCases(s().incidents)).toEqual({ open: 3, pending: 0, active: 3, resolved: 0 });
    s().advanceIncident("INC-001");
    s().advanceIncident("INC-002");
    s().advanceIncident("INC-002");
    expect(selectCases(s().incidents)).toEqual({ open: 1, pending: 2, active: 3, resolved: 0 });
    s().advanceIncident("INC-001");
    s().advanceIncident("INC-001");
    expect(selectCases(s().incidents)).toMatchObject({ active: 2, resolved: 1 });
    expect(selectKpis(s()).incidents.active).toBe(selectKpis(s()).incidents.value);
  });

  it("compares indoor and outdoor air from the same clock", () => {
    const air = selectAir(s());
    expect(air).toMatchObject({ outdoor: { aqi: 74 }, indoor: { aqi: 13 }, ahuOk: true });
    expect(air.trend.indoor.at(-1)).toBe(air.indoor.aqi);
  });
});

describe("setView", () => {
  it("opens Back of House over the chiller plant; the roof (H30) is seen north up and tilted", () => {
    s().setView("boh");
    expect(s().camera.shot).toEqual({ preset: "chillers" });
    s().selectFloor("H29");
    s().selectFloor("H30");
    expect(s().camera.shot).toEqual({ floor: "H30", tilt: ROOF_TILT });
  });

  it("focuses the chiller-plant alarm when Back of House opens, so the 3D card and the workflow agree", () => {
    s().setView("boh");
    expect(s().incidentFocus).toBe("INC-003");
    expect(plantAlarm(s().incidents, s().incidentFocus)?.id).toBe("INC-003");
    // A new rooftop alarm takes over the card
    const id = s().simulateIncident("ctTrip");
    expect(plantAlarm(s().incidents, s().incidentFocus)?.id).toBe(id);
  });

  it("opens a chiller up and closes it again, back to the scene's shot", () => {
    s().setView("boh");
    s().openChiller(0);
    expect(s()).toMatchObject({ chillerView: 0, asset: "plant" });
    expect(s().camera.shot).toMatchObject({ focus: [56, 2.6, -26] });
    s().openChiller(null);
    expect(s().chillerView).toBeNull();
    expect(s().camera.shot).toEqual({ preset: "chillers" });
    // Changing scene never leaves a chiller open
    s().openChiller(2);
    s().setView("overview");
    expect(s().chillerView).toBeNull();
  });

  it("recognises rooftop units by id", () => {
    expect(["CT-02", "P-03", "T-01", "EF-03"].every((id) => isRoofEquipment(id as AssetId))).toBe(true);
    expect(["plant", "ahu", "hotel"].some((id) => isRoofEquipment(id as AssetId))).toBe(false);
  });

  it("lists the workspace pages and the five scenes in menu order", () => {
    expect(WORKSPACE.map((n) => n.id)).toEqual(["executive", "twin", "ioc", "energy", "ai"]);
    expect(SCENE_IDS).toEqual(["overview", "rooms", "public", "boh", "ai"]);
    // Every menu entry is a view, and every view is in a menu
    expect(new Set([...WORKSPACE.map((n) => n.id), ...SCENE_IDS])).toEqual(new Set(VIEW_IDS));
  });

  it("keeps an injected alarm on the IOC page instead of switching scene", () => {
    s().setView("ioc");
    s().simulateIncident("ctTrip");
    expect(s().view).toBe("ioc");
  });

  it("applies the scene's hero shot and state", () => {
    const n = s().camera.n;
    s().setView("rooms");
    expect(s()).toMatchObject({ view: "rooms", mode: "slice", floor: "H12", asset: "hotel", panel: "details" });
    expect(s().camera).toEqual({ shot: { floor: "H12", top: true }, n: n + 1 });
    // Another floor in the scene keeps the plan view
    s().selectFloor("H14");
    expect(s().camera.shot).toEqual({ floor: "H14", top: true });

    s().setView("public");
    expect(s()).toMatchObject({ mode: "slice", floor: "G" });
    expect(s().camera.shot).toEqual({ floor: "G", top: true });

    // The central plant is on the ground: nothing is cut, and the assistant's context names the plant, not a floor
    s().setView("boh");
    expect(s()).toMatchObject({ mode: "exterior", floor: "all", asset: "plant" });
    expect(askContextLabel(s())).toContain("CH-01 · Central plant");
    // A rooftop alarm opens the roof while it is in focus; the chiller alarm brings the whole building back
    const ct = s().simulateIncident("ctTrip");
    expect(s()).toMatchObject({ mode: "slice", floor: "H30", incidentFocus: ct });
    s().focusIncident("INC-003");
    expect(s()).toMatchObject({ mode: "exterior", floor: "all" });

    s().setView("ai");
    expect(s()).toMatchObject({ mode: "exterior", floor: "all", panel: "agent" });
  });

  it("starts on overview in daylight with auto-rotate", () => {
    expect(s()).toMatchObject({ view: "overview", timeOfDay: "day", autoRotate: true });
  });

  it("slices H12 when Slice is chosen with no floor", () => {
    s().setView("ai");
    s().setMode("slice");
    expect(s()).toMatchObject({ mode: "slice", floor: "H12", zone: "hotel" });
  });
});

describe("simulation", () => {
  it("ticks one minute and 23 entries, and wraps the day at 23:59", () => {
    s().tick();
    expect(s().time).toBeCloseTo(14.5 + 1 / 60);
    expect(s().footfall).toBe(27863);
    store.setState({ time: 23.98 });
    s().tick();
    expect(s().time).toBe(6);
  });

  it("moves footfall and demand with the timeline", () => {
    s().setTime(9);
    expect(s().footfall).toBeLessThan(27840);
    expect(selectKpis(s()).demand.value).toBeLessThan(2616);
  });

  it("keeps a manual room edit when occupancy changes elsewhere", () => {
    const occupied = s().rooms.find((r) => r.status === "occupied")!;
    s().setRoomStatus(occupied.id, "available");
    s().setScenario({ occupancy: 86 });
    expect(roomCounts(s().rooms).occupied).toBe(516);
    expect(s().rooms.find((r) => r.id === occupied.id)?.status).not.toBe("occupied");
  });

  it("adds each floor's rooms into the floor load and the hotel load", () => {
    const hotel = selectKpis(s()).demand.value;
    expect(hotel).toBeGreaterThan(0);
    const floors = [...new Set(s().rooms.map((r) => r.floor))];
    const sum = floors.reduce((n, f) => n + floorPower(s(), f), 0);
    expect(sum).toBeCloseTo(selectAssetCardHotel(), 6);
    expect(selectAssetCard({ ...s(), floor: "H12" }).metrics[1].value).toBe(floorPower(s(), "H12").toFixed(1));
  });

  it("counts guests in house and today's arrivals", () => {
    const g = selectGuests(s().rooms);
    expect(g.arrivals).toBe(34);
    expect(g.inHouse).toBeGreaterThan(504);
    expect(g.inHouse).toBeLessThanOrEqual(504 * 3);
  });

  it("clamps scenario inputs to the lab limits", () => {
    s().setScenario({ setpoint: 40, tariff: -1 });
    expect(s().setpoint).toBe(26);
    expect(s().tariff).toBe(0.1);
  });
});

describe("incident workflow", () => {
  it("creates a work order on Dispatch and completes it on Resolve", () => {
    s().advanceIncident("INC-001");
    s().advanceIncident("INC-001");
    expect(s().workOrders).toMatchObject([{ id: "WO-001", incidentId: "INC-001", status: "Assigned" }]);
    s().advanceIncident("INC-001");
    expect(s().workOrders[0].status).toBe("Completed");
    expect(selectKpis(s()).incidents).toMatchObject({ value: 2, high: 0 });
    s().advanceIncident("INC-001");
    expect(s().incidents.find((e) => e.id === "INC-001")?.status).toBe(3);
  });

  it("injects the cooling tower fan trip first, as INC-004 on CT-02", () => {
    const id = s().simulateIncident();
    expect(id).toBe("INC-004");
    expect(s().incidents[0]).toMatchObject({
      device: "CT-02",
      priority: "high",
      status: 0,
      time: "14:30",
      sop: "ctTrip",
      reading: { value: "0 A" },
    });
  });

  it("raises an incoming alert that opens Back of House and flies to the unit", () => {
    s().setView("ai");
    const id = s().simulateIncident("leak");
    const tank = s().incidents[0].position;
    expect(s()).toMatchObject({ view: "boh", alert: { id }, incidentFocus: id, camera: { shot: { focus: tank } } });
    s().openModal({ kind: "event", id });
    expect(s().alert).toBeNull();
    s().simulateIncident();
    s().dismissAlert();
    expect(s().alert).toBeNull();
  });
});

describe("Back of House alarms", () => {
  it("injects each scenario by name and opens the scene that shows it", () => {
    s().simulateIncident("pumpVibration");
    expect(s().incidents[0]).toMatchObject({ device: "P-03", priority: "low" });
    expect(s().view).toBe("boh");
    s().setView("overview");
    s().simulateIncident("chwsHigh");
    // The chiller is on the ground plant, visible from any scene
    expect(s().view).toBe("overview");
    expect(s().incidents[0]).toMatchObject({ device: "plant", sop: "chwsHigh" });
    s().simulateIncident("crowd");
    expect(s().view).toBe("public");
  });

  it("focuses the alarmed unit from the list, closer than a normal pick", () => {
    const id = s().simulateIncident("ctTrip");
    s().setView("overview");
    s().focusIncident(id);
    expect(s()).toMatchObject({ asset: "CT-02", incidentFocus: id, camera: { shot: { distance: 75 } } });
  });

  it("ticks SOP steps per alarm and clears them on reset", () => {
    s().toggleSopStep("INC-002", 0);
    s().toggleSopStep("INC-002", 2);
    s().toggleSopStep("INC-002", 0);
    expect(s().sopChecks).toEqual({ "INC-002": [2] });
    s().resetDemo();
    expect(s().sopChecks).toEqual({});
  });
});

describe("assistant", () => {
  it("answers from live state and opens the agent tab", () => {
    s().setScenario({ setpoint: 25 });
    s().ask("ค่าไฟวันนี้");
    expect(s().panel).toBe("agent");
    expect(s().chat).toHaveLength(2);
    const reply = s().chat[1];
    expect(reply.role === "assistant" && reply.data).toContain("2,550 kW");
  });

  it("describes the selected floor", () => {
    s().selectFloor("H12");
    expect(selectAssetCard(s()).metrics[0]).toMatchObject({ label: "Occupied", unit: "/ 28" });
  });

  it("stamps each answer with the scene and clock it came from", () => {
    s().setView("boh");
    s().ask("มีเหตุการณ์อะไรค้างอยู่");
    expect(s().chat[1]).toMatchObject({ role: "assistant", view: "boh", time: "14:30" });
    s().setView("rooms");
    // The context line follows the scene now open, not the old answer
    expect(askContextLabel(s())).toBe("Guest Room › ชั้น H12");
  });

  it("names the picked asset in the context line", () => {
    s().pickAsset("plant");
    expect(askContextLabel(s())).toBe("Overview › CH-01 · Central plant");
  });

  it("locates an incident without changing the scene mode", () => {
    s().setView("ai");
    s().locateIncident("INC-002");
    expect(s()).toMatchObject({
      incidentFocus: "INC-002",
      mode: "exterior",
      camera: { shot: { focus: [-12, 78, 3] } },
    });
  });

  it("opens the floor plan with zone details and closes it on view change", () => {
    s().setView("ai");
    s().setSpatial("plan");
    expect(s()).toMatchObject({ spatial: "plan", panel: "details" });
    s().setPlanType("social");
    expect(s().plan).toEqual({ type: "social", zone: "1" });
    s().setView("rooms");
    expect(s().spatial).toBe("building");
  });

  it("resets everything in one step", () => {
    s().setView("boh");
    s().simulateIncident();
    s().ask("สรุป");
    s().resetDemo();
    expect(s()).toMatchObject({ view: "overview", chat: [], workOrders: [] });
    expect(s().incidents).toHaveLength(3);
  });
});

describe("3D picking", () => {
  it("picks a floor without slicing, then slices it on the second pick", () => {
    s().setView("ai");
    s().pickFloor("H12");
    expect(s()).toMatchObject({ selectedFloor: "H12", mode: "exterior", asset: "hotel", panel: "details" });
    expect(selectAssetCard({ ...s(), floor: "H12" }).name).toBe("H12 · Hotel floor");
    s().selectFloor("H12");
    expect(s()).toMatchObject({ mode: "slice", floor: "H12", selectedFloor: null });
  });

  it("steps floors with [ / ] and stops at the ends", () => {
    s().selectFloor("H01");
    s().stepFloor(-1);
    expect(s().floor).toBe("L4");
    s().selectFloor("H30");
    s().stepFloor(1);
    expect(s().floor).toBe("H30");
  });

  it("frames the exploded building and returns to the whole-building shot", () => {
    s().toggleExplode();
    expect(s()).toMatchObject({ explode: true, mode: "xray", camera: { shot: { preset: "explode" } } });
    s().toggleExplode();
    expect(s()).toMatchObject({ explode: false, mode: "exterior", camera: { shot: { preset: "all" } } });
  });

  it("focuses the camera on a picked asset", () => {
    s().pickAsset("plant");
    expect(s().camera.shot).toEqual({ focus: [56, 6, -26] });
    expect(s().asset).toBe("plant");
  });
});
