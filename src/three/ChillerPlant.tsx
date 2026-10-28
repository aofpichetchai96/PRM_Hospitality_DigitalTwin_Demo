"use client";

// Central plant: three water-cooled centrifugal chillers on the plant pad —
// evaporator and condenser shells side by side on a skid, the compressor
// (motor + volute) on top, water boxes and nozzles at the east end, a control
// panel at the west end — piped to chilled-water and condenser-water headers,
// with the chilled-water pumps beside them. Own meshes (not the merged site),
// so one chiller can turn red for its alarm or open up: double-click it
// (picking/PickProxies) and its shells go see-through to show the tube bundles,
// the compressor impeller and the refrigerant loop, each labelled. A plant house
// encloses them — cut open (no roof, low walls) in Back of House so they read
// from above, closed with a roof everywhere else.
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type RefObject, useLayoutEffect, useMemo, useRef } from "react";
import { type Group, type InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import { CHILLERS, PLANT_PAD_Y } from "@/data/assets";
import { plantAlarm } from "@/data/events";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useAppStore } from "@/store/useAppStore";
import type { Vec3 } from "@/types";
import { Hotspot } from "./Hotspot";

const COLOR = {
  skid: "#39434c",
  shell: "#8197a4",
  insulated: "#2c3238",
  waterBox: "#5b6d78",
  motor: "#56616b",
  volute: "#8d9ba5",
  panel: "#d3dadd",
  screen: "#5aa9ff",
  chw: "#4ea3ff",
  cw: "#36b88a",
  coldTube: "#6db5ff",
  hotTube: "#ff9a5a",
  refrigerant: "#ffd166",
  alarm: "#ff4d5a",
};

/** Shell geometry in the chiller's local frame (origin: pad top under its centre, long axis along x) */
const EVAP = { y: 1.0, z: -0.78, r: 0.68 };
const COND = { y: 1.0, z: 0.82, r: 0.6 };
const SHELL_LEN = 7.8;
/** Header lines along z, east of the chillers (local x) — chilled water, then condenser water */
const CHW_X = 6.0;
const CW_X = 6.9;
const CHW_Y = [0.45, 1.55] as const;
const CW_Y = [0.8, 1.2] as const;

type Look = { open: boolean; alarm: boolean };

/** Standard material for a chiller part: see-through when opened up, red for the alarm */
function Mat({ color, look, glass = 0.18 }: { color: string; look: Look; glass?: number }) {
  const red = look.alarm && !look.open;
  return (
    // Keyed on open: three.js only recompiles a material for a new transparent flag when it is rebuilt
    <meshStandardMaterial
      key={look.open ? "open" : "solid"}
      color={red ? COLOR.alarm : color}
      emissive={red ? COLOR.alarm : "#000000"}
      emissiveIntensity={red ? 0.35 : 0}
      roughness={0.55}
      metalness={0.35}
      transparent={look.open}
      opacity={look.open ? glass : 1}
      depthWrite={!look.open}
    />
  );
}

/** Cylinder along local x */
function XCyl({
  p,
  r,
  len,
  color,
  look,
  glass,
}: {
  p: Vec3;
  r: number;
  len: number;
  color: string;
  look: Look;
  glass?: number;
}) {
  return (
    <mesh position={p} rotation={[0, 0, Math.PI / 2]} castShadow raycast={() => null}>
      <cylinderGeometry args={[r, r, len, 28]} />
      <Mat color={color} look={look} glass={glass} />
    </mesh>
  );
}

function Box({ p, s, color, look, glass }: { p: Vec3; s: Vec3; color: string; look: Look; glass?: number }) {
  return (
    <mesh position={p} castShadow raycast={() => null}>
      <boxGeometry args={s} />
      <Mat color={color} look={look} glass={glass} />
    </mesh>
  );
}

