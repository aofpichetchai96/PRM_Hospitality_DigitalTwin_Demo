import { beforeEach, describe, expect, it } from "vitest";
import { roomCounts, selectAssetCard, selectKpis } from "./selectors";
import { useAppStore } from "./useAppStore";

const store = useAppStore;
const s = () => store.getState();

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

describe("setView", () => {
  it("applies the view's hero shot and state", () => {
    const n = s().camera.n;
    s().setView("hotel");
    expect(s()).toMatchObject({ view: "hotel", mode: "slice", floor: "H12", asset: "hotel", panel: "details" });
    expect(s().camera).toEqual({ shot: { floor: "H12" }, n: n + 1 });

    s().setView("energy");
    expect(s().layers.energy).toBe(true);
    expect(s().camera.shot).toEqual({ preset: "plant" });
  });

  it("starts on overview at dusk with auto-rotate", () => {
    expect(s()).toMatchObject({ view: "overview", timeOfDay: "dusk", autoRotate: true });
  });

  it("slices H12 when Slice is chosen with no floor", () => {
    s().setView("twin");
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
    const cleaning = s().rooms.find((r) => r.status === "cleaning")!;
    s().setRoomStatus(cleaning.id, "ready");
    s().setScenario({ occupancy: 86 });
    expect(roomCounts(s().rooms).occupied).toBe(516);
    expect(roomCounts(s().rooms).cleaning).toBe(27);
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

  it("simulates a leak as INC-004", () => {
    const id = s().simulateIncident();
    expect(id).toBe("INC-004");
    expect(s().incidents[0]).toMatchObject({ type: "leak", priority: "high", status: 0, time: "14:30" });
  });
});

describe("assistant and tour", () => {
  it("answers from live state and opens the agent tab", () => {
    s().setScenario({ setpoint: 25 });
    s().ask("ค่าไฟวันนี้");
    expect(s().panel).toBe("agent");
    expect(s().chat).toHaveLength(2);
    expect(s().chat[1].text).toContain("2,550 kW");
  });

  it("describes the selected floor", () => {
    s().selectFloor("H12");
    expect(selectAssetCard(s()).metrics[0]).toMatchObject({ label: "Occupied", unit: "/ 28" });
  });

  it("walks the MVP tour and ends with a toast", () => {
    s().startTour("mvp");
    expect(s()).toMatchObject({ view: "twin", tour: { step: 0 } });
    s().goToTourStep(1);
    expect(s().mode).toBe("xray");
    s().goToTourStep(3);
    expect(s()).toMatchObject({ view: "hotel", floor: "H12" });
    s().goToTourStep(4);
    expect(s().tour).toBeNull();
    expect(s().toast?.text).toContain("จบ Guided Demo");
  });

  it("runs the full six-step tour by default, through IOC and AI", () => {
    s().startTour();
    const views = [0, 1, 2, 3, 4, 5].map((i) => {
      s().goToTourStep(i);
      return s().view;
    });
    expect(views).toEqual(["twin", "twin", "ioc", "energy", "hotel", "ai"]);
  });

  it("locates an incident without changing the scene mode", () => {
    s().setView("ioc");
    s().locateIncident("INC-002");
    expect(s()).toMatchObject({
      incidentFocus: "INC-002",
      mode: "exterior",
      camera: { shot: { focus: [-12, 78, 3] } },
    });
  });

  it("opens the floor plan with zone details and closes it on view change", () => {
    s().setView("twin");
    s().setSpatial("plan");
    expect(s()).toMatchObject({ spatial: "plan", panel: "details" });
    s().setPlanType("social");
    expect(s().plan).toEqual({ type: "social", zone: "1" });
    s().setView("hotel");
    expect(s().spatial).toBe("building");
  });

  it("resets everything in one step", () => {
    s().setView("ioc");
    s().simulateIncident();
    s().ask("สรุป");
    s().resetDemo();
    expect(s()).toMatchObject({ view: "overview", chat: [], workOrders: [], tour: null });
    expect(s().incidents).toHaveLength(3);
  });
});

describe("3D picking", () => {
  it("picks a floor without slicing, then slices it on the second pick", () => {
    s().setView("twin");
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
    expect(s().camera.shot).toEqual({ focus: [58, 6, -18] });
    expect(s().asset).toBe("plant");
  });
});
