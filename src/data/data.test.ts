import { describe, expect, it } from "vitest";
import { ASSETS } from "./assets";
import { comfortRisk, computeEnergy, FOOTFALL_BY_ZONE, footfallAt, REFERENCE_FOOTFALL } from "./energy";
import { INITIAL_INCIDENTS, SCENARIOS } from "./events";
import { FLOOR_PLANS } from "./floorPlans";
import { FLOORS, GUEST_FLOORS, SITE_BOUNDS, TOTAL_KEYS } from "./property";
import {
  adjustOccupancy,
  generateRooms,
  PRECOOL_KW,
  roomControl,
  roomPowers,
  roomStay,
  roomTrend,
  STANDBY_KW,
} from "./rooms";
import { ANNUAL_ENERGY_SAVING_THB, ROADMAP, VALUE_METRICS } from "./value";

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
  it("has three statuses at 84 %: 504 occupied / 34 reserved / 62 available", () => {
    const rooms = generateRooms(84);
    expect(rooms).toHaveLength(600);
    expect([count(rooms, "occupied"), count(rooms, "reserved"), count(rooms, "available")]).toEqual([504, 34, 62]);
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
    // Booked guests arrive before walk-ins take vacant rooms
    expect(count(up, "reserved")).toBe(0);
    const down = adjustOccupancy(up, 50);
    expect(count(down, "occupied")).toBe(300);
    expect(count(down, "available")).toBe(300);
    expect(count(adjustOccupancy(rooms, 100), "occupied")).toBe(600);
  });
});

describe("room stays and energy", () => {
  const rooms = generateRooms(84);

  it("gives every booked room a stay and none to vacant rooms, the same every time", () => {
    for (const r of rooms) {
      const stay = roomStay(r);
      if (r.status === "available") expect(stay).toBeNull();
      else {
        expect(stay!.guests).toBeGreaterThanOrEqual(1);
        expect(stay!.guests).toBeLessThanOrEqual(3);
        expect(stay!.expected).toBe(r.status === "reserved");
        expect(stay!.checkOut.day).toBeGreaterThan(stay!.checkIn.day);
        // In-house guests arrived before now (14:30)
        if (r.status === "occupied") expect(stay!.checkIn.day * 24 + stay!.checkIn.hour).toBeLessThanOrEqual(14.5);
      }
    }
    expect(roomStay(rooms[0])).toEqual(roomStay(rooms[0]));
  });

  it("splits the hotel load over the 600 rooms so they add up exactly", () => {
    const kw = roomPowers(rooms, 756);
    const total = [...kw.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(756, 6);
    const reserved = rooms.find((r) => r.status === "reserved")!;
    const available = rooms.find((r) => r.status === "available")!;
    expect(kw.get(reserved.id)).toBe(PRECOOL_KW);
    expect(kw.get(available.id)).toBe(STANDBY_KW);
    const occupied = rooms.filter((r) => r.status === "occupied").map((r) => kw.get(r.id)!);
    expect(Math.min(...occupied)).toBeGreaterThan(1);
    expect(Math.max(...occupied)).toBeLessThan(2);
  });

  it("ends each room trend at its live value and reports the GRMS state", () => {
    const occupied = rooms.find((r) => r.status === "occupied")!;
    expect(roomTrend(occupied, 14.5, 1.4).at(-1)).toBeCloseTo(1.4);
    expect(roomControl({ id: "x", status: "available" }, 14.5, 24).hvac).toContain("Eco");
    expect(roomControl({ id: "x", status: "reserved" }, 14.5, 24).hvac).toContain("Pre-cool");
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
      ...Object.values(SCENARIOS).map((e) => e.position),
    ])
      expect(inside(p)).toBe(true);
  });

  it("has unique ids", () => {
    expect(unique(INITIAL_INCIDENTS.map((e) => e.id))).toBe(true);
    for (const p of Object.values(FLOOR_PLANS)) expect(unique(p.zones.map((z) => z.id))).toBe(true);
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
