import { describe, expect, it } from "vitest";
import { answerQuestion, type AskContext } from "./aiScript";
import { ASSETS } from "./assets";
import { comfortRisk, computeEnergy, FOOTFALL_BY_ZONE, footfallAt, REFERENCE_FOOTFALL } from "./energy";
import { INITIAL_INCIDENTS, SIMULATED_INCIDENTS } from "./events";
import { FLOOR_PLANS } from "./floorPlans";
import { FLOORS, GUEST_FLOORS, SITE_BOUNDS, TOTAL_KEYS } from "./property";
import { adjustOccupancy, generateRooms } from "./rooms";
import { SHOWCASES } from "./showcase";
import { ANNUAL_ENERGY_SAVING_THB, ROADMAP, VALUE_METRICS } from "./value";
import { VIEWS } from "./views";

const count = (rooms: { status: string }[], status: string) => rooms.filter((r) => r.status === status).length;
const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe("floor schedule", () => {
  it("holds 600 keys on 23 guest floors (19 × 28 + 4 × 17)", () => {
    expect(GUEST_FLOORS.reduce((n, f) => n + f.rooms, 0)).toBe(TOTAL_KEYS);
    expect(GUEST_FLOORS.filter((f) => f.rooms === 28)).toHaveLength(19);
    expect(GUEST_FLOORS.filter((f) => f.rooms === 17)).toHaveLength(4);
  });

  it("has podium G–L4 and tower H01–H30 with unique ids", () => {
    expect(FLOORS).toHaveLength(35);
    expect(unique(FLOORS.map((f) => f.id))).toBe(true);
    expect(FLOORS.find((f) => f.id === "H12")?.type).toBe("guest");
    expect(FLOORS.find((f) => f.id === "H08")?.type).toBe("skyCourt");
    expect(FLOORS.find((f) => f.id === "H30")?.type).toBe("roof");
  });
});

describe("rooms", () => {
  it("matches the prototype mix at 84 %: 504 / 62 / 28 / 6", () => {
    const rooms = generateRooms(84);
    expect(rooms).toHaveLength(600);
    expect([
      count(rooms, "occupied"),
      count(rooms, "ready"),
      count(rooms, "cleaning"),
      count(rooms, "maintenance"),
    ]).toEqual([504, 62, 28, 6]);
    expect(unique(rooms.map((r) => r.id))).toBe(true);
    expect(rooms.find((r) => r.id === "H12-07")).toBeDefined();
    expect(rooms.find((r) => r.id === "H08-01")).toBeUndefined();
  });

  it("is the same on every load", () => {
    expect(generateRooms(84)).toEqual(generateRooms(84));
  });

  it("changes occupancy without touching unrelated rooms", () => {
    const rooms = generateRooms(84);
    const up = adjustOccupancy(rooms, 90);
    expect(count(up, "occupied")).toBe(540);
    expect(up.filter((r, i) => r.status !== rooms[i].status).length).toBe(36);
    const down = adjustOccupancy(up, 50);
    expect(count(down, "occupied")).toBe(300);
    expect(count(down, "cleaning")).toBe(count(up, "cleaning"));
    expect(count(adjustOccupancy(rooms, 100), "occupied")).toBe(600);
  });
});

describe("energy model", () => {
  const t0 = {
    occupancy: 504 / 600,
    setpoint: 24,
    outdoor: 32,
    tariff: 4.5,
    footfallFactor: 1,
    operatingHours: 16,
  };

  it("gives 2,616 kW at t0 (1,140 + 900 × 0.84 + 720)", () => {
    const e = computeEnergy(t0);
    expect(e.current).toBeCloseTo(2616, 6);
    expect(e.saved).toBeCloseTo(0, 6);
  });

  it("saves 4.5 % of cooling per degree above 24 °C", () => {
    const e = computeEnergy({ ...t0, setpoint: 25 });
    expect(e.saved).toBeCloseTo((2616 - 1140) * 0.045, 6);
    expect(e.dayCost).toBeCloseTo(e.saved * 16 * 4.5, 6);
  });

  it("puts footfall at 27,840 at 14:30 and the zone split sums to it", () => {
    expect(footfallAt(14.5)).toBe(REFERENCE_FOOTFALL);
    expect(FOOTFALL_BY_ZONE.reduce((n, [, v]) => n + v, 0)).toBe(REFERENCE_FOOTFALL);
  });
});

