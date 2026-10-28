// Public Area: the Lobby floor (G) split into named zones, with simulated
// people counting at the main entrance and per-zone air quality. Zone
// outlines follow the G-floor fit-out in three/geometry/interiors.ts
// (podiumGround). Counts are pure functions of the clock, like footfallAt(),
// so they move with the timeline and t0 is fixed. Aggregated counts only: no
// face recognition or identity.
import { activityAt, type AirReading, indoorAir, outdoorAir, pm25ToAqi } from "./airQuality";

export type PublicZoneId = "entrance" | "lounge" | "reception" | "liftHall" | "retailLink";

const bump = (t: number, centre: number, width: number) => Math.exp(-(((t - centre) / width) ** 2));
/** 0 → 1 as the mall opens (10:00) and back to 0 as it closes (22:00) */
const mallHours = (t: number) => Math.min(1, Math.max(0, t - 9.5)) * Math.min(1, Math.max(0, 22.5 - t));
/** The clock time the atT0 counts belong to */
const T0 = 14.5;

export interface PublicZone {
  id: PublicZoneId;
  name: string;
  th: string;
  /** Plan rectangle on the G floor (m): x0..x1 west → east, z0..z1 north → south (entrance side) */
  rect: { x0: number; x1: number; z0: number; z1: number };
  /** Comfortable number of people; density is people ÷ capacity */
  capacity: number;
  /** People here at t0 (14:30, check-in under way); they add up to the 202 on the floor */
  atT0: number;
  /** How busy the zone is over the day, relative (its own rhythm: check-in, lifts at rush hours, mall hours) */
  rhythm: (time: number) => number;
  /** How much outdoor air reaches the zone through the doors (0–1) */
  doorAir: number;
  /** Where its 3D label sits (x, z) when the centre would crowd a neighbour */
  label?: readonly [number, number];
}

export const PUBLIC_ZONES: readonly PublicZone[] = [
  {
    id: "entrance",
    name: "Entrance",
    th: "ทางเข้าหลัก",
    rect: { x0: -20, x1: -3, z0: 20.5, z1: 24.5 },
    capacity: 40,
    // Arrivals pass through quickly: busier at the morning and evening rush
    atT0: 16,
    rhythm: (t) => 0.5 + 0.8 * bump(t, 8.5, 1.2) + 0.5 * bump(t, 12, 1.5) + 0.9 * bump(t, 18.5, 1.5),
    doorAir: 0.12,
    label: [-15, 23.5],
  },
  {
    id: "lounge",
    name: "Lobby lounge",
    th: "โถงนั่งพัก",
    rect: { x0: -38, x1: -3, z0: 14, z1: 20.5 },
    capacity: 110,
    // Guests wait for their room in the afternoon and meet here in the evening
    atT0: 73,
    rhythm: (t) => 0.4 + 0.6 * bump(t, 15.5, 2.5) + 0.7 * bump(t, 19.5, 2),
    doorAir: 0.03,
    label: [-37, 20],
  },
  {
    id: "reception",
    name: "Reception",
    th: "เคาน์เตอร์ต้อนรับ",
    rect: { x0: -32, x1: -18, z0: 8.5, z1: 14 },
    capacity: 55,
    // Check-out before noon, check-in from 14:00: the busiest zone at t0
    atT0: 48,
    rhythm: (t) => 0.25 + 0.9 * bump(t, 11.3, 0.8) + 1.1 * bump(t, 15, 1.3),
    doorAir: 0.02,
    label: [-27, 8.5],
  },
  {
    id: "liftHall",
    name: "Lift hall",
    th: "โถงลิฟต์",
    rect: { x0: 3, x1: 15, z0: -2.5, z1: 4.5 },
    capacity: 60,
    // Breakfast and dinner rush to and from the rooms; guests going up after check-in
    atT0: 41,
    rhythm: (t) => 0.45 + 0.8 * bump(t, 8, 1) + 0.4 * bump(t, 14.5, 1.2) + 0.6 * bump(t, 19.5, 1.3),
    doorAir: 0,
    label: [13, 0],
  },
  {
    id: "retailLink",
    name: "Retail link",
    th: "ทางเชื่อมร้านค้า",
    rect: { x0: -2.5, x1: 1, z0: 4.5, z1: 24.5 },
    capacity: 35,
    // Follows the mall: quiet before 10:00 and after 22:00, lunch and evening peaks
    atT0: 24,
    rhythm: (t) => 0.1 + mallHours(t) * (0.6 + 0.4 * bump(t, 13, 1.5) + 0.6 * bump(t, 19, 2)),
    doorAir: 0.06,
    label: [-0.75, 15],
  },
];

