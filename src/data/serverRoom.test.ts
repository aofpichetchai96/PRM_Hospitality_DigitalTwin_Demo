import { describe, expect, it } from "vitest";
import { inletBand, portStatus, RACK_U, RACKS, serverRoomAt } from "./serverRoom";

describe("server room", () => {
  it("fills every rack within its 42 U without overlaps", () => {
    expect(RACKS).toHaveLength(16);
    for (const r of RACKS) {
      const used = new Set<number>();
      for (const d of r.devices)
        for (let u = d.u; u < d.u + d.height; u++) {
          expect(u, d.id).toBeGreaterThanOrEqual(1);
          expect(u, d.id).toBeLessThanOrEqual(RACK_U);
          expect(used.has(u), `${d.id} overlaps at U${u}`).toBe(false);
          used.add(u);
        }
    }
  });

  it("is fixed at t0: B05 runs warm, two devices are offline, a few ports are in error", () => {
    const room = serverRoomAt(14.5);
    expect(room.hottest.rack.id).toBe("B05");
    expect(inletBand(room.hottest.inlet)).not.toBe("ok");
    expect(room.devices - room.online).toBe(2);
    expect(room.portErrors).toBeGreaterThan(0);
    expect(room.portsUp / room.ports).toBeGreaterThan(0.75);
    expect(room.facilityKw).toBeGreaterThan(room.itKw);
    expect(serverRoomAt(14.5)).toEqual(room);
  });

  it("keeps each port's status, except the few that flap", () => {
    const sw = RACKS[0].devices.find((d) => d.ports)!;
    expect(portStatus(sw.id, 1, 10)).toBe(portStatus(sw.id, 1, 18));
    const flaps = [0, 0.25, 0.5].map((dt) => portStatus("A03-U40", 17, 14 + dt));
    expect(new Set(flaps).size).toBeGreaterThan(1);
  });
});
