import { beforeEach, describe, expect, it } from "vitest";
import { SHOWCASES } from "@/data/showcase";
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

  it("starts on overview in daylight with auto-rotate", () => {
    expect(s()).toMatchObject({ view: "overview", timeOfDay: "day", autoRotate: true });
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

  it("raises an incoming alert that flies to the incident and clears when it is opened", () => {
    s().setView("energy");
    const id = s().simulateIncident();
    expect(s()).toMatchObject({ alert: { id }, incidentFocus: id, camera: { shot: { focus: [56, 4, -12] } } });
    s().openModal({ kind: "event", id });
    expect(s().alert).toBeNull();
    s().simulateIncident();
    s().dismissAlert();
    expect(s().alert).toBeNull();
  });
});

describe("assistant and showcase", () => {
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

  it("plays every technical beat through to the end and gives the sim data back", () => {
    const before = { time: s().time, footfall: s().footfall, rooms: s().rooms };
    s().startShowcase({ path: "technical" });
    expect(s().showcase).toMatchObject({ path: "technical", chapter: 0, beat: 0, playing: true });
    const seen = new Set<string>();
    const steps = new Set<number>();
    let drilled = false;
    let presented = false;
    for (let i = 0; i < 400 && s().showcase; i++) {
      seen.add(s().view);
      steps.add(s().incidents.find((e) => e.id === "INC-001")?.status ?? -1);
      if (s().incidents.length === 4) drilled = true;
      if (s().presentation) presented = true;
      s().nextBeat();
    }
    expect(s().showcase).toBeNull();
    expect([...seen].sort()).toEqual(["ai", "energy", "hotel", "ioc", "overview", "twin"]);
    expect([...steps].sort()).toEqual([0, 1, 2, 3]);
    expect(drilled && presented).toBe(true);
    expect(s().toast?.text).toContain("จบการสาธิต");
    // Showcase changes are demonstrations only
    expect(s()).toMatchObject({ setpoint: 24, outdoor: 32, tariff: 4.5, chat: [], workOrders: [], modal: null });
    expect(s()).toMatchObject({ presentation: false, time: before.time, footfall: before.footfall });
    expect(s().rooms).toBe(before.rooms);
    expect(s().incidents).toHaveLength(3);
    expect(s().incidents.every((e) => e.status === 0)).toBe(true);
  });

  it("walks the executive path through all six views and an incident to resolved", () => {
    s().startShowcase();
    expect(s().showcase?.path).toBe("executive");
    const seen = new Set<string>();
    let resolved = false;
    for (let i = 0; i < 200 && s().showcase; i++) {
      seen.add(s().view);
      if (s().incidents.some((e) => e.id === "INC-004" && e.status === 3)) resolved = true;
      s().nextBeat();
    }
    expect([...seen].sort()).toEqual(["ai", "energy", "hotel", "ioc", "overview", "twin"]);
    expect(resolved).toBe(true);
    expect(s().incidents).toHaveLength(3);
  });

  it("jumps straight to any chapter with its own view", () => {
    s().startShowcase({ path: "technical" });
    const SHOWCASE = SHOWCASES.technical;
    const energy = SHOWCASE.findIndex((c) => c.id === "energy");
    s().goToChapter(energy);
    expect(s()).toMatchObject({ view: "energy", showcase: { chapter: energy, beat: 0 } });
    s().nextBeat();
    expect(s().setpoint).toBe(25);
    s().goToChapter(SHOWCASE.findIndex((c) => c.id === "floors"));
    expect(s()).toMatchObject({ view: "twin", mode: "slice", floor: "H12" });
    s().endShowcase();
    expect(s()).toMatchObject({ showcase: null, setpoint: 24 });
  });

  it("loops for attract mode instead of ending", () => {
    s().startShowcase({ loop: true });
    s().goToChapter(SHOWCASES.executive.length);
    expect(s().showcase).toMatchObject({ chapter: 0, loop: true });
    s().endShowcase();
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
    expect(s()).toMatchObject({ view: "overview", chat: [], workOrders: [], showcase: null });
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