/** Pipe between two points (axis-aligned runs), always solid — the piping stays readable when a chiller opens */
function Pipe({ a, b, r, color }: { a: Vec3; b: Vec3; r: number; color: string }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const rot: Vec3 = b[0] !== a[0] ? [0, 0, Math.PI / 2] : b[2] !== a[2] ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={mid} rotation={rot} castShadow raycast={() => null}>
      <cylinderGeometry args={[r, r, len, 14]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.4} />
    </mesh>
  );
}

const m4 = new Matrix4();
const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
const v3 = new Vector3();
const one = new Vector3(1, 1, 1);

/** Tubes inside a shell, on a staggered grid — chilled water in the evaporator, warm condenser water in the condenser */
function TubeBundle({ y, z, r, color }: { y: number; z: number; r: number; color: string }) {
  const ref = useRef<InstancedMesh>(null);
  const spots = useMemo(() => {
    const pitch = 0.13;
    const out: [number, number][] = [];
    for (let row = -6; row <= 6; row++)
      for (let col = -6; col <= 6; col++) {
        const dy = row * pitch * 0.87;
        const dz = col * pitch + (row % 2 ? pitch / 2 : 0);
        if (Math.hypot(dy, dz) < r * 0.8) out.push([dy, dz]);
      }
    return out;
  }, [r]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    spots.forEach(([dy, dz], i) => mesh.setMatrixAt(i, m4.compose(v3.set(0, y + dy, z + dz), q, one)));
    mesh.instanceMatrix.needsUpdate = true;
  }, [spots, y, z]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} raycast={() => null}>
      <cylinderGeometry args={[0.035, 0.035, SHELL_LEN - 0.3, 6]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.4} metalness={0.6} />
    </instancedMesh>
  );
}

/** Centrifugal impeller in the volute; turns while the chiller is open (still with reduced motion) */
function Impeller({ still }: { still: boolean }) {
  const ref = useRef<Group>(null);
  useFrame(({ invalidate }, delta) => {
    if (still || !ref.current) return;
    ref.current.rotation.x += delta * 3;
    invalidate();
  });
  return (
    <group ref={ref} position={[0.55, 2.3, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} raycast={() => null}>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 24]} />
        <meshStandardMaterial color="#c9d3d8" metalness={0.8} roughness={0.25} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} rotation={[(i * Math.PI) / 4, 0, 0]} position={[0.06, 0, 0]} raycast={() => null}>
          <boxGeometry args={[0.1, 0.72, 0.04]} />
          <meshStandardMaterial color="#e6edf0" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** Refrigerant loop: evaporator → compressor → condenser → expansion valve → evaporator */
const LOOP: Vec3[] = [
  [1.25, EVAP.y + EVAP.r, EVAP.z + 0.2],
  [1.25, 2.3, EVAP.z + 0.2],
  [0.55, 2.3, -0.05],
  [0.55, 2.3, 0.4],
  [0.55, COND.y + COND.r, COND.z],
  [3.0, COND.y - COND.r, COND.z],
  [3.0, 0.55, 0],
  [3.0, EVAP.y - EVAP.r, EVAP.z],
  [1.25, EVAP.y + EVAP.r, EVAP.z + 0.2],
];

