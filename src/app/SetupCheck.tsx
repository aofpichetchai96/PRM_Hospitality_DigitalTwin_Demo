"use client";

// Phase 0 setup check page: Thai font, design tokens, which GPU the browser
// uses (PLAN R16) and a three.js smoke scene. Replaced by AppShell in Phase 4.
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const SmokeScene = dynamic(() => import("@/three/SmokeScene"), { ssr: false });

function readRenderer(): string {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" });
  if (!gl) return "WebGL2 unavailable";
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
}

let renderer: string | null = null;
const getRenderer = () => (renderer ??= readRenderer());
const subscribe = () => () => {};

export default function SetupCheck() {
  const gpu = useSyncExternalStore(subscribe, getRenderer, () => null);
  const discrete = gpu !== null && /NVIDIA|GeForce|RTX/i.test(gpu);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs tracking-widest text-muted uppercase">PRM Hospitality · Phase 0 setup check</p>
        <h1 className="text-[length:var(--text-h1)] font-semibold">Digital Twin Command Center</h1>
        <p className="text-muted">
          อาคารเดียว สองธุรกิจ เชื่อมการมองเห็นและการตัดสินใจ · ทดสอบสระและวรรณยุกต์: ปิ่นปั้น ฤๅษี ญี่ปุ่น
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
          <h2 className="font-medium">GPU ที่ browser ใช้ (R16)</h2>
          <p className="font-mono text-xs break-all">{gpu ?? "…"}</p>
          {gpu !== null && (
            <p className={discrete ? "text-green" : "text-gold"}>
              {discrete
                ? "✓ ใช้ GPU แยก (NVIDIA)"
                : "⚠ ไม่ใช่ GPU แยก — ตั้ง Windows Settings › Display › Graphics ให้ browser ใช้ High performance"}
            </p>
          )}
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
          <h2 className="font-medium">Design tokens</h2>
          <div className="mt-2 flex gap-2">
            {["bg-accent", "bg-blue", "bg-gold", "bg-red", "bg-green"].map((c) => (
              <span key={c} className={`h-6 w-10 rounded-[var(--radius-button)] ${c}`} />
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-muted">AHU-H12 · CH-01 · INC-001</p>
        </div>
      </section>

      <section className="h-[480px] overflow-hidden rounded-[var(--radius-card)] border border-line">
        <SmokeScene />
      </section>
    </main>
  );
}
