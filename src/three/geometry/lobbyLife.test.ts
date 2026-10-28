import { describe, expect, it } from "vitest";
import { G_PLATE, lobbyCrowd, mallCrowd, PEOPLE_PER_FIGURE } from "./lobbyLife";
import { LOBBY_FLOOR_Y, personAt, routeLength } from "./traffic";

const counts = { entrance: 24, lounge: 73, reception: 41, liftHall: 40, retailLink: 24 };
const inside = (x: number, z: number) => x > -43 && x < 43 && z > -25 && z < 24.45;

describe("lobby crowd", () => {
  it("draws one figure per few people of each zone", () => {
    const crowd = lobbyCrowd(counts);
    const total = Object.values(counts).reduce((n, v) => n + Math.round(v / PEOPLE_PER_FIGURE), 0);
    expect(crowd).toHaveLength(total);
  });

  it("keeps figure k of a zone the same person as the count changes", () => {
    const a = lobbyCrowd(counts);
    const b = lobbyCrowd({ ...counts, entrance: 60 });
    // Entrance comes first; its first figures don't move when more arrive
    expect(b.slice(0, 6)).toEqual(a.slice(0, 6));
  });

  it("stands at the reception counter and in its queue, and waits facing the lifts", () => {
    const crowd = lobbyCrowd(counts);
    const standing = crowd.filter((p) => p.route.length === 1);
    const queue = standing.filter(({ route: [[x, , z]] }) => z > 12.5 && z < 16.8 && Math.abs(x + 25) < 0.3);
    expect(queue.length).toBeGreaterThanOrEqual(4);
    expect(standing.filter((p) => p.route[0][2] < 1 && p.route[0][0] > 3 && p.yaw! > 2).length).toBeGreaterThan(4);
  });

  it("walks and stands on the lobby floor, indoors only", () => {
    for (const p of lobbyCrowd(counts)) {
      const length = routeLength(p.route);
      for (let t = 0; t < 60; t += 1.3) {
        const { d } = personAt(p, length, t);
        expect(d).toBeLessThanOrEqual(length + 1e-6);
      }
      for (const q of p.route) {
        expect(q[1]).toBe(LOBBY_FLOOR_Y);
        expect(inside(q[0], q[2]), String(q)).toBe(true);
      }
    }
  });
});

describe("rest of the G floor", () => {
  it("puts shoppers in all three shops, staff in the back rooms, and everyone inside the walls", () => {
    const crowd = mallCrowd();
    const at = (p: (typeof crowd)[number]) => p.route.at(-1)!;
    for (const [x0, x1] of [
      [1, 13],
      [13, 25],
      [25, 37],
    ])
      expect(crowd.filter((p) => at(p)[0] > x0 && at(p)[0] < x1 && at(p)[2] > 9.5).length).toBeGreaterThan(3);
    expect(crowd.filter((p) => at(p)[2] < -16).length).toBeGreaterThanOrEqual(4);
    for (const p of crowd)
      for (const [x, y, z] of p.route) {
        expect(y).toBe(LOBBY_FLOOR_Y);
        expect(x > G_PLATE.x0 && x < G_PLATE.x1 && z > G_PLATE.z0 && z < G_PLATE.z1, `${x},${z}`).toBe(true);
      }
  });
});