function Chiller({
  index,
  look,
  portal,
  still,
  alarmNote,
}: {
  index: number;
  look: Look;
  portal: RefObject<HTMLElement | null>;
  still: boolean;
  alarmNote?: string;
}) {
  const c = CHILLERS[index];
  return (
    <group position={[c.x, PLANT_PAD_Y, c.z]}>
      {/* Skid: two rails and cross members */}
      {[-1.3, 1.3].map((z) => (
        <Box key={z} p={[0, 0.11, z]} s={[9.2, 0.22, 0.25]} color={COLOR.skid} look={{ ...look, alarm: false }} />
      ))}
      {[-4, 0, 4].map((x) => (
        <Box key={x} p={[x, 0.11, 0]} s={[0.25, 0.22, 2.85]} color={COLOR.skid} look={{ ...look, alarm: false }} />
      ))}
      {/* Saddles under the shells */}
      {[-2.8, 2.8].map((x) =>
        [EVAP, COND].map((sh) => (
          <Box
            key={`${x}${sh.z}`}
            p={[x, 0.22 + (sh.y - sh.r - 0.22) / 2 + 0.05, sh.z]}
            s={[0.35, sh.y - sh.r - 0.12, 1.0]}
            color={COLOR.skid}
            look={{ ...look, alarm: false }}
          />
        )),
      )}
      {/* Evaporator (insulated) and condenser shells, water boxes at both ends */}
      <XCyl p={[0, EVAP.y, EVAP.z]} r={EVAP.r} len={SHELL_LEN} color={COLOR.insulated} look={look} />
      <XCyl p={[0, COND.y, COND.z]} r={COND.r} len={SHELL_LEN} color={COLOR.shell} look={look} />
      {[-1, 1].map((s) =>
        [EVAP, COND].map((sh) => (
          <XCyl
            key={`${s}${sh.z}`}
            p={[s * (SHELL_LEN / 2 + 0.15), sh.y, sh.z]}
            r={sh.r + 0.06}
            len={0.3}
            color={COLOR.waterBox}
            look={look}
            glass={0.3}
          />
        )),
      )}
      {/* Compressor: frame, motor, volute, suction from the evaporator, discharge to the condenser */}
      <Box p={[0, 1.78, 0]} s={[2.6, 0.2, 1.1]} color={COLOR.skid} look={{ ...look, alarm: false }} />
      <XCyl p={[-0.7, 2.3, 0]} r={0.42} len={1.7} color={COLOR.motor} look={look} glass={0.22} />
      <mesh position={[0.55, 2.3, 0]} scale={[0.75, 1, 1]} castShadow raycast={() => null}>
        <sphereGeometry args={[0.58, 24, 16]} />
        <Mat color={COLOR.volute} look={look} glass={0.22} />
      </mesh>
      <Box
        p={[1.25, (EVAP.y + EVAP.r + 2.3) / 2, EVAP.z + 0.2]}
        s={[0.4, 2.3 - EVAP.y - EVAP.r, 0.4]}
        color={COLOR.volute}
        look={look}
        glass={0.25}
      />
      <Box
        p={[0.55, (COND.y + COND.r + 2.0) / 2, 0.45]}
        s={[0.34, 2.0 - COND.y - COND.r + 0.1, 0.34]}
        color={COLOR.volute}
        look={look}
        glass={0.25}
      />
      {/* Expansion valve between the shells, control panel at the west end */}
      <mesh position={[3.0, 0.55, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.16, 0.16, 0.5, 14]} />
        <Mat color={COLOR.motor} look={look} glass={0.5} />
      </mesh>
      <Box p={[-4.45, 1.02, 0]} s={[0.45, 1.6, 1.1]} color={COLOR.panel} look={{ ...look, alarm: false }} glass={0.5} />
      <mesh position={[-4.69, 1.35, 0]} raycast={() => null}>
        <boxGeometry args={[0.02, 0.4, 0.6]} />
        <meshBasicMaterial color={COLOR.screen} toneMapped={false} />
      </mesh>
      {/* Nozzles to the headers: chilled water from the evaporator, condenser water from the condenser */}
      {CHW_Y.map((y) => (
        <Pipe key={y} a={[SHELL_LEN / 2 + 0.3, y, EVAP.z]} b={[CHW_X, y, EVAP.z]} r={0.13} color={COLOR.chw} />
      ))}
      {CW_Y.map((y) => (
        <Pipe key={y} a={[SHELL_LEN / 2 + 0.3, y, COND.z]} b={[CW_X, y, COND.z]} r={0.12} color={COLOR.cw} />
      ))}

      {look.open && (
        <>
          <TubeBundle y={EVAP.y} z={EVAP.z} r={EVAP.r} color={COLOR.coldTube} />
          <TubeBundle y={COND.y} z={COND.z} r={COND.r} color={COLOR.hotTube} />
          <Impeller still={still} />
          <Line points={LOOP} color={COLOR.refrigerant} lineWidth={3} depthTest={false} renderOrder={10} />
        </>
      )}
      {look.open &&
        [
          {
            p: [2.4, EVAP.y + EVAP.r + 0.1, EVAP.z - 0.3] as Vec3,
            title: "EVAPORATOR",
            detail: "Chilled water 12 → 7 °C · tube bundle",
          },
          {
            p: [1.2, COND.y + COND.r + 0.1, COND.z + 0.4] as Vec3,
            title: "CONDENSER",
            detail: alarmNote ?? "Condenser water 32 → 37 °C · tube bundle",
          },
          { p: [0.2, 3.1, 0] as Vec3, title: "COMPRESSOR", detail: "Centrifugal · motor + impeller" },
          { p: [3.0, 0.9, 0] as Vec3, title: "EXPANSION VALVE", detail: "Refrigerant back to the evaporator" },
          { p: [-4.6, 0.6, -0.6] as Vec3, title: "CONTROL PANEL", detail: "Chiller controller → BMS" },
        ].map((l) => <Hotspot key={l.title} position={l.p} title={l.title} detail={l.detail} portal={portal} />)}
    </group>
  );
}

