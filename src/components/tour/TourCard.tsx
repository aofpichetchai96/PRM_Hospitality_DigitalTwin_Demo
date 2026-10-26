"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TOURS } from "@/data/tour";
import { fadeUp } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";

/** Guided demo step card over the viewport (prototype showTour, L412) */
export function TourCard() {
  const tour = useAppStore((s) => s.tour);
  const go = useAppStore((s) => s.goToTourStep);
  const end = useAppStore((s) => s.endTour);
  const steps = tour ? TOURS[tour.set] : [];
  const step = tour ? steps[tour.step] : null;
  const last = tour !== null && tour.step === steps.length - 1;

  return (
    <AnimatePresence>
      {tour && step && (
        <motion.section
          key={tour.step}
          {...fadeUp}
          aria-live="polite"
          aria-label="Guided demo"
          className="absolute bottom-16 left-1/2 z-40 w-[min(460px,calc(100%-32px))] -translate-x-1/2 rounded-[var(--radius-card)] border border-accent/40 bg-panel/95 p-4 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <span className="rounded border border-gold/50 px-2 text-[11px] tracking-wider text-gold">
              GUIDED DEMO · {tour.step + 1} / {steps.length}
            </span>
            <button aria-label="ปิด Guided demo" onClick={end} className="text-muted hover:text-text">
              <X size={16} />
            </button>
          </div>
          <h3 className="mt-2 text-[17px] font-semibold">{step.title}</h3>
          <p className="mt-1 text-[14px] text-muted">{step.body}</p>
          <div className="mt-3 flex items-center justify-between">
            <button
              disabled={tour.step === 0}
              onClick={() => go(tour.step - 1)}
              className="text-[13px] text-muted hover:text-text disabled:opacity-40"
            >
              ← ก่อนหน้า
            </button>
            <button
              onClick={() => go(tour.step + 1)}
              className="rounded-[var(--radius-button)] bg-accent px-4 py-1.5 font-semibold text-bg"
            >
              {last ? "จบการสาธิต" : "ถัดไป →"}
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
