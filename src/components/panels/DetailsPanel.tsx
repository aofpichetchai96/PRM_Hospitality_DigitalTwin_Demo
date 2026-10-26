"use client";

import { Gauge, type LucideIcon, Shield, Users, Wrench, Zap } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { ASSETS } from "@/data/assets";
import { selectAssetCard } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { LayerId } from "@/types";
import { EventList, SectionTitle } from "./common";

const LAYERS: [LayerId, LucideIcon, string][] = [
  ["energy", Zap, "Energy"],
  ["security", Shield, "Security"],
  ["people", Users, "People flow"],
  ["assets", Wrench, "Asset health"],
];

/** Layer toggles (prototype layersHtml L362); the 3D layers arrive in Phase 5 */
export function LayersPanel() {
  const layers = useAppStore((s) => s.layers);
  const toggle = useAppStore((s) => s.toggleLayer);
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {LAYERS.map(([id, Icon, label]) => (
        <button
          key={id}
          aria-pressed={layers[id]}
          onClick={() => toggle(id)}
          className={`flex items-center gap-2 rounded-[var(--radius-button)] border px-2.5 py-1.5 text-[13px] ${
            layers[id] ? "border-accent/50 text-text" : "border-line text-muted"
          }`}
        >
          <Icon size={14} /> {label}
          <span className={`ml-auto size-1.5 rounded-full ${layers[id] ? "bg-accent" : "bg-line"}`} />
        </button>
      ))}
    </div>
  );
}

/** Selected asset / floor with live metrics (prototype assetHtml L363) */
export function AssetCard() {
  const input = useAppStore(
    useShallow((s) => ({
      asset: s.asset,
      floor: s.floor,
      rooms: s.rooms,
      incidents: s.incidents,
      setpoint: s.setpoint,
      outdoor: s.outdoor,
      tariff: s.tariff,
      footfall: s.footfall,
      operatingHours: s.operatingHours,
    })),
  );
  const card = useMemo(() => selectAssetCard(input), [input]);
  const createWorkOrder = useAppStore((s) => s.createWorkOrder);
  const info = ASSETS[input.asset];

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{card.name}</p>
        <span className={`size-2 rounded-full ${info.status === "ok" ? "bg-green" : "bg-gold"}`} />
      </div>
      <p className="font-mono text-[10px] text-muted">{card.code} · SIMULATED ASSET</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {card.metrics.map((m) => (
          <div key={m.label}>
            <dt className="text-[11px] text-muted">{m.label}</dt>
            <dd className={`font-semibold tabular-nums ${m.status === "warn" ? "text-gold" : ""}`}>
              {m.value} {m.unit && <span className="text-[11px] font-normal text-muted">{m.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 h-1 rounded-full bg-line/60">
        <div className="h-full rounded-full bg-accent" style={{ width: `${info.health}%` }} />
      </div>
      <button
        onClick={() => createWorkOrder(card.code)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-line py-1.5 text-[13px] hover:border-accent/60"
      >
        <Gauge size={14} /> Create work order
      </button>
    </div>
  );
}

/** Layers + asset + open incidents — the details tab of every 3D view */
export function DetailsPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>Layers</SectionTitle>
        <LayersPanel />
      </section>
      <AssetCard />
      <section className="flex flex-col gap-1">
        <SectionTitle>เหตุการณ์ค้าง</SectionTitle>
        <EventList limit={4} />
      </section>
    </div>
  );
}
