"use client";

// Event Hall scene on the sliced L3: guests at the ballroom's banquet rounds
// (one figure per three guests), people at the meeting-room tables, a speaker
// on stage while the summit is on, guests walking in from the foyer, and each
// venue's outline and label — people / capacity · CO₂, carbon footprint today
// and carbon emission now — and the floor's carbon total. Figures come from the
// same attendance as the right panel (eventHallAt), so the rooms fill and empty
// with the clock.
import { type RefObject, useMemo } from "react";
import { BOOKINGS, bookingStatus, type VenueReading } from "@/data/eventHall";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useEventHall } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { Crowd } from "./AmbientLife";
import { floorLevel } from "./geometry/schematic";
import { dressed, type Person, random, type Vec3 } from "./geometry/traffic";
import { Html } from "@react-three/drei";
import { CloudFog, Footprints, Leaf } from "lucide-react";
import { fmt } from "@/lib/format";

/** L3 floor finish: podium level 3 (15.6 m) + the floor build-up and carpet (interiors.ts podiumL3) */
const FLOOR_Y = floorLevel("L3", false) + 0.555;
const P = (x: number, z: number, dy = 0): Vec3 => [x, FLOOR_Y + dy, z];

/** Banquet rounds (interiors.ts podiumL3): 4 × 6 tables, 8 places each, standing just behind the chairs */
const BANQUET_SEATS: { p: Vec3; yaw: number }[] = [];
for (let j = 0; j < 6; j++)
  for (let i = 0; i < 4; i++)
    for (let k = 0; k < 8; k++) {
      const cx = 19.6 + i * 4.6;
      const cz = -4 + j * 4.4;
      const a = (Math.PI * 2 * k) / 8;
      // Facing the table centre (yaw 0 looks towards +z)
      BANQUET_SEATS.push({
        p: P(cx + Math.cos(a) * 1.55, cz + Math.sin(a) * 1.55),
        yaw: Math.atan2(-Math.cos(a), -Math.sin(a)),
      });
    }

/** Meeting-room tables run along z at the room centre, chairs either side (boardroom()) */
const MEETING_X: Record<string, number> = { meeting1: -32, meeting2: -22, meeting3: -12 };
function meetingSeats(id: string) {
  const mid = MEETING_X[id];
  const seats: { p: Vec3; yaw: number }[] = [];
  for (let v = -2.9; v < 3.2; v += 0.9)
    for (const s of [-1, 1]) seats.push({ p: P(mid + s * 1.45, 16 + v), yaw: (-s * Math.PI) / 2 });
  return seats;
}

/** Figures for the people in each venue now (`key` = venue:people, so they change only when a count does) */
function hallFigures(venues: readonly VenueReading[], speaker: boolean, foyer: boolean): Person[] {
  const list: Person[] = [];
  const add = (seed: number, route: Vec3[], yaw?: number, speed = 1.1) => {
    const r = random(seed);
    list.push({ route, speed, phase: r(), pause: 3 + r() * 5, yaw, ...dressed(r, 0.15) });
  };
  for (const v of venues) {
    if (v.venue.id === "ballroom") {
      const n = Math.min(BANQUET_SEATS.length, Math.round(v.people / 3));
      // Spread over the tables: every fourth seat first, so a half-full room still fills every table
      const order = [...BANQUET_SEATS.keys()].sort((a, b) => (a % 4) - (b % 4) || a - b);
      for (let k = 0; k < n; k++) {
        const s = BANQUET_SEATS[order[k]];
        add(7001 + order[k], [s.p], s.yaw);
      }
    } else {
      const seats = meetingSeats(v.venue.id);
      const n = Math.min(seats.length, Math.round(v.people / 2));
      for (let k = 0; k < n; k++) add(8001 + k * 31 + v.venue.id.length * 7, [seats[k].p], seats[k].yaw);
    }
  }
  // Speaker on the stage (0.8 m high), facing the room
  if (speaker) add(9001, [P(26.5, -13.2, 0.8)], 0);
  // Guests walking from the registration counters in the foyer to the ballroom doors
  if (foyer)
    for (let k = 0; k < 6; k++) {
      const r = random(9100 + k);
      const route = [P(1 + r() * 6, 11 + r() * 8), P(12, 9.5 + r() * 2), P(16.6, 8 + r() * 4)];
      add(9100 + k, k % 2 ? route : [...route].reverse(), undefined, 1 + r() * 0.3);
    }
  return list;
}

const LINE = (load: number) => (load > 0.95 ? "#ff7c81" : load > 0.75 ? "#dfbd7e" : "#6ce4df");

