"use client";

import {
  BedDouble,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  EthernetPort,
  Leaf,
  type LucideIcon,
  PartyPopper,
  PlugZap,
  Server,
  Thermometer,
  Users,
  Wind,
  Zap,
} from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import { aqiBand } from "@/data/airQuality";
import { KPI_HISTORY, type KpiId, KPI_SETS, KPI_YESTERDAY } from "@/data/kpis";
import { fmt } from "@/lib/format";
import { DENSITY_LABEL } from "@/data/publicZones";
import { co2Band } from "@/data/airQuality";
import { GRID_EF } from "@/data/carbon";
import { hallPeopleTrend } from "@/data/eventHall";
import {
  useAir,
  useCarbon,
  useEnergy,
  useEventHall,
  useGuests,
  useKpis,
  usePublic,
  useRoomCounts,
  useServerRoom,
} from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";

/** Change against the same time yesterday; `good` colours it green */
type Delta = { text: string; up: boolean; good: boolean };

const pct = (now: number, before: number) => ((now - before) / before) * 100;
function delta(change: number, unit: string, upIsGood: boolean, digits = 1): Delta | undefined {
  if (Math.abs(change) < 0.05) return undefined;
  return { text: `${fmt(Math.abs(change), digits)}${unit}`, up: change > 0, good: change > 0 === upIsGood };
}

type Card = {
  /** What the number covers (Hotel / Mall / whole building) and when */
  label: string;
  /** Label for cards under 1440px wide */
  shortLabel: string;
  icon: LucideIcon;
  value: string;
  unit?: string;
  note: string;
  source: string;
  /** Source label colour (prototype: green PMS, cyan EMS / AI, gold IOC) */
  color: string;
  sparkColor: string;
  trend: readonly number[];
  delta?: Delta;
};

/**
 * Four KPI cards in the prototype's layout (~94px; ~72px when floating), all derived from the store; which four
 * depends on the scene (KPI_SETS). `floating` renders the translucent variant laid over the viewport on screens
 * under 900px tall.
 */
