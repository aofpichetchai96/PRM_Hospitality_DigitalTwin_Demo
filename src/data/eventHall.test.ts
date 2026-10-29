import { describe, expect, it } from "vitest";
import { attendance, BOOKINGS, bookingStatus, eventHallAt, VENUES } from "./eventHall";

describe("event hall", () => {
  it("is fixed at t0: the summit in the ballroom and the sales training in Meeting 2", () => {
    const h = eventHallAt(14.5);
    const by = Object.fromEntries(h.venues.map((v) => [v.venue.id, v]));
    expect(by.ballroom.people).toBe(320);
    expect(by.ballroom.booking?.id).toBe("EV-0412");
    expect(by.meeting2.people).toBe(14);
    expect(by.meeting1.people).toBe(0);
    expect(h.people).toBe(334);
    // Meeting 3 (15:00) is already filling at 14:30, so the next one still to come is the wedding
    expect(h.next?.id).toBe("EV-0413");
    expect(h.bookings).toBe(BOOKINGS.length);
  });

  it("adds the venues' carbon up to the floor, from the same kW as the KPI", () => {
    const h = eventHallAt(14.5);
    expect(h.venues.reduce((n, v) => n + v.kw, 0)).toBeCloseTo(42 + 0.32 * h.people);
    expect(h.emission).toBeCloseTo(h.venues.reduce((n, v) => n + v.kw, 0) * 0.4999);
    // Footprint grows through the day and is zero at the start of it
    expect(eventHallAt(6).footprint).toBe(0);
    expect(eventHallAt(18).footprint).toBeGreaterThan(h.footprint);
  });

  it("fills a room over the half hour before a booking and empties it after", () => {
    const b = BOOKINGS[0];
    expect(attendance(b, b.start - 0.6)).toBe(0);
    expect(attendance(b, b.start - 0.25)).toBeGreaterThan(0);
    expect(attendance(b, b.start + 1)).toBe(1);
    expect(attendance(b, b.end + 0.6)).toBe(0);
    expect(bookingStatus(b, 7)).toBe("next");
    expect(bookingStatus(b, 10)).toBe("live");
    expect(bookingStatus(b, 23.9)).toBe("done");
  });

  it("never books a venue twice at once, and every booking fits its room", () => {
    for (const v of VENUES) {
      const here = BOOKINGS.filter((b) => b.venue === v.id).sort((a, b) => a.start - b.start);
      for (let i = 1; i < here.length; i++) expect(here[i].start).toBeGreaterThanOrEqual(here[i - 1].end + 1);
      for (const b of here) expect(b.pax).toBeLessThanOrEqual(v.capacity);
    }
  });
});