function Outline({ v }: { v: VenueReading }) {
  const { x0, x1, z0, z1 } = v.venue.rect;
  const t = 0.3;
  const strips: [number, number, number, number][] = [
    [(x0 + x1) / 2, z0, x1 - x0, t],
    [(x0 + x1) / 2, z1, x1 - x0, t],
    [x0, (z0 + z1) / 2, t, z1 - z0],
    [x1, (z0 + z1) / 2, t, z1 - z0],
  ];
  return strips.map(([x, z, w, d], i) => (
    <mesh key={i} position={[x, FLOOR_Y + 0.05, z]} raycast={() => null} renderOrder={6}>
      <boxGeometry args={[w, 0.06, d]} />
      <meshBasicMaterial color={LINE(v.load)} toneMapped={false} />
    </mesh>
  ));
}

export function EventHallLayer({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const shown = useAppStore((s) => s.view === "event" && s.mode === "slice" && s.floor === "L3");
  if (!shown) return null;
  return <Layer portal={portal} />;
}

function Layer({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const hall = useEventHall();
  const time = useAppStore((s) => s.time);
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const summit = BOOKINGS[0];
  const speaker =
    bookingStatus(summit, time) === "live" && time >= summit.start && time <= summit.end && !(time >= 12 && time < 13);
  // Arrivals: within 45 minutes before any booking starts
  const foyer = BOOKINGS.some((b) => time > b.start - 0.75 && time < b.start + 0.25);
  const key = `${hall.venues.map((v) => v.people).join(",")}|${speaker}|${foyer}`;
  const people = useMemo(
    () => hallFigures(hall.venues, speaker, foyer),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt only when a count or the speaker / foyer changes
    [key],
  );
  return (
    <>
      <Crowd people={people} still={still} />
      {hall.venues.map((v) => (
        <Outline key={v.venue.id} v={v} />
      ))}
      {hall.venues.map((v) => (
        <VenueCard key={v.venue.id} v={v} portal={portal} />
      ))}
      <FloorCarbon footprint={hall.footprint} emission={hall.emission} portal={portal} />
    </>
  );
}

/** kg or t, whichever reads better */
const kg = (v: number) => (v >= 1000 ? `${fmt(v / 1000, 2)} t` : `${fmt(v)} kg`);

/**
 * Venue label: name, people / capacity, CO₂ in the room, then its carbon footprint today (footprints icon) and its
 * carbon emission now (cloud icon). Stays below the viewport's 2D overlays (z-20 and up).
 */
function VenueCard({ v, portal }: { v: VenueReading; portal: RefObject<HTMLElement | null> }) {
  return (
    <Html
      position={[v.venue.label[0], FLOOR_Y + 3, v.venue.label[1]]}
      portal={portal as RefObject<HTMLElement>}
      zIndexRange={[10, 0]}
      style={{ transform: "translate(-6px, -50%)" }}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="size-3 shrink-0 rounded-full border-2 border-white/90" style={{ background: LINE(v.load) }} />
        <span className="rounded-[var(--radius-button)] border border-line bg-bg/88 px-2.5 py-1.5 leading-tight backdrop-blur">
          <strong className="block text-[11px] font-semibold tracking-wide">
            {v.venue.name.toUpperCase()} · {v.people}/{v.venue.capacity} · CO₂ {v.co2}
          </strong>
          <span className="mt-1 flex gap-3 text-[11px] tabular-nums">
            <span className="flex items-center gap-1 text-green" title="Carbon footprint since 06:00">
              <Footprints size={12} /> {kg(v.footprint)}CO₂e
            </span>
            <span className="flex items-center gap-1 text-orange" title="Carbon emission now">
              <CloudFog size={12} /> {fmt(v.emission, 1)} kg/h
            </span>
          </span>
        </span>
      </div>
    </Html>
  );
}

/** Floor total over the north-east corner of L3: footprint today and emission now */
function FloorCarbon({
  footprint,
  emission,
  portal,
}: {
  footprint: number;
  emission: number;
  portal: RefObject<HTMLElement | null>;
}) {
  return (
    <Html position={[-24, FLOOR_Y + 3, -14]} portal={portal as RefObject<HTMLElement>} zIndexRange={[10, 0]} center>
      <div className="rounded-[var(--radius-card)] border border-green/50 bg-bg/90 px-3 py-2 whitespace-nowrap backdrop-blur">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-green">
          <Leaf size={13} /> EVENT HALL · CARBON
        </p>
        <div className="mt-1 flex flex-col gap-1 tabular-nums">
          <span className="flex items-center gap-2">
            <Footprints size={18} className="shrink-0 text-green" />
            <b className="w-[78px] text-[15px]">{kg(footprint)}</b>
            <span className="text-[11px] text-muted">CO₂e footprint today</span>
          </span>
          <span className="flex items-center gap-2">
            <CloudFog size={18} className="shrink-0 text-orange" />
            <b className="w-[78px] text-[15px]">{fmt(emission, 1)} kg/h</b>
            <span className="text-[11px] text-muted">CO₂e emission now</span>
          </span>
        </div>
      </div>
    </Html>
  );
}