describe("data validation", () => {
  const inside = ([x, y, z]: number[]) =>
    x >= SITE_BOUNDS.min[0] &&
    x <= SITE_BOUNDS.max[0] &&
    y >= SITE_BOUNDS.min[1] &&
    y <= SITE_BOUNDS.max[1] &&
    z >= SITE_BOUNDS.min[2] &&
    z <= SITE_BOUNDS.max[2];

  it("keeps every 3D position inside the site", () => {
    for (const p of [
      ...Object.values(ASSETS).map((a) => a.position),
      ...INITIAL_INCIDENTS.map((e) => e.position),
      ...SIMULATED_INCIDENTS.map((e) => e.position),
    ])
      expect(inside(p)).toBe(true);
  });

  it("has unique ids", () => {
    expect(unique(INITIAL_INCIDENTS.map((e) => e.id))).toBe(true);
    for (const p of Object.values(FLOOR_PLANS)) expect(unique(p.zones.map((z) => z.id))).toBe(true);
  });

  it("showcase chapters open with their own view and point at real ids", () => {
    for (const path of Object.values(SHOWCASES)) expect(unique(path.map((c) => c.id))).toBe(true);
    expect(SHOWCASES.executive.length).toBeLessThanOrEqual(6);
    for (const c of Object.values(SHOWCASES).flat()) {
      expect(c.beats[0].run[0], c.id).toMatchObject({ do: "view" });
      for (const b of c.beats)
        for (const a of b.run) {
          if (a.do === "view") expect(VIEWS[a.view]).toBeDefined();
          if (a.do === "incident" || a.do === "locate" || (a.do === "modal" && a.kind === "event"))
            expect(a.id === "focus" || INITIAL_INCIDENTS.some((e) => e.id === a.id)).toBe(true);
        }
    }
  });
});

describe("assistant script", () => {
  const ctx: AskContext = {
    time: "14:30",
    energy: computeEnergy({
      occupancy: 0.84,
      setpoint: 24,
      outdoor: 32,
      tariff: 4.5,
      footfallFactor: 1,
      operatingHours: 16,
    }),
    counts: { occupied: 504, ready: 62, cleaning: 28, maintenance: 6 },
    footfall: 27840,
    openIncidents: INITIAL_INCIDENTS,
    workOrders: [],
    scenario: { outdoor: 32, setpoint: 24, tariff: 4.5, operatingHours: 16 },
    selection: { label: "อาคารทั้งหมด", assetName: "Site", assetCode: "PRM-SITE-01", metrics: [] },
    plan: { open: false, type: "residence", selectedZone: "A" },
  };

  it.each([
    ["ทำไมค่าไฟสูงวันนี้", "2,616 kW"],
    ["ห้องพักพร้อมขายกี่ห้อง", "พร้อมขาย / ว่าง 62 ห้อง"],
    ["มีเหตุการณ์อะไรค้างอยู่", "3 เหตุการณ์ค้าง"],
    ["สรุปสถานการณ์อาคารวันนี้", "Simulated brief"],
    ["Tell me about the library", "Library gallery"],
    ["ฟาซาดอาคารออกแบบอย่างไร", "ครีบสีขาว"],
  ])("answers %s", (q, expected) => {
    expect(answerQuestion(q, ctx).text).toContain(expected);
  });

  it("falls back to the scripted scope", () => {
    expect(answerQuestion("what is the weather on Mars", ctx).source).toContain("No external AI");
  });
});

describe("sales pages", () => {
  it("rates guest comfort by setpoint", () => {
    expect([24, 25, 25.5, 26].map(comfortRisk)).toEqual(["low", "low", "medium", "high"]);
  });

  it("derives the yearly energy figure from the energy model at 25 °C", () => {
    // Same figure the Energy Lab shows at 25 °C (≈ 4,780 ฿/day at t0) × 365 → ≈ 1.7 M ฿/year
    expect(Math.round(ANNUAL_ENERGY_SAVING_THB / 1e5) / 10).toBe(1.7);
    expect(VALUE_METRICS.find((m) => m.id === "energy")?.after).toContain("1.7 ล้าน ฿");
    expect(ROADMAP).toHaveLength(3);
  });
});
