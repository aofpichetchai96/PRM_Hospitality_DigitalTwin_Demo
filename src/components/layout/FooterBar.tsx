"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { timeStr } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

/** 40px footer: disclaimer, simulation clock + timeline (06:00–23:00), Reset Demo */
export function FooterBar() {
  const time = useAppStore((s) => s.time);
  const paused = useAppStore((s) => s.paused);
  const setTime = useAppStore((s) => s.setTime);
  const togglePause = useAppStore((s) => s.togglePause);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const openModal = useAppStore((s) => s.openModal);

  return (
    <footer className="flex h-10 shrink-0 items-center gap-4 border-t border-line px-4 text-[11px] text-muted">
      <span
        className="truncate"
        title="CONCEPT ONLY · 3D massing from reference; floor plans, feeds and AI responses are simulated."
      >
        CONCEPT ONLY ·{" "}
        <span className="hidden wide:inline">3D massing from reference; floor plans, feeds and AI responses are </span>
        <span className="wide:hidden">all data </span>simulated
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className={`flex items-center gap-1.5 whitespace-nowrap ${paused ? "text-gold" : "text-green"}`}>
          <span
            className={`size-1.5 rounded-full ${paused ? "bg-gold" : "animate-pulse bg-green motion-reduce:animate-none"}`}
          />
          {paused ? "Simulation paused" : "Simulation running"}
        </span>
        <button
          onClick={togglePause}
          className="flex items-center gap-1 rounded-[var(--radius-button)] border border-line px-2 py-0.5 text-text"
        >
          {paused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
          {paused ? "Resume" : "Pause"}
        </button>
        <output className="w-10 font-mono text-text">{timeStr(time)}</output>
        <input
          type="range"
          min={6}
          max={23}
          step={0.25}
          value={Math.min(23, time)}
          onChange={(e) => setTime(Number(e.target.value))}
          aria-label="Simulation hour"
          aria-valuetext={timeStr(time)}
          className="w-56 accent-[var(--accent)]"
        />
        <button
          onClick={resetDemo}
          title="Reset Demo (R)"
          className="flex items-center gap-1 rounded-[var(--radius-button)] border border-line px-2 py-0.5 text-text"
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button onClick={() => openModal({ kind: "about" })} className="whitespace-nowrap hover:text-text">
          Model notes ↗
        </button>
      </div>
    </footer>
  );
}
