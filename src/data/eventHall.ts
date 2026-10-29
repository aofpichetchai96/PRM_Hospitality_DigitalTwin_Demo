// Event Hall (podium L3): the grand ballroom and three meeting rooms, today's
// bookings, and who is in each venue at a given clock time. Pure functions of
// the clock like the lobby counts, so t0 is fixed. Venue outlines follow the
// L3 fit-out in three/geometry/interiors.ts (podiumL3). Simulated bookings —
// no real client or guest data.

import { GRID_EF } from "./carbon";

export type VenueId = "ballroom" | "meeting1" | "meeting2" | "meeting3";

export interface Venue {
  id: VenueId;
  name: string;
  /** Plan rectangle on L3 (m), x west → east, z north → south */
  rect: { x0: number; x1: number; z0: number; z1: number };
  /** Seated capacity */
  capacity: number;
  /** Where its 3D label sits (x, z) */
  label: readonly [number, number];
}

export const VENUES: readonly Venue[] = [
  {
    id: "ballroom",
    name: "Grand Ballroom",
    rect: { x0: 16, x1: 37, z0: -16, z1: 22 },
    capacity: 480,
    label: [26.5, 20],
  },
  {
    id: "meeting1",
    name: "Meeting 1",
    rect: { x0: -37, x1: -27, z0: 9.5, z1: 23.5 },
    capacity: 16,
    label: [-32, 21.5],
  },
  {
    id: "meeting2",
    name: "Meeting 2",
    rect: { x0: -27, x1: -17, z0: 9.5, z1: 23.5 },
    capacity: 16,
    label: [-22, 15.5],
  },
  { id: "meeting3", name: "Meeting 3", rect: { x0: -17, x1: -7, z0: 9.5, z1: 23.5 }, capacity: 16, label: [-12, 9.5] },
];
export const venue = (id: VenueId) => VENUES.find((v) => v.id === id)!;

export interface Booking {
  id: string;
  title: string;
  venue: VenueId;
  /** Decimal hours */
  start: number;
  end: number;
  /** Expected guests */
  pax: number;
  setup: string;
}

/** Today's bookings (simulated) */
export const BOOKINGS: readonly Booking[] = [
  {
    id: "EV-0412",
    title: "Hospitality Leaders Summit",
    venue: "ballroom",
    start: 8.5,
    end: 17,
    pax: 320,
    setup: "Banquet rounds · stage + LED wall",
  },
  {
    id: "EV-0413",
    title: "Wedding reception",
    venue: "ballroom",
    start: 18.5,
    end: 23,
    pax: 420,
    setup: "Banquet rounds · dance floor",
  },
  { id: "EV-0414", title: "Board meeting", venue: "meeting1", start: 9, end: 12, pax: 12, setup: "Boardroom" },
  {
    id: "EV-0415",
    title: "Sales training",
    venue: "meeting2",
    start: 13,
    end: 17,
    pax: 14,
    setup: "Boardroom · screen",
  },
  {
    id: "EV-0416",
    title: "Product launch briefing",
    venue: "meeting3",
    start: 15,
    end: 18,
    pax: 10,
    setup: "Boardroom · screen",
  },
];

/** Guests arrive over the half hour before the start and leave over the half hour after the end */
const ARRIVE = 0.5;

/** Share of a booking's guests in the venue at a decimal hour (0–1) */
export function attendance(b: Booking, time: number) {
  if (time < b.start - ARRIVE || time > b.end + ARRIVE) return 0;
  if (time < b.start) return ((time - (b.start - ARRIVE)) / ARRIVE) * 0.9;
  if (time > b.end) return 1 - (time - b.end) / ARRIVE;
  // The summit breaks for lunch: half the room goes to the F&B floor
  if (b.id === "EV-0412" && time >= 12 && time < 13) return 0.55;
  return 1;
}

export type BookingStatus = "done" | "live" | "next";
export function bookingStatus(b: Booking, time: number): BookingStatus {
  if (time > b.end + ARRIVE) return "done";
  if (time >= b.start - ARRIVE) return "live";
  return "next";
}

export interface VenueReading {
  venue: Venue;
  people: number;
  /** people ÷ capacity */
  load: number;
  /** ppm: fresh-air base plus the people in the room */
  co2: number;
  /** The booking in the room now, if any */
  booking?: Booking;
  /** Cooling + lighting / AV of the room now (kW) */
  kw: number;
  /** Carbon emission now (kgCO₂e / h) = kW × grid EF */
  emission: number;
  /** Carbon footprint since 06:00 today (kgCO₂e) */
  footprint: number;
}

/** Cooling and lighting / AV of the event floor: a base for the empty rooms plus a share per person (kW) */
const HALL_BASE_KW = 42;
const KW_PER_PERSON = 0.32;

const area = (v: Venue) => (v.rect.x1 - v.rect.x0) * (v.rect.z1 - v.rect.z0);
const TOTAL_AREA = VENUES.reduce((n, v) => n + area(v), 0);
const peopleIn = (v: Venue, time: number) =>
  Math.round(BOOKINGS.filter((b) => b.venue === v.id).reduce((n, b) => n + b.pax * attendance(b, time), 0));
/** A room's load: its share of the floor base by area plus its people */
const venueKw = (v: Venue, people: number) => HALL_BASE_KW * (area(v) / TOTAL_AREA) + KW_PER_PERSON * people;
/** Step of the footprint integral (h), from the start of the day */
const STEP = 0.25;
const DAY_START = 6;

/** kgCO₂e a room has emitted from 06:00 to `time` */
function venueFootprint(v: Venue, time: number) {
  let kg = 0;
  for (let t = DAY_START; t < time; t += STEP) kg += venueKw(v, peopleIn(v, t)) * GRID_EF * Math.min(STEP, time - t);
  return kg;
}

/** Who is in each venue now, the floor's people, load and carbon, and today's totals */
export function eventHallAt(time: number) {
  const venues: VenueReading[] = VENUES.map((v) => {
    const here = BOOKINGS.filter((b) => b.venue === v.id);
    const people = peopleIn(v, time);
    const load = people / v.capacity;
    const kw = venueKw(v, people);
    return {
      venue: v,
      people,
      load,
      co2: Math.round(430 + 520 * Math.min(1.2, load)),
      booking: here.find((b) => bookingStatus(b, time) === "live"),
      kw,
      emission: kw * GRID_EF,
      footprint: venueFootprint(v, time),
    };
  });
  const people = venues.reduce((n, v) => n + v.people, 0);
  return {
    venues,
    people,
    capacity: VENUES.reduce((n, v) => n + v.capacity, 0),
    kw: Math.round(HALL_BASE_KW + KW_PER_PERSON * people),
    /** Floor carbon emission now (kgCO₂e / h) and footprint since 06:00 (kgCO₂e) */
    emission: venues.reduce((n, v) => n + v.emission, 0),
    footprint: venues.reduce((n, v) => n + v.footprint, 0),
    bookings: BOOKINGS.length,
    guestsToday: BOOKINGS.reduce((n, b) => n + b.pax, 0),
    next: BOOKINGS.filter((b) => bookingStatus(b, time) === "next").sort((a, b) => a.start - b.start)[0],
  };
}
export type EventHallReading = ReturnType<typeof eventHallAt>;

/** People on the floor at each hour from 06:00 up to now (sparkline) */
export function hallPeopleTrend(time: number) {
  const out: number[] = [];
  for (let h = 6; h <= Math.floor(time); h++) out.push(eventHallAt(h).people);
  out.push(eventHallAt(time).people);
  return out;
}
