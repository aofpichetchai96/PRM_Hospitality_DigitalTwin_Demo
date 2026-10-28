"use client";

// Street life: vehicles that follow each other and stop at red lights and the
// avenue crosswalk, traffic lights that cycle, and people who walk with
// swinging arms and legs into the arrival hall, along the plaza, over the
// zebra and across the skywalk. Everything is instanced and updated every
// frame, so while mounted the canvas renders continuously (SceneRoot leaves it
// out on Low quality; reduced motion turns it off).
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { PERSON, vehicleModels } from "./geometry/ambientModels";
import {
  along,
  crosswalkOpen,
  type Light,
  type Person,
  people,
  personAt,
  roadY,
  routeLength,
  signalFor,
  signalHeads,
  TRAFFIC_RADIUS,
  trafficLanes,
  VEHICLE_LENGTH,
  type VehicleKind,
} from "./geometry/traffic";
import type { TimeOfDay } from "./look";

const SPAN = TRAFFIC_RADIUS * 2;
const wrap = (v: number, n: number) => ((v % n) + n) % n;
const color = new Color();
const m = new Matrix4();
const base = new Matrix4();
const local = new Matrix4();
const pos = new Vector3();
const face = new Vector3();
const quat = new Quaternion();
const scl = new Vector3();
const euler = new Euler();
const Y = new Vector3(0, 1, 0);

/** Lamps light up at dusk (Bloom picks values above 1) */
function lampMaterial(time: TimeOfDay) {
  const k = time === "dusk" ? 2.4 : 1;
  return new MeshBasicMaterial({ vertexColors: true, toneMapped: time === "day", color: new Color(k, k, k) });
}

// ------------------------------------------------------------------- traffic

const KINDS = Object.keys(VEHICLE_LENGTH) as VehicleKind[];

