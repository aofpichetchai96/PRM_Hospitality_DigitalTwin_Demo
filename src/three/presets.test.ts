import { describe, expect, it } from "vitest";
import { CAMERA_LIMITS, CAMERA_PRESETS, floorPose, nearestAngle } from "./presets";

describe("nearestAngle", () => {
  it("returns the target unchanged when already closest", () => {
    expect(nearestAngle(0.4, 0.43)).toBeCloseTo(0.43);
  });

  it("picks the equivalent angle nearest to an accumulated auto-rotate azimuth", () => {
    // After several auto-rotate turns the prototype spun back all the way to 0.43
    const current = 0.43 + 3 * Math.PI * 2 + 0.2;
    const result = nearestAngle(current, 0.43);
    expect(Math.abs(result - current)).toBeLessThanOrEqual(Math.PI);
    expect(Math.cos(result)).toBeCloseTo(Math.cos(0.43));
  });

  it("goes the short way across ±π", () => {
    expect(nearestAngle(3.0, -3.0)).toBeCloseTo(-3.0 + Math.PI * 2);
  });
});

describe("camera presets", () => {
  it("keep the prototype's values within the control limits", () => {
    for (const p of Object.values(CAMERA_PRESETS)) {
      expect(p.distance).toBeGreaterThanOrEqual(CAMERA_LIMITS.minDistance);
      expect(p.distance).toBeLessThanOrEqual(CAMERA_LIMITS.maxDistance);
      expect(p.polar).toBeGreaterThanOrEqual(CAMERA_LIMITS.minPolarAngle);
      expect(p.polar).toBeLessThanOrEqual(CAMERA_LIMITS.maxPolarAngle);
    }
  });

  it("targets the selected floor level (prototype floorView)", () => {
    expect(floorPose("H12").target).toEqual([9, 29 + 11 * 4.15, -6]);
    expect(floorPose("H01").target[1]).toBe(29);
    expect(floorPose("L2")).toMatchObject({ target: [0, 10.4, 0], distance: 148 });
    expect(floorPose("G").target[1]).toBe(0);
  });
});
