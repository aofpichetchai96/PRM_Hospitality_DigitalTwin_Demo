import { Pause } from "lucide-react";

/** 40px footer: disclaimer + simulation timeline (06:00–23:00) */
export function FooterBar() {
  return (
    <footer className="flex h-10 shrink-0 items-center gap-4 border-t border-line px-4 text-[11px] text-muted">
      <span className="truncate">
        CONCEPT ONLY · 3D massing from reference; floor plans, feeds and AI responses are simulated.
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-green">
          <span className="size-1.5 animate-pulse rounded-full bg-green motion-reduce:animate-none" />
          Simulation running
        </span>
        <button className="flex items-center gap-1 rounded-[var(--radius-button)] border border-line px-2 py-0.5 text-text">
          <Pause size={12} fill="currentColor" />
          Pause
        </button>
        <span className="font-mono text-text">06:00</span>
        <input
          type="range"
          min={6}
          max={23}
          step={0.25}
          defaultValue={14.5}
          aria-label="Simulation hour"
          className="w-56 accent-[var(--accent)]"
        />
        <span className="font-mono text-text">23:00</span>
        <button className="hover:text-text">Model notes ↗</button>
      </div>
    </footer>
  );
}