function Traffic({ time }: { time: TimeOfDay }) {
  const lanes = useMemo(() => trafficLanes(), []);
  const models = useMemo(() => vehicleModels(), []);
  // Per-vehicle slot in its kind's meshes, and the kinds' instance counts
  const { slots, counts } = useMemo(() => {
    const next = new Map<VehicleKind, number>(KINDS.map((k) => [k, 0]));
    const slots = lanes.map((lane) =>
      lane.vehicles.map((v) => {
        const slot = next.get(v.kind)!;
        next.set(v.kind, slot + 1);
        return slot;
      }),
    );
    return { slots, counts: next };
  }, [lanes]);
  // Moving state lives in a ref: position along the lane and speed
  const state = useRef(lanes.map((lane) => lane.vehicles.map((v) => ({ along: v.offset % SPAN, v: lane.speed }))));
  const lamps = useMemo(() => lampMaterial(time), [time]);
  const bodies = useRef(new Map<VehicleKind, InstancedMesh>());
  const lights = useRef(new Map<VehicleKind, InstancedMesh>());

  useLayoutEffect(() => {
    lanes.forEach((lane, li) =>
      lane.vehicles.forEach((v, vi) => {
        bodies.current.get(v.kind)?.setColorAt(slots[li][vi], color.setRGB(v.color[0], v.color[1], v.color[2]));
      }),
    );
    for (const mesh of bodies.current.values()) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [lanes, slots]);
  useLayoutEffect(() => () => lamps.dispose(), [lamps]);

  useFrame(({ clock, invalidate }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const crosswalk = crosswalkOpen(t);
    lanes.forEach((lane, li) => {
      const cars = state.current[li];
      const yaw = lane.axis === "x" ? (lane.dir > 0 ? 0 : Math.PI) : lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const light: Light = signalFor(lane.axis, t);
      quat.setFromAxisAngle(Y, yaw);
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const kind = lane.vehicles[i].kind;
        const len = VEHICLE_LENGTH[kind];
        const li2 = (i + 1) % cars.length;
        const lead = cars[li2];
        const leadAlong = lead.along + (lead.along <= c.along ? SPAN : 0);
        let free = leadAlong - VEHICLE_LENGTH[lane.vehicles[li2].kind] / 2 - (c.along + len / 2) - 2.2;
        // Stop lines ahead: before a cross street on red / late amber, before the zebra while it's open
        const world = lane.dir > 0 ? c.along - TRAFFIC_RADIUS : TRAFFIC_RADIUS - c.along;
        for (const s of lane.stops) {
          const ahead = (s.at - world) * lane.dir - s.half - 1.5 - len / 2;
          if (ahead < -0.5 || ahead > 60) continue;
          const hold = s.signal === "crosswalk" ? crosswalk : light === "red" || (light === "amber" && ahead > 9);
          if (hold) free = Math.min(free, ahead);
        }
        const target = lane.speed * Math.min(1, Math.max(0, (free - 0.5) / (lane.speed * 1.4)));
        c.v += Math.max(-7 * dt, Math.min(2.6 * dt, target - c.v));
        if (free < 0.2) c.v = 0;
        c.along = wrap(c.along + Math.max(0, c.v) * dt, SPAN);

        const coord = (c.along - TRAFFIC_RADIUS) * lane.dir;
        const [x, z] = lane.axis === "x" ? [coord, lane.at] : [lane.at, coord];
        m.compose(pos.set(x, roadY(x, z), z), quat, scl.set(1, 1, 1));
        bodies.current.get(kind)?.setMatrixAt(slots[li][i], m);
        lights.current.get(kind)?.setMatrixAt(slots[li][i], m);
      }
    });
    for (const mesh of bodies.current.values()) mesh.instanceMatrix.needsUpdate = true;
    for (const mesh of lights.current.values()) mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  });

  return (
    <>
      {KINDS.map((k) => {
        const n = counts.get(k)!;
        if (!n) return null;
        const model = models.get(k)!;
        return (
          <group key={k}>
            <instancedMesh
              ref={(mesh) => {
                if (mesh) bodies.current.set(k, mesh);
              }}
              args={[model.body, undefined, n]}
              frustumCulled={false}
              raycast={() => null}
            >
              <meshStandardMaterial vertexColors roughness={0.42} metalness={0.25} />
            </instancedMesh>
            <instancedMesh
              ref={(mesh) => {
                if (mesh) lights.current.set(k, mesh);
              }}
              args={[model.lamps, lamps, n]}
              frustumCulled={false}
              raycast={() => null}
            />
          </group>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------ traffic lights

const SIGNAL_POST = mergeGeometries(
  [
    new CylinderGeometry(0.08, 0.1, 5.6, 8).toNonIndexed().translate(0, 2.8, 0),
    new BoxGeometry(0.36, 1.0, 0.28).toNonIndexed().translate(0, 5.45, 0),
  ].map((g) => (g.deleteAttribute("uv"), g)),
)!;
const SIGNAL_LAMP = new SphereGeometry(0.12, 10, 8);
const LAMP_Y: Record<Light, number> = { red: 5.78, amber: 5.45, green: 5.12 };
const LAMP_RGB: Record<Light, [number, number, number]> = {
  red: [2.2, 0.25, 0.2],
  amber: [2.2, 1.3, 0.2],
  green: [0.3, 2.0, 0.9],
};

function TrafficLights() {
  const heads = useMemo(() => signalHeads(), []);
  const posts = useRef<InstancedMesh>(null);
  const lampsRef = useRef<InstancedMesh>(null);
  const shown = useRef("");

  useLayoutEffect(() => {
    const mesh = posts.current;
    if (!mesh) return;
    heads.forEach((h, i) => {
      m.compose(pos.set(h.x, -0.35, h.z), quat.setFromAxisAngle(Y, h.yaw), scl.set(1, 1, 1));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [heads]);

  useFrame(({ clock, invalidate }) => {
    const mesh = lampsRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const key = `${signalFor("x", t)}-${signalFor("z", t)}`;
    if (key === shown.current) return;
    shown.current = key;
    heads.forEach((h, i) => {
      const light = signalFor(h.axis, t);
      quat.setFromAxisAngle(Y, h.yaw);
      // Lamp on the face of the housing that looks at the approaching traffic
      face.set(0, 0, 0.15).applyQuaternion(quat);
      m.compose(pos.set(h.x + face.x, -0.35 + LAMP_Y[light], h.z + face.z), quat, scl.set(1, 1, 1));
      mesh.setMatrixAt(i, m);
      const [r, g, b] = LAMP_RGB[light];
      mesh.setColorAt(i, color.setRGB(r, g, b));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  });

  return (
    <>
      <instancedMesh
        ref={posts}
        args={[SIGNAL_POST, undefined, heads.length]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshStandardMaterial color="#2a3036" roughness={0.6} metalness={0.4} />
      </instancedMesh>
      <instancedMesh
        ref={lampsRef}
        args={[SIGNAL_LAMP, undefined, heads.length]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

// -------------------------------------------------------------------- people

/** A little over life size so people read from the orbit distance */
const PERSON_SCALE = 1.2;
/** Metres per full stride cycle (two steps) */
const STRIDE = 1.45;

type Part = "torso" | "hips" | "head" | "hair" | "legL" | "legR" | "armL" | "armR" | "bag";
const PARTS: [Part, BoxGeometry | SphereGeometry, number][] = [
  ["torso", PERSON.torso, 0.85],
  ["hips", PERSON.hips, 0.85],
  ["legL", PERSON.leg, 0.85],
  ["legR", PERSON.leg, 0.85],
  ["armL", PERSON.arm, 0.85],
  ["armR", PERSON.arm, 0.85],
  ["head", PERSON.head, 0.7],
  ["hair", PERSON.hair, 0.6],
  ["bag", PERSON.bag, 0.6],
];

/** Where a figure is at time t: position and heading (shared with the lobby heatmap) */
export function figureAt(p: Person & { length: number }, t: number) {
  const { d, walking, back } = personAt(p, p.length, t);
  const at = along(p.route, d);
  return { p: at.p, d, walking, yaw: p.length === 0 ? (p.yaw ?? 0) : at.yaw + (back ? Math.PI : 0) };
}

/**
 * Walking and standing people, instanced per body part. `still`: drawn once
 * where they stand at t = 0 (reduced motion) instead of every frame.
 */
export function Crowd({ people: list, still = false }: { people: readonly Person[]; still?: boolean }) {
  const crowd = useMemo(() => list.map((p) => ({ ...p, length: routeLength(p.route) })), [list]);
  const refs = useRef(new Map<Part, InstancedMesh>());
  const drawn = useRef<unknown>(null);

  useLayoutEffect(() => {
    const paint = (part: Part, pick: (i: number) => readonly number[]) => {
      const mesh = refs.current.get(part);
      if (!mesh) return;
      for (let i = 0; i < crowd.length; i++) {
        const c = pick(i);
        mesh.setColorAt(i, color.setRGB(c[0], c[1], c[2]));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    paint("torso", (i) => crowd[i].shirt);
    paint("armL", (i) => crowd[i].shirt);
    paint("armR", (i) => crowd[i].shirt);
    paint("hips", (i) => crowd[i].trousers);
    paint("legL", (i) => crowd[i].trousers);
    paint("legR", (i) => crowd[i].trousers);
    paint("head", (i) => crowd[i].skin);
    paint("hair", (i) => crowd[i].hair);
    paint("bag", (i) => crowd[i].bag ?? [1, 1, 1]);
  }, [crowd]);

  useFrame(({ clock, invalidate }) => {
    if (still && drawn.current === crowd) return;
    drawn.current = crowd;
    const t = still ? 0 : clock.elapsedTime;
    const r = refs.current;
    crowd.forEach((p, i) => {
      const { p: at, d, walking, yaw } = figureAt(p, t);
      const phase = (d / STRIDE) * Math.PI * 2 + i;
      const swing = walking ? Math.sin(phase) * 0.5 : 0;
      // Standing people shift their weight and gesture a little
      const idle = walking ? 0 : Math.sin(t * 1.3 + i * 1.7) * 0.06;
      const bob = walking ? Math.abs(Math.cos(phase)) * 0.035 : 0;
      base.compose(
        pos.set(at[0], at[1] + bob, at[2]),
        quat.setFromAxisAngle(Y, yaw),
        scl.setScalar(p.height * PERSON_SCALE),
      );
      for (const part of ["torso", "hips", "head", "hair"] as const) r.get(part)?.setMatrixAt(i, base);
      const limb = (part: Part, x: number, y: number, angle: number, hide = false) => {
        local.compose(pos.set(x, y, 0), quat.setFromEuler(euler.set(angle, 0, 0)), scl.setScalar(hide ? 0 : 1));
        r.get(part)?.setMatrixAt(i, m.multiplyMatrices(base, local));
      };
      limb("legL", -PERSON.hipX, PERSON.hipY, swing);
      limb("legR", PERSON.hipX, PERSON.hipY, -swing);
      limb("armL", -PERSON.shoulderX, PERSON.shoulderY, -swing * 0.75 + idle);
      limb("armR", PERSON.shoulderX, PERSON.shoulderY, swing * 0.75 - idle);
      // The bag swings with the right hand, a bit less
      limb("bag", PERSON.shoulderX, PERSON.shoulderY, swing * 0.5, !p.bag);
    });
    for (const mesh of r.values()) mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  });

  return (
    <>
      {PARTS.map(([part, geometry, roughness]) => (
        <instancedMesh
          key={part}
          ref={(mesh) => {
            if (mesh) refs.current.set(part, mesh);
          }}
          args={[geometry, undefined, crowd.length]}
          frustumCulled={false}
          raycast={() => null}
        >
          <meshStandardMaterial roughness={roughness} />
        </instancedMesh>
      ))}
    </>
  );
}

function Pedestrians() {
  const crowd = useMemo(() => people(), []);
  return <Crowd people={crowd} />;
}

export function AmbientLife({ time }: { time: TimeOfDay }) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  if (reduced) return null;
  return (
    <>
      <Traffic time={time} />
      <TrafficLights />
      <Pedestrians />
    </>
  );
}
