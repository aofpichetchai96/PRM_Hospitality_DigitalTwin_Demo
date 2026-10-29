// ICT scene: the building's main server room. Racks in two rows round a cold
// aisle plus a storage / core row, each filled U by U with patch panels,
// switches, servers, storage and a firewall; every switch port has a status.
// Room temperature, humidity, IT load and what is online are pure functions of
// the clock and a seed, like the rest of the demo, so t0 is fixed. Simulated
// inventory and readings — no DCIM or switch is polled.
export type DeviceKind = "patch" | "core" | "switch" | "firewall" | "server" | "storage" | "ups";
export type PortStatus = "up" | "idle" | "down" | "error";
/** Which way the rack front faces (the cold aisle side) */
export type RackFace = "+z" | "-z" | "-x";

export interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  /** Lowest U it occupies (1 = bottom) and its height in U */
  u: number;
  height: number;
  /** Switch ports */
  ports?: number;
  /** Draw at full load (W) */
  watts: number;
}

export interface Rack {
  id: string;
  row: "A" | "B" | "C";
  role: string;
  /** Centre on the server-room floor (m) */
  x: number;
  z: number;
  face: RackFace;
  devices: Device[];
}

export const RACK_U = 42;
/** Rack size (m): width, height, depth */
export const RACK_SIZE = [0.6, 2.0, 1.1] as const;

export const KIND_LABEL: Record<DeviceKind, string> = {
  patch: "Patch panel",
  core: "Core switch",
  switch: "Access switch",
  firewall: "Firewall",
  server: "Server",
  storage: "Storage array",
  ups: "Rack UPS",
};

/** One rack's contents: what it is for decides the mix */
function fill(rackId: string, role: "core" | "compute" | "storage"): Device[] {
  const d: Device[] = [];
  const add = (kind: DeviceKind, name: string, u: number, height: number, watts: number, ports?: number) =>
    d.push({ id: `${rackId}-U${String(u).padStart(2, "0")}`, name, kind, u, height, watts, ports });
  add("patch", "Patch panel 48", 42, 1, 0);
  if (role === "core") {
    add("core", "Core switch · 48×25G", 40, 2, 650, 48);
    add("core", "Core switch · 48×25G", 38, 2, 650, 48);
    add("firewall", "Firewall · NGFW", 35, 2, 420);
    add("switch", "Access switch · 48×1G", 33, 1, 180, 48);
    add("switch", "Access switch · 48×1G", 32, 1, 180, 48);
    for (let u = 26; u >= 14; u -= 2) add("server", `Server ${rackId}-${u}`, u, 2, 380);
    add("ups", "Rack UPS 3 kVA", 2, 3, 120);
  } else if (role === "storage") {
    add("switch", "Storage switch · 48×10G", 40, 1, 220, 48);
    for (let u = 34; u >= 6; u -= 4) add("storage", `Storage shelf ${rackId}-${u}`, u, 4, 520);
  } else {
    add("switch", "Access switch · 48×1G", 40, 1, 180, 48);
    add("switch", "Access switch · 48×1G", 39, 1, 180, 48);
    for (let u = 36; u >= 4; u -= 2) add("server", `Server ${rackId}-${u}`, u, 2, 340);
  }
  return d;
}

/** Hall layout: rows A and B face each other across the cold aisle (z 0); row C (storage) faces west */
function racks(): Rack[] {
  const out: Rack[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -1.5 + i * 0.6;
    const a = `A0${i + 1}`;
    const b = `B0${i + 1}`;
    out.push({
      id: a,
      row: "A",
      role: i < 2 ? "Core network" : "Compute",
      x,
      z: -1.6,
      face: "+z",
      devices: fill(a, i < 2 ? "core" : "compute"),
    });
    out.push({ id: b, row: "B", role: "Compute", x, z: 1.6, face: "-z", devices: fill(b, "compute") });
  }
  for (let i = 0; i < 4; i++) {
    const c = `C0${i + 1}`;
    out.push({ id: c, row: "C", role: "Storage", x: 5.4, z: -0.9 + i * 0.6, face: "-x", devices: fill(c, "storage") });
  }
  return out.sort((p, q) => p.id.localeCompare(q.id));
}
export const RACKS: readonly Rack[] = racks();
export const rack = (id: string) => RACKS.find((r) => r.id === id);