export function KpiStrip({ floating = false }: { floating?: boolean }) {
  const k = useKpis();
  const air = useAir();
  const view = useAppStore((s) => s.view);
  const rooms = useRoomCounts();
  const guests = useGuests();
  const energy = useEnergy();
  const lobby = usePublic();
  const hall = useEventHall();
  const time = useAppStore((s) => s.time);
  const carbon = useCarbon("month");
  const ict = useServerRoom();
  const portPct = (ict.portsUp / ict.ports) * 100;
  const ballroom = hall.venues[0];
  const live = hall.venues.filter((v) => v.booking).length;
  const indoorBand = aqiBand(air.indoor.aqi);
  const all: Record<KpiId, Card> = {
    occupancy: {
      label: "OCCUPANCY · HOTEL NOW",
      shortLabel: "OCCUPANCY · HOTEL",
      icon: BedDouble,
      value: fmt(k.occupancy.value),
      unit: "%",
      note: `${fmt(k.occupancy.occupied)} / 600 rooms occupied`,
      source: "PMS",
      color: "var(--green)",
      sparkColor: "var(--accent)",
      trend: k.occupancy.trend,
      delta: delta(k.occupancy.value - KPI_YESTERDAY.occupancy, " pts", true),
    },
    demand: {
      label: "DEMAND · WHOLE BUILDING NOW",
      shortLabel: "DEMAND · BUILDING",
      icon: Zap,
      value: fmt(k.demand.value),
      unit: "kW",
      note:
        Math.abs(k.demand.savingPct) > 0.05 ? `${fmt(k.demand.savingPct, 1)}% vs. 24°C` : "Illustrative energy model",
      source: "EMS",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: k.demand.trend,
      delta: delta(pct(k.demand.value, KPI_YESTERDAY.demand), "%", false),
    },
    footfall: {
      label: "FOOTFALL · MALL TODAY",
      shortLabel: "FOOTFALL · MALL",
      icon: Users,
      value: fmt(k.footfall.value),
      note: "Entry counts, not unique people",
      source: "AI",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: k.footfall.trend,
      delta: delta(pct(k.footfall.value, KPI_YESTERDAY.footfall), "%", true),
    },
    cases: {
      label: "CASE MANAGEMENT",
      shortLabel: "CASE MANAGEMENT",
      icon: ClipboardList,
      // Cases still outstanding: Open + Pending
      value: String(k.incidents.active),
      unit: "outstanding",
      // The split lives in the note: next to the value the sparkline covered it
      note: `Open ${k.incidents.open} · Pending ${k.incidents.pending} · Resolved today ${k.incidents.resolved}`,
      source: "IOC",
      color: "var(--gold)",
      sparkColor: "var(--gold)",
      trend: k.incidents.trend,
      delta: delta(k.incidents.value - KPI_YESTERDAY.incidents, "", false, 0),
    },
    indoorAir: {
      label: "INDOOR AIR · AQI NOW",
      shortLabel: "INDOOR AQI",
      icon: Wind,
      value: String(air.indoor.aqi),
      unit: indoorBand.label,
      note: `PM2.5 ${fmt(air.indoor.pm25, 1)} µg/m³ · CO₂ ${fmt(air.indoor.co2)} ppm · Outdoor ${air.outdoor.aqi}`,
      source: "IAQ",
      color: indoorBand.color,
      sparkColor: "var(--accent)",
      trend: air.trend.indoor,
    },
    roomMix: {
      label: "ROOMS · OCCUPIED / RESERVED / AVAILABLE",
      shortLabel: "ROOM STATUS",
      icon: DoorOpen,
      value: `${rooms.occupied} / ${rooms.reserved} / ${rooms.available}`,
      note: "Red · yellow · green on the 3D model",
      source: "PMS",
      color: "var(--green)",
      sparkColor: "var(--status-occupied)",
      trend: k.occupancy.trend,
    },
    hotelPower: {
      label: "ROOM LOAD · HOTEL NOW",
      shortLabel: "ROOM LOAD · HOTEL",
      icon: PlugZap,
      value: fmt(energy.hotel),
      unit: "kW",
      note: `≈ ${fmt(energy.hotel / Math.max(1, rooms.occupied), 2)} kW per occupied room`,
      source: "GRMS",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: k.demand.trend.map((v) => (v * energy.hotel) / k.demand.value),
    },
    arrivals: {
      label: "ARRIVALS · TODAY",
      shortLabel: "ARRIVALS",
      icon: CalendarClock,
      value: String(guests.arrivals),
      unit: "rooms",
      note: `${guests.checkedInToday} checked in today · ${fmt(guests.inHouse)} guests in house`,
      source: "PMS",
      color: "var(--green)",
      sparkColor: "var(--status-reserved)",
      trend: [...KPI_HISTORY.arrivals, guests.arrivals],
    },
    lobbyPeople: {
      label: "LOBBY · PEOPLE NOW",
      shortLabel: "LOBBY NOW",
      icon: Users,
      value: fmt(lobby.people),
      note: `${lobby.zones.length} zones · aggregated counts, no identity`,
      source: "AI",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: [...KPI_HISTORY.lobbyPeople, lobby.people],
    },
    doorCount: {
      label: "MAIN ENTRANCE · IN / OUT TODAY",
      shortLabel: "ENTRANCE IN / OUT",
      icon: DoorOpen,
      value: `${fmt(lobby.entrance.in)} / ${fmt(lobby.entrance.out)}`,
      note: "Counted since 06:00 · entries, not unique people",
      source: "AI",
      color: "var(--accent)",
      sparkColor: "var(--green)",
      trend: [...KPI_HISTORY.entrance, lobby.entrance.in],
    },
    busiestZone: {
      label: "BUSIEST ZONE · LOBBY",
      shortLabel: "BUSIEST ZONE",
      icon: Users,
      value: lobby.busiest.zone.name,
      unit: `${Math.round(lobby.busiest.load * 100)}%`,
      note: `${lobby.busiest.people} people · ${DENSITY_LABEL[lobby.busiest.level].label} density`,
      source: "AI",
      color: DENSITY_LABEL[lobby.busiest.level].color,
      sparkColor: DENSITY_LABEL[lobby.busiest.level].color,
      trend: lobby.zones.map((z) => z.load),
    },
    hallPeople: {
      label: "EVENT HALL · PEOPLE NOW",
      shortLabel: "EVENT HALL NOW",
      icon: Users,
      value: fmt(hall.people),
      unit: `/ ${fmt(hall.capacity)}`,
      note: `Ballroom ${ballroom.people} / ${ballroom.venue.capacity} · ${live} of ${hall.venues.length} rooms in use`,
      source: "AI",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: hallPeopleTrend(time),
    },
    hallEvents: {
      label: "EVENTS · TODAY",
      shortLabel: "EVENTS TODAY",
      icon: PartyPopper,
      value: String(hall.bookings),
      unit: "events",
      note: hall.next ? `Next: ${hall.next.title} · ${hall.next.pax} guests` : `${fmt(hall.guestsToday)} guests today`,
      source: "BOOKING",
      color: "var(--gold)",
      sparkColor: "var(--gold)",
      trend: [3, 4, 2, 5, 4, 6, hall.bookings],
    },
    hallPower: {
      label: "EVENT HALL · POWER NOW",
      shortLabel: "HALL POWER",
      icon: Zap,
      value: fmt(hall.kw),
      unit: "kW",
      note: "Cooling + lighting / AV of L3 · sub-meter",
      source: "EMS",
      color: "var(--accent)",
      sparkColor: "var(--accent)",
      trend: hallPeopleTrend(time).map((p) => 42 + 0.32 * p),
    },
    hallAir: {
      label: "BALLROOM · CO₂ NOW",
      shortLabel: "BALLROOM CO₂",
      icon: Wind,
      value: fmt(ballroom.co2),
      unit: "ppm",
      note: `${co2Band(ballroom.co2).label} · fresh air follows the guests`,
      source: "IAQ",
      color: co2Band(ballroom.co2).color,
      sparkColor: "var(--accent)",
      trend: hallPeopleTrend(time).map((p) => 430 + 520 * Math.min(1.2, p / 480)),
    },
    carbonMonth: {
      label: "CARBON · THIS MONTH (SCOPE 1+2)",
      shortLabel: "CARBON · MONTH",
      icon: Leaf,
      value: fmt(carbon.total),
      unit: "tCO₂e",
      note: `Today ${fmt(carbon.today, 1)} t · grid EF ${GRID_EF} kg/kWh`,
      source: "ESG",
      color: "var(--green)",
      sparkColor: "var(--green)",
      trend: carbon.hourly,
    },
    ictTemp: {
      label: "SERVER ROOM · COLD AISLE NOW",
      shortLabel: "SERVER ROOM TEMP",
      icon: Thermometer,
      value: fmt(ict.coldAisle, 1),
      unit: "°C",
      note: `Hot aisle ${fmt(ict.hotAisle, 1)} °C · RH ${ict.humidity}% · hottest ${ict.hottest.rack.id} ${fmt(ict.hottest.inlet, 1)} °C`,
      source: "DCIM",
      color: ict.hottest.inlet > 25 ? "var(--gold)" : "var(--accent)",
      sparkColor: "var(--blue)",
      trend: ict.racks.map((r) => r.inlet),
    },
    ictPower: {
      label: "SERVER ROOM · IT LOAD NOW",
      shortLabel: "IT LOAD",
      icon: Zap,
      value: fmt(ict.itKw, 1),
      unit: "kW",
      note: `Facility ${fmt(ict.facilityKw, 1)} kW incl. cooling · PUE 1.48`,
      source: "DCIM",
      color: "var(--accent)",
      sparkColor: "var(--gold)",
      trend: ict.racks.map((r) => r.kw),
    },
    ictOnline: {
      label: "DEVICES ONLINE",
      shortLabel: "DEVICES ONLINE",
      icon: Server,
      value: `${ict.online} / ${ict.devices}`,
      note: `${ict.devices - ict.online} offline · ${ict.racks.length} racks`,
      source: "SNMP",
      color: ict.online < ict.devices ? "var(--gold)" : "var(--green)",
      sparkColor: "var(--green)",
      trend: ict.racks.map((r) => r.online),
    },
    ictPorts: {
      label: "SWITCH PORTS UP",
      shortLabel: "PORTS UP",
      icon: EthernetPort,
      value: `${ict.portsUp} / ${ict.ports}`,
      unit: `${fmt(portPct)}%`,
      note: `${ict.portErrors} ports in error · idle = no link`,
      source: "SNMP",
      color: ict.portErrors ? "var(--red)" : "var(--green)",
      sparkColor: "var(--accent)",
      trend: ict.racks.map((r) => r.portsUp),
    },
  };
  const cards = KPI_SETS[view].map((id) => all[id]);

  return (
    <section aria-label="Simulated operational metrics" className="grid grid-cols-4 gap-2 tall:gap-3">
      {cards.map((c) => (
        // Prototype KPI card (.kpi): label + icon, large value, note + source line, corner sparkline
        <article
          key={c.label}
          className={`relative overflow-hidden rounded-[var(--radius-card)] border px-4 py-3 ${
            floating
              ? "pointer-events-auto border-line/70 bg-panel/80 backdrop-blur-md"
              : "border-line bg-[linear-gradient(115deg,#121f30,#0c1725)]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] tracking-wide text-[#a2b3c7]">
            <span className="hidden truncate wide:inline">{c.label}</span>
            <span className="truncate wide:hidden">{c.shortLabel}</span>
            <c.icon size={17} strokeWidth={1.65} className="shrink-0 text-accent" />
          </div>
          <p className="mt-1.5 flex items-baseline whitespace-nowrap">
            <span className="text-[27px] leading-none font-[550] tracking-[-0.03em] tabular-nums">{c.value}</span>
            {c.unit && <small className="ml-1.5 text-[11px] text-[#95a9bd]">{c.unit}</small>}
            {c.delta && (
              <small
                title="เทียบกับเมื่อวานเวลาเดียวกัน (ค่าสมมติ)"
                className={`ml-2 hidden text-[11px] font-semibold wide:inline ${c.delta.good ? "text-green" : "text-gold"}`}
              >
                {c.delta.up ? "▲" : "▼"} {c.delta.text}
                <span className="font-normal text-[#8197af]"> vs. yesterday</span>
              </small>
            )}
          </p>
          {/* Screens under 900px tall drop the note line, as the prototype did on small screens */}
          <div className={`mt-2 justify-between gap-2 text-[10px] text-[#8197af] ${floating ? "hidden" : "flex"}`}>
            <span className="truncate">{c.note}</span>
            <span className="shrink-0" style={{ color: c.color }}>
              {c.source} · DEMO
            </span>
          </div>
          <Sparkline
            values={c.trend}
            color={c.sparkColor}
            className={`absolute right-4 h-[22px] w-[72px] opacity-60 ${floating ? "bottom-3" : "bottom-[26px]"}`}
          />
        </article>
      ))}
    </section>
  );
}
