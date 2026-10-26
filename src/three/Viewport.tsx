"use client";

import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode, useState } from "react";
import { NeutralToneMapping } from "three";
import type { FpsSample } from "./FpsProbe";
import { type SceneSettings, SceneRoot } from "./SceneRoot";

/** Still image + reload button shown instead of a black canvas (PLAN R6) */
function Fallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-bg">
      {/* eslint-disable-next-line @next/next/no-img-element -- static fallback, no optimisation needed */}
      <img
        src="/images/hero.webp"
        alt="PRM Hospitality"
        className="absolute inset-0 h-full w-full object-contain opacity-60"
      />
      <div className="relative rounded-[var(--radius-card)] border border-line bg-panel p-4 text-center">
        <p>ไม่สามารถแสดงโมเดล 3D ได้ในขณะนี้</p>
        <button className="mt-2 rounded-[var(--radius-button)] bg-accent px-3 py-1 text-bg" onClick={onRetry}>
          โหลดฉากใหม่
        </button>
      </div>
    </div>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("3D scene failed:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Viewport({
  settings,

  onSample,
}: {
  settings: SceneSettings;

  onSample: (s: FpsSample) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (failed)
    return (
      <Fallback
        onRetry={() => {
          setFailed(false);
          setAttempt((a) => a + 1);
        }}
      />
    );

  return (
    <SceneErrorBoundary key={attempt} onError={() => setFailed(true)}>
      <Canvas
        shadows="percentage"
        frameloop="demand"
        dpr={[1, 1.75]}
        gl={{ powerPreference: "high-performance", antialias: true }}
        camera={{ fov: 38, near: 1, far: 1500 }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.domElement.addEventListener("webglcontextlost", () => setFailed(true), { once: true });
        }}
      >
        <SceneRoot settings={settings} onSample={onSample} />
      </Canvas>
    </SceneErrorBoundary>
  );
}