/** Chilled-water and condenser-water headers along the plant, and the chilled-water pumps */
function Headers() {
  const x0 = CHILLERS[0].x;
  const z0 = CHILLERS[0].z - 2.5;
  const z1 = CHILLERS[CHILLERS.length - 1].z + 2.5;
  const y = PLANT_PAD_Y;
  return (
    <>
      {CHW_Y.map((h) => (
        <Pipe key={`chw${h}`} a={[x0 + CHW_X, y + h, z0]} b={[x0 + CHW_X, y + h, z1]} r={0.2} color={COLOR.chw} />
      ))}
      {CW_Y.map((h) => (
        <Pipe key={`cw${h}`} a={[x0 + CW_X, y + h, z0]} b={[x0 + CW_X, y + h, z1]} r={0.18} color={COLOR.cw} />
      ))}
      {CHILLERS.map((c) => (
        <group key={c.id} position={[x0 + 8.4, y, c.z]}>
          <mesh position={[0, 0.35, 0]} castShadow raycast={() => null}>
            <boxGeometry args={[1.0, 0.7, 0.8]} />
            <meshStandardMaterial color={COLOR.skid} roughness={0.6} />
          </mesh>
          <mesh position={[-0.2, 0.95, 0]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={() => null}>
            <cylinderGeometry args={[0.28, 0.28, 0.8, 18]} />
            <meshStandardMaterial color={COLOR.chw} roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Plant house on the pad edge (geometry/site.ts pad: x 48–66, z −31.5…−8.5) */
const HOUSE = { x0: 48.3, x1: 65.7, z0: -31.2, z1: -8.8, height: 6.2, cut: 2.4, wall: 0.3 };
const HOUSE_COLOR = {
  wall: "#c9cfd2",
  cut: "#3a4650",
  louvre: "#7c8a93",
  roof: "#9aa5ab",
  door: "#6f7b84",
  sign: "#1c2a36",
};

/**
 * The building round the chillers. In Back of House (and inside a chiller) it shows as a section — no roof, walls cut
 * at 2.4 m with a dark cut band — so the plant reads from above; elsewhere it is a closed plant house with louvres.
 * No shadows: the static shadow map would keep the roof's shadow once the roof comes off.
 */
function PlantHouse({ section }: { section: boolean }) {
  const { x0, x1, z0, z1, wall: t } = HOUSE;
  const h = section ? HOUSE.cut : HOUSE.height;
  const y = PLANT_PAD_Y;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = x1 - x0;
  const d = z1 - z0;
  // North wall has the roller door: two piers either side of it
  const door = { x0: 54, x1: 60 };
  const walls: { p: Vec3; s: Vec3 }[] = [
    { p: [cx, y + h / 2, z0], s: [w, h, t] },
    { p: [x0, y + h / 2, cz], s: [t, h, d] },
    { p: [x1, y + h / 2, cz], s: [t, h, d] },
    { p: [(x0 + door.x0) / 2, y + h / 2, z1], s: [door.x0 - x0, h, t] },
    { p: [(door.x1 + x1) / 2, y + h / 2, z1], s: [x1 - door.x1, h, t] },
  ];
  return (
    <group>
      {walls.map((wl, i) => (
        <group key={i}>
          <mesh position={wl.p} receiveShadow raycast={() => null}>
            <boxGeometry args={wl.s} />
            <meshStandardMaterial color={HOUSE_COLOR.wall} roughness={0.85} />
          </mesh>
          {section && (
            // Cut band on top of the sectioned wall
            <mesh position={[wl.p[0], y + h + 0.03, wl.p[2]]} raycast={() => null}>
              <boxGeometry args={[wl.s[0] + 0.02, 0.06, wl.s[2] + 0.02]} />
              <meshBasicMaterial color={HOUSE_COLOR.cut} />
            </mesh>
          )}
        </group>
      ))}
      {!section && (
        <>
          {/* Above the door, louvre bands on the long walls, roof slab with a parapet, the sign */}
          <mesh position={[(door.x0 + door.x1) / 2, y + 4.6, z1]} raycast={() => null}>
            <boxGeometry args={[door.x1 - door.x0, 3.2, t]} />
            <meshStandardMaterial color={HOUSE_COLOR.wall} roughness={0.85} />
          </mesh>
          <mesh position={[(door.x0 + door.x1) / 2, y + 1.5, z1]} raycast={() => null}>
            <boxGeometry args={[door.x1 - door.x0, 3.0, t * 0.5]} />
            <meshStandardMaterial color={HOUSE_COLOR.door} roughness={0.6} metalness={0.4} />
          </mesh>
          {[x0, x1].map((x) =>
            Array.from({ length: 6 }, (_, k) => (
              <mesh
                key={`${x}-${k}`}
                position={[x + (x === x0 ? -0.18 : 0.18), y + 3.2 + k * 0.38, cz]}
                rotation={[0, 0, x === x0 ? 0.5 : -0.5]}
                raycast={() => null}
              >
                <boxGeometry args={[0.05, 0.3, d * 0.8]} />
                <meshStandardMaterial color={HOUSE_COLOR.louvre} roughness={0.6} metalness={0.4} />
              </mesh>
            )),
          )}
          <mesh position={[cx, y + h + 0.15, cz]} raycast={() => null}>
            <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
            <meshStandardMaterial color={HOUSE_COLOR.roof} roughness={0.9} />
          </mesh>
          <mesh position={[(door.x0 + door.x1) / 2, y + 3.6, z1 + 0.2]} raycast={() => null}>
            <boxGeometry args={[4.6, 0.7, 0.06]} />
            <meshStandardMaterial color={HOUSE_COLOR.sign} roughness={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
}

export function ChillerPlant({ portal }: { portal: RefObject<HTMLElement | null> }) {
  // Back of House, and the inside view, look into the plant house from above
  const section = useAppStore((s) => s.view === "boh" || s.chillerView !== null);
  const open = useAppStore((s) => s.chillerView);
  // CH-01 turns red in Back of House while its alarm is open (the alarm card points at it, AlarmCallout)
  const alarm = useAppStore((s) => s.view === "boh" && plantAlarm(s.incidents, s.incidentFocus)?.device === "plant");
  const reading = useAppStore((s) => s.incidents.find((e) => e.device === "plant" && e.status < 3)?.reading);
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <>
      {CHILLERS.map((c, i) => (
        <Chiller
          key={c.id}
          index={i}
          look={{ open: open === i, alarm: alarm && i === 0 }}
          portal={portal}
          still={still}
          alarmNote={
            i === 0 && reading
              ? `${reading.metric} ${reading.value} (limit ${reading.threshold}) · check approach`
              : undefined
          }
        />
      ))}
      <Headers />
      <PlantHouse section={section} />
    </>
  );
}
