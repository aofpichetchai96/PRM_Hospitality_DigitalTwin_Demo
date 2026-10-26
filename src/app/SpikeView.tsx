"use client";

// Phase 1 spike page: full-screen 3D with a dev panel for camera presets,
// day / dusk, quality levels and an FPS benchmark. Replaced by AppShell in Phase 4.
import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
import type { FpsSample } from "@/three/FpsProbe";
import { QUALITY_LABEL, type Quality, type TimeOfDay } from "@/three/look";
import { CAMERA_PRESETS, type CameraPresetId } from "@/three/presets";
import type { SceneSettings } from "@/three/SceneRoot";

const Viewport = dynamic(() => import("@/three/Viewport"), { ssr: false });

let renderer: string | null = null;
function readRenderer() {
  if (renderer) return renderer;
  const gl = document.createElement("canvas").getContext("webgl2", { powerPreference: "high-performance" });
  const info = gl?.getExtension("WEBGL_debug_renderer_info");
  renderer = gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "WebGL2 unavailable";
  return renderer;
}
const noSubscribe = () => () => {};

const BENCHMARK_SECONDS = 10;

function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-[var(--radius-button)] border px-2 py-0.5 ${o === value ? "border-accent bg-accent text-bg" : "border-line"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function SpikeView() {
  const [settings, setSettings] = useState<SceneSettings>({
    time: "day",
    quality: "high",
    camera: { preset: "all", n: 0 },
    autoRotate: false,
  });
  const [bench, setBench] = useState<{ samples: FpsSample[]; result?: string } | null>(null);
  const [sample, setSample] = useState<FpsSample | null>(null);
  const gpu = useSyncExternalStore(noSubscribe, readRenderer, () => null);
  const set = (patch: Partial<SceneSettings>) => setSettings((s) => ({ ...s, ...patch }));

  // Stable identity so the 1 Hz samples do not re-render the scene graph
  const onSample = useCallback((s: FpsSample) => {
    setSample(s);
    setBench((b) => {
      if (!b || b.result) return b;
      const samples = [...b.samples, s];
      if (samples.length < BENCHMARK_SECONDS) return { samples };
      // Drop the first second (shader compile / warm-up)
      const steady = samples.slice(1);
      const avg = steady.reduce((n, x) => n + x.fps, 0) / steady.length;
      const min = Math.min(...steady.map((x) => x.fps));
      return { samples, result: `avg ${avg.toFixed(1)} fps · min ${min.toFixed(1)} fps · ${s.calls} draw calls` };
    });
  }, []);

  // The benchmark orbits the building until it has a result
  const benchmarking = bench !== null && !bench.result;
  const sceneSettings = benchmarking ? { ...settings, autoRotate: true } : settings;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Viewport settings={sceneSettings} onSample={onSample} />

      <aside className="absolute top-3 left-3 flex w-80 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-panel/90 p-3 text-xs backdrop-blur">
        <header>
          <p className="tracking-widest text-muted uppercase">Phase 1 · 3D spike + look-dev</p>
          <p className="font-mono break-all text-muted">{gpu ?? "…"}</p>
        </header>

        <section className="flex flex-col gap-1">
          <span className="text-muted">Camera preset</span>
          <Toggle
            value={settings.camera.preset}
            options={Object.keys(CAMERA_PRESETS) as CameraPresetId[]}
            onChange={(preset) => set({ camera: { preset, n: settings.camera.n + 1 } })}
          />
        </section>

        <section className="flex flex-col gap-1">
          <span className="text-muted">Time of day</span>
          <Toggle<TimeOfDay> value={settings.time} options={["day", "dusk"]} onChange={(time) => set({ time })} />
        </section>

        <section className="flex flex-col gap-1">
          <span className="text-muted">Quality</span>
          <Toggle<Quality>
            value={settings.quality}
            options={["high", "medium", "low"]}
            onChange={(quality) => set({ quality })}
          />
          <span className="text-muted">{QUALITY_LABEL[settings.quality]}</span>
        </section>

        <section className="flex flex-col gap-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoRotate}
              onChange={(e) => set({ autoRotate: e.target.checked })}
            />
            Auto-rotate
          </label>
          <button
            className="rounded-[var(--radius-button)] border border-accent px-2 py-1 text-accent"
            onClick={() => setBench({ samples: [] })}
          >
            Benchmark {BENCHMARK_SECONDS} s (auto-rotate)
          </button>
          <p className="font-mono" data-testid="fps">
            {sample
              ? // Frames are rendered on demand, so an idle scene reports ~0–2 fps by design
                `${sample.fps < 5 ? "idle" : `${sample.fps.toFixed(0)} fps`} · ${sample.calls} draw calls · ${(sample.triangles / 1000).toFixed(0)}k tris`
              : "—"}
          </p>
          {bench?.result && (
            <p className="font-mono text-accent" data-testid="bench">
              {bench.result}
            </p>
          )}
        </section>
      </aside>
    </main>
  );
}
