import { describe, expect, it } from "vitest";
import { lobbyCrowd, PEOPLE_PER_FIGURE } from "./lobbyLife";
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
