import { describe, expect, it } from "vitest";
import { vehicleModels } from "./ambientModels";
import { SITE, X_ROADS, Z_ROADS } from "./city";
import { LOBBY_DOORS } from "./interiors";
import {
  CROSSWALK_CYCLE,
  CROSSWALK_HOLD,
  crosswalkOpen,
  LOBBY_FLOOR_Y,
  people,
  personAt,
  roadY,
  routeLength,
  signalFor,
  TRAFFIC_RADIUS,
  trafficLanes,
} from "./traffic";

const roadOf = (z: number) => Z_ROADS.find((r) => Math.abs(z - r.z) <= r.w / 2);

describe("ambient traffic", () => {
  const lanes = trafficLanes();

  it("keeps every lane on a road and off the site, except the avenue in front of it", () => {
    for (const l of lanes) {
      if (l.axis === "z") {
        expect(X_ROADS.some((x) => Math.abs(l.at - x) === 3.5)).toBe(true);
        expect(l.at < SITE.x0 || l.at > SITE.x1).toBe(true);
      } else {
        expect(roadOf(l.at), `lane at z ${l.at}`).toBeDefined();
        if (l.at > SITE.z0 && l.at < SITE.z1) expect(roadOf(l.at)?.z).toBe(54);
      }
    }
  });

  it("drives on the left, mixes vehicle kinds and stays a light load", () => {
    for (const l of lanes) if (l.axis === "x") expect(Math.sign(l.at - roadOf(l.at)!.z)).toBe(-l.dir);
    const all = lanes.flatMap((l) => l.vehicles);
    expect(all.length).toBeGreaterThan(150);
    expect(all.length).toBeLessThan(500);
    expect(new Set(all.map((v) => v.kind)).size).toBe(8);
    for (const v of all) expect(v.offset).toBeLessThan(TRAFFIC_RADIUS * 2 + 30);
  });

  it("never shows green both ways, and holds the avenue while people cross", () => {
    for (let t = 0; t < 60; t += 0.5)
      expect(signalFor("x", t) === "green" && signalFor("z", t) === "green").toBe(false);
    expect(crosswalkOpen(1)).toBe(true);
    expect(crosswalkOpen(CROSSWALK_HOLD + 1)).toBe(false);
    // Every crosser is across before the avenue runs again
    for (const p of people().filter((x) => x.crossing))
      expect(p.crossing!.delay + routeLength(p.route) / p.speed).toBeLessThan(CROSSWALK_HOLD);
    expect(CROSSWALK_CYCLE).toBeGreaterThan(CROSSWALK_HOLD);
  });

  it("puts vehicles on the plinth road over the site and on street level outside it", () => {
    expect(roadY(0, 54)).toBeCloseTo(-0.08);
    expect(roadY(300, 54)).toBeCloseTo(-0.6);
    expect(roadY(0, -100)).toBeCloseTo(-0.6);
  });

  it("builds every vehicle model with unit normals", () => {
    for (const [kind, model] of vehicleModels())
      for (const g of [model.body, model.lamps]) {
        const n = g.getAttribute("normal").array;
        for (let i = 0; i < n.length; i += 3)
          expect(Math.abs(Math.hypot(n[i], n[i + 1], n[i + 2]) - 1), kind).toBeLessThan(1e-3);
      }
  });
});

describe("pedestrians", () => {
  const crowd = people();

  it("walks people to the arrival doors, along the plaza, over the zebra and the skywalk, and some stand", () => {
    expect(crowd.length).toBeGreaterThanOrEqual(60);
    // Through one of the G doors, one step onto the lobby floor
    const inside = crowd.filter((p) => p.route.some((q) => q[2] === 23.2 && q[1] === LOBBY_FLOOR_Y));
    expect(inside.length).toBeGreaterThan(20);
    for (const p of inside) {
      const x = p.route.at(-1)![0];
      expect(LOBBY_DOORS.some((d) => x > d.x0 && x < d.x1)).toBe(true);
    }
    expect(crowd.filter((p) => p.crossing).length).toBeGreaterThan(5);
    expect(crowd.filter((p) => p.route.length === 1).length).toBeGreaterThan(4);
  });

  it("goes out, waits, comes back and stays on the route", () => {
    const p = crowd.find((x) => !x.crossing && x.route.length > 1)!;
    const length = routeLength(p.route);
    for (let t = 0; t < 200; t += 0.7) {
      const s = personAt(p, length, t);
      expect(s.d).toBeGreaterThanOrEqual(0);
      expect(s.d).toBeLessThanOrEqual(length + 1e-6);
    }
  });
});
