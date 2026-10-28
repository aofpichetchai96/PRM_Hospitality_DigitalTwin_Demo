import { describe, expect, it } from "vitest";
import { SCENARIOS } from "./events";
import { entranceCounts, hourlyEntrance, PUBLIC_ZONES, zoneReadings } from "./publicZones";

describe("public area", () => {
  it("names the five lobby zones and keeps them on the G plate", () => {
    expect(PUBLIC_ZONES.map((z) => z.name)).toEqual([
      "Entrance",
      "Lobby lounge",
      "Reception",
      "Lift hall",
      "Retail link",
    ]);
    expect(PUBLIC_ZONES.reduce((n, z) => n + z.atT0, 0)).toBe(entranceCounts(14.5).inside);
    for (const { rect } of PUBLIC_ZONES) {
      expect(rect.x0).toBeGreaterThanOrEqual(-43);
      expect(rect.x1).toBeLessThanOrEqual(43);
      expect(rect.z0).toBeGreaterThanOrEqual(-25);
      expect(rect.z1).toBeLessThanOrEqual(25);
    }
  });

  it("is fixed at t0 and nobody is crowded yet", () => {
    const e = entranceCounts(14.5);
    expect(e).toEqual({ in: 4280, out: 4280 - e.inside, inside: 202 });
    const zones = zoneReadings(14.5, 0.84);
    expect(zones.every((z) => z.level !== "crowded")).toBe(true);
    // Doors let some outdoor air in: the entrance reads worse than the lift hall
    const [entrance, , , liftHall] = zones;
    expect(entrance.air.pm25).toBeGreaterThan(liftHall.air.pm25);
  });

  it("gives each zone a believable load for its time of day", () => {
    const at = (time: number) => Object.fromEntries(zoneReadings(time, 0.84).map((z) => [z.zone.id, z]));
    const t0 = at(14.5);
    // Check-in under way: reception is the busiest; people pass the entrance quickly
    expect(t0.reception.level).toBe("high");
    expect(t0.entrance.level).toBe("low");
    expect(Object.values(t0).map((z) => z.people)).toEqual(PUBLIC_ZONES.map((z) => z.atT0));
    // The retail link is quiet before the mall opens; the lifts are busy at the breakfast rush
    expect(at(7.5).retailLink.load).toBeLessThan(at(13).retailLink.load / 3);
    expect(at(8).liftHall.load).toBeGreaterThan(at(8).lounge.load);
  });

  it("packs the lounge to the level the crowd alarm reports", () => {
    const lounge = zoneReadings(14.5, 0.84, true)[1];
    expect(lounge.level).toBe("crowded");
    expect(`${Math.round(lounge.load * 100)}%`).toBe(SCENARIOS.crowd.reading?.value);
  });

  it("adds the hourly entrance counts up to the day total", () => {
    const hours = hourlyEntrance(14.5);
    expect(hours[0].hour).toBe(6);
    expect(hours.at(-1)?.hour).toBe(14);
    expect(hours.reduce((n, h) => n + h.in, 0)).toBe(entranceCounts(14.5).in - entranceCounts(6).in);
  });
});
