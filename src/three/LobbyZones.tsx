"use client";

// Public Area on the sliced Lobby floor (G): people walking and waiting
// (one figure per few people of each zone count), a heatmap of where they are
// right now — drawn only inside the lobby zones, never outdoors — each zone's
// outline and a label with its people count and AQI. Same readings as the right
// panel (selectPublic). The heatmap texture is redrawn twice a second.
import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, type MeshBasicMaterial, SRGBColorSpace } from "three";
import { aqiBand } from "@/data/airQuality";
import { type PublicZoneId, PUBLIC_ZONES, zoneCentre, type ZoneReading } from "@/data/publicZones";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { usePublic } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { Crowd, figureAt } from "./AmbientLife";
import { lobbyCrowd } from "./geometry/lobbyLife";
import { type Person, routeLength } from "./geometry/traffic";
import { Hotspot, type HotspotTone } from "./Hotspot";

/** Just above the lobby floor finish (0.525 m), under the furniture */
const FLOOR_Y = 0.62;
/** Heatmap canvas covers the podium G plate */
const PLATE = { x0: -43, x1: 43, z0: -25, z1: 25 } as const;
const PX_PER_M = 6;

const BORDER: Record<ZoneReading["level"], string> = {
  low: "#69d7a8",
  moderate: "#dfbd7e",
  high: "#f2a065",
  crowded: "#ff7c81",
};

/** Heat radius around each figure (m) and how much one figure adds */
const HEAT_RADIUS = 3.2;
const HEAT_PER_FIGURE = 0.22;
const REDRAW_S = 0.5;

/** Figures as warm blobs, clipped to the lobby zones; summed density ramps green → amber → red */
function drawHeat(ctx: CanvasRenderingContext2D, points: readonly (readonly number[])[]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const px = (x: number) => (x - PLATE.x0) * PX_PER_M;
  const pz = (z: number) => (z - PLATE.z0) * PX_PER_M;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  // Indoors only: everything outside the zone rectangles stays clear
  ctx.beginPath();
  for (const { rect } of PUBLIC_ZONES)
    ctx.rect(px(rect.x0), pz(rect.z0), (rect.x1 - rect.x0) * PX_PER_M, (rect.z1 - rect.z0) * PX_PER_M);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  const r = HEAT_RADIUS * PX_PER_M;
  for (const [x, , z] of points) {
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r);
    g.addColorStop(0, `rgba(255,255,255,${HEAT_PER_FIGURE})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(px(x) - r, pz(z) - r, r * 2, r * 2);
  }
  ctx.restore();
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // The blobs are white, so their summed alpha is the density
    const v = Math.min(1, d[i + 3] / 255);
    d[i] = Math.round(80 + 175 * Math.min(1, v * 1.6));
    d[i + 1] = Math.round(215 - 170 * Math.max(0, v - 0.45) * 2.2);
    d[i + 2] = Math.round(150 * (1 - v));
    d[i + 3] = Math.round(200 * Math.min(1, v * 1.5));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.putImageData(img, 0, 0);
}

/** Heatmap of the figures' positions, redrawn every REDRAW_S (once when `still`) */
function Heatmap({ people, still }: { people: readonly Person[]; still: boolean }) {
  const crowd = useMemo(() => people.map((p) => ({ ...p, length: routeLength(p.route) })), [people]);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = (PLATE.x1 - PLATE.x0) * PX_PER_M;
    canvas.height = (PLATE.z1 - PLATE.z0) * PX_PER_M;
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  // The texture is redrawn through the material, the three object the frame loop may change
  const material = useRef<MeshBasicMaterial>(null);
  const last = useRef<{ t: number; crowd: unknown }>({ t: -Infinity, crowd: null });

  useFrame(({ clock, invalidate }) => {
    const t = still ? 0 : clock.elapsedTime;
    const prev = last.current;
    if (prev.crowd === crowd && (still || t - prev.t < REDRAW_S)) return;
    const map = material.current?.map;
    const ctx = (map?.image as HTMLCanvasElement | undefined)?.getContext("2d", { willReadFrequently: true });
    if (!map || !ctx) return;
    last.current = { t, crowd };
    drawHeat(
      ctx,
      crowd.map((p) => figureAt(p, t).p),
    );
    map.needsUpdate = true;
    invalidate();
  });

  return (
    <mesh
      position={[(PLATE.x0 + PLATE.x1) / 2, FLOOR_Y, (PLATE.z0 + PLATE.z1) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
      renderOrder={5}
    >
      <planeGeometry args={[PLATE.x1 - PLATE.x0, PLATE.z1 - PLATE.z0]} />
      <meshBasicMaterial ref={material} map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Zone outline as four thin strips on the floor, in the colour of its density */
function Outline({ reading }: { reading: ZoneReading }) {
  const { x0, x1, z0, z1 } = reading.zone.rect;
  const t = 0.28;
  const strips: [number, number, number, number][] = [
    [(x0 + x1) / 2, z0, x1 - x0, t],
    [(x0 + x1) / 2, z1, x1 - x0, t],
    [x0, (z0 + z1) / 2, t, z1 - z0],
    [x1, (z0 + z1) / 2, t, z1 - z0],
  ];
  return strips.map(([x, z, w, d], i) => (
    <mesh key={i} position={[x, FLOOR_Y + 0.04, z]} raycast={() => null} renderOrder={6}>
      <boxGeometry args={[w, 0.06, d]} />
      <meshBasicMaterial color={BORDER[reading.level]} toneMapped={false} />
    </mesh>
  ));
}

const TONE: Record<ZoneReading["level"], HotspotTone> = {
  low: "info",
  moderate: "info",
  high: "warning",
  crowded: "alert",
};

export function LobbyZones({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const shown = useAppStore((s) => s.view === "public" && s.mode === "slice" && s.floor === "G");
  if (!shown) return null;
  return <LobbyZoneLayer portal={portal} />;
}

function LobbyZoneLayer({ portal }: { portal: RefObject<HTMLElement | null> }) {
  const { zones } = usePublic();
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  // "entrance:24,lounge:73,…": the crowd is rebuilt only when a zone count changes
  const key = zones.map((z) => `${z.zone.id}:${z.people}`).join(",");
  const people = useMemo(
    () =>
      lobbyCrowd(
        Object.fromEntries(
          key
            .split(",")
            .map((e) => e.split(":"))
            .map(([id, n]) => [id, Number(n)]),
        ) as Record<PublicZoneId, number>,
      ),
    [key],
  );
  return (
    <>
      <Crowd people={people} still={still} />
      <Heatmap people={people} still={still} />
      {zones.map((z) => (
        <Outline key={z.zone.id} reading={z} />
      ))}
      {zones.map((z) => {
        const [x, zc] = z.zone.label ?? zoneCentre(z.zone);
        const band = aqiBand(z.air.aqi);
        return (
          <Hotspot
            key={z.zone.id}
            position={[x, 3.2, zc]}
            title={`${z.zone.name.toUpperCase()} · ${z.people} · AQI ${z.air.aqi} ${band.label}`}
            tone={TONE[z.level]}
            portal={portal}
          />
        );
      })}
    </>
  );
}