/** Ports that flap into error while the clock runs, and a server that is down (the demo's points of interest) */
const ERROR_PORTS = new Set(["A03-U40:17", "B05-U39:6", "A01-U40:44"]);
const OFFLINE = new Set(["B04-U22", "C03-U22"]);

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Status of one switch port at a decimal hour (seeded; a few ports flap) */
export function portStatus(deviceId: string, port: number, time: number): PortStatus {
  const key = `${deviceId}:${port}`;
  if (ERROR_PORTS.has(key)) return Math.floor(time * 4) % 3 === 0 ? "down" : "error";
  // FNV hash, mixed once more so neighbouring ports differ
  const r = (Math.imul(hash(key) ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967296;
  // Core and storage switches are almost fully patched; access switches leave spare ports
  const patched = /U3[89]|U40/.test(deviceId) && deviceId.startsWith("A0") ? 0.96 : 0.82;
  if (r < patched) return "up";
  if (r < patched + 0.02) return "down";
  return "idle";
}

export const isOnline = (d: Device) => !OFFLINE.has(d.id);

/** How hard the IT kit runs at a decimal hour (0–1): a daytime business peak and the evening guest peak */
const utilisation = (time: number) =>
  0.55 + 0.18 * Math.exp(-((time - 14) ** 2) / 8) + 0.1 * Math.exp(-((time - 21) ** 2) / 4);

/** Power use effectiveness of the room (cooling + losses over IT load), assumed */
export const PUE = 1.48;

export interface RackReading {
  rack: Rack;
  /** IT load now (kW) */
  kw: number;
  /** Inlet (cold aisle) temperature at the rack front (°C) */
  inlet: number;
  online: number;
  devices: number;
  portsUp: number;
  ports: number;
  errors: number;
}

/** The whole room now: racks, temperatures, power and what is online */
export function serverRoomAt(time: number) {
  const u = utilisation(time);
  const coldAisle = Math.round((22.4 + 0.5 * Math.sin((time - 10) / 3)) * 10) / 10;
  const racks: RackReading[] = RACKS.map((r) => {
    const live = r.devices.filter((d) => d.kind !== "patch");
    const kw = live.reduce((n, d) => n + (isOnline(d) ? d.watts * (d.kind === "server" ? u : 0.9) : 0), 0) / 1000;
    let up = 0;
    let ports = 0;
    let errors = 0;
    for (const d of r.devices)
      for (let p = 1; p <= (d.ports ?? 0); p++) {
        ports++;
        const st = portStatus(d.id, p, time);
        if (st === "up") up++;
        if (st === "error") errors++;
      }
    // B05 sits where the cold air runs short: it reads warm (a demo point of interest)
    const inlet = Math.round((coldAisle + 0.25 * kw + (r.id === "B05" ? 3.4 : (hash(r.id) % 10) / 10)) * 10) / 10;
    return {
      rack: r,
      kw,
      inlet,
      online: live.filter(isOnline).length,
      devices: live.length,
      portsUp: up,
      ports,
      errors,
    };
  });
  const it = racks.reduce((n, r) => n + r.kw, 0);
  return {
    racks,
    coldAisle,
    hotAisle: Math.round((coldAisle + 11.2 + 2 * u) * 10) / 10,
    humidity: Math.round(46 + 3 * Math.sin(time / 4)),
    itKw: it,
    facilityKw: it * PUE,
    online: racks.reduce((n, r) => n + r.online, 0),
    devices: racks.reduce((n, r) => n + r.devices, 0),
    portsUp: racks.reduce((n, r) => n + r.portsUp, 0),
    ports: racks.reduce((n, r) => n + r.ports, 0),
    portErrors: racks.reduce((n, r) => n + r.errors, 0),
    hottest: racks.reduce((a, b) => (b.inlet > a.inlet ? b : a)),
  };
}
export type ServerRoomReading = ReturnType<typeof serverRoomAt>;

/** Inlet temperature bands (ASHRAE recommended 18–27 °C) */
export const inletBand = (c: number) => (c > 27 ? "high" : c > 25 ? "warm" : "ok");

/** A camera pose round a point of the room: azimuth 0 looks north from the south side */
export interface AreaShot {
  focus: [number, number, number];
  distance: number;
  azimuth: number;
  polar: number;
}

/**
 * Numbered areas of the room (the presets dropdown over the 3D view and the legend in the panel), each with the
 * shot that shows it; `ghost` thins a rack row that would stand between the camera and the area.
 */
export const ROOM_AREAS: readonly { n: number; name: string; shot: AreaShot; ghost?: "A" | "B" }[] = [
  {
    n: 1,
    name: "Core network racks (A01–A02)",
    shot: { focus: [-1.0, 1.0, -1.6], distance: 5.5, azimuth: 0.3, polar: 1.42 },
    ghost: "B",
  },
  { n: 2, name: "Cold aisle containment", shot: { focus: [0, 1.0, 0], distance: 8.5, azimuth: -1.57, polar: 1.05 } },
  {
    n: 3,
    name: "Compute racks (rows A / B)",
    shot: { focus: [0.6, 1.0, -1.6], distance: 6, azimuth: -0.15, polar: 1.42 },
    ghost: "B",
  },
  { n: 4, name: "In-row cooling units", shot: { focus: [-2.1, 1.0, 0], distance: 7, azimuth: -1.2, polar: 1.0 } },
  {
    n: 5,
    name: "Fire suppression piping (FM-200)",
    shot: { focus: [1.5, 2.4, -0.5], distance: 12, azimuth: 0.3, polar: 0.75 },
  },
  { n: 6, name: "NOC · monitoring desks", shot: { focus: [0, 0.9, 7.6], distance: 9.5, azimuth: 0.25, polar: 0.95 } },
  { n: 7, name: "UPS & battery room", shot: { focus: [10.6, 0.9, 3], distance: 8.5, azimuth: 0.6, polar: 0.85 } },
  { n: 8, name: "Generator room", shot: { focus: [-11.5, 0.8, 0], distance: 12, azimuth: -0.75, polar: 0.9 } },
  { n: 9, name: "Storage racks (row C)", shot: { focus: [5.4, 1.0, 0], distance: 3.8, azimuth: -1.45, polar: 1.3 } },
  { n: 10, name: "FM-200 gas cylinders", shot: { focus: [10.6, 0.9, -3.2], distance: 6.5, azimuth: 0.7, polar: 0.9 } },
];