export const publicZone = (id: PublicZoneId) => PUBLIC_ZONES.find((z) => z.id === id)!;
export const zoneCentre = (z: PublicZone) => [(z.rect.x0 + z.rect.x1) / 2, (z.rect.z0 + z.rect.z1) / 2] as const;
export const zoneArea = (z: PublicZone) => (z.rect.x1 - z.rect.x0) * (z.rect.z1 - z.rect.z0);

/** People through the main entrance so far today (06:00 start), in and out */
const ENTRIES_AT_T0 = 4280;
/** A crowd-density alarm on G packs the lounge: its share grows by this factor */
export const CROWD_BOOST = 1.7;

/** Entries and exits at the main entrance today; `inside` = people on the lobby floor now */
export function entranceCounts(time: number, inside = lobbyPeopleAt(time)) {
  const entries = Math.round(ENTRIES_AT_T0 * Math.pow(Math.max(0, time - 5) / 9.5, 1.15));
  return { in: entries, out: Math.max(0, entries - inside), inside };
}

/** People on the lobby floor right now: busy mid-afternoon (check-in) and early evening */
export function lobbyPeopleAt(time: number) {
  return Math.round(60 + 150 * activityAt(time) + 40 * Math.exp(-((time - 19) ** 2) / 2));
}

export type DensityLevel = "low" | "moderate" | "high" | "crowded";
export const DENSITY_LABEL: Record<DensityLevel, { label: string; th: string; color: string }> = {
  low: { label: "Low", th: "โล่ง", color: "var(--green)" },
  moderate: { label: "Moderate", th: "ปานกลาง", color: "var(--gold)" },
  high: { label: "High", th: "หนาแน่น", color: "var(--orange)" },
  crowded: { label: "Crowded", th: "แออัด", color: "var(--red)" },
};
export function densityLevel(load: number): DensityLevel {
  if (load < 0.45) return "low";
  if (load < 0.8) return "moderate";
  if (load < 1) return "high";
  return "crowded";
}

export interface ZoneReading {
  zone: PublicZone;
  people: number;
  /** people ÷ capacity */
  load: number;
  level: DensityLevel;
  air: AirReading;
}

/**
 * People and air in each zone. `occupancy` is the hotel occupancy (0–1) for the
 * building's indoor air; `crowd` = an open crowd alarm on the lobby floor.
 */
export function zoneReadings(time: number, occupancy: number, crowd = false, ahuOk = true): ZoneReading[] {
  const total = lobbyPeopleAt(time);
  const inside = indoorAir(time, occupancy, ahuOk);
  const outside = outdoorAir(time);
  // Each zone's share follows its own rhythm, scaled so t0 gives exactly the atT0 counts
  const weights = PUBLIC_ZONES.map((zone) => (zone.atT0 * zone.rhythm(time)) / zone.rhythm(T0));
  const sum = weights.reduce((a, b) => a + b, 0);
  // Whole people per zone that still add up to the floor total (largest remainder)
  const raw = PUBLIC_ZONES.map(
    (zone, i) => (total * weights[i] * (crowd && zone.id === "lounge" ? CROWD_BOOST : 1)) / sum,
  );
  const counts = raw.map(Math.floor);
  const missing = Math.round(raw.reduce((a, b) => a + b, 0)) - counts.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, missing)
    .forEach(([, i]) => counts[i]++);
  return PUBLIC_ZONES.map((zone, i) => {
    const people = counts[i];
    const load = people / zone.capacity;
    const pm25 = Math.round((inside.pm25 * (1 - zone.doorAir) + outside.pm25 * zone.doorAir) * 10) / 10;
    // CO₂ rises with how full the zone is; doors bring some outdoor air in
    const co2 = Math.round(outside.co2 + 60 + 480 * load * (1 - zone.doorAir * 3));
    return { zone, people, load, level: densityLevel(load), air: { aqi: pm25ToAqi(pm25), pm25, co2 } };
  });
}

/** People counted at the main entrance in each hour from 06:00 to now (in, out) */
export function hourlyEntrance(time: number) {
  const hours: { hour: number; in: number; out: number }[] = [];
  for (let h = 6; h < Math.ceil(time); h++) {
    const end = Math.min(time, h + 1);
    const a = entranceCounts(h);
    const b = entranceCounts(end);
    hours.push({ hour: h, in: b.in - a.in, out: b.out - a.out });
  }
  return hours;
}
