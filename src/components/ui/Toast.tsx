"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { fadeUp } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";

const VISIBLE_MS = 3600;

/** Shows the store's latest toast for a few seconds (prototype L351) */
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  // The showcase card sits at the bottom, so its toasts show at the top
  const showcase = useAppStore((s) => s.showcase !== null);
  const [hidden, setHidden] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setHidden(toast.n), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  const visible = toast && hidden !== toast.n;
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-[60] -translate-x-1/2 ${showcase ? "top-20" : "bottom-14"}`}
    >
      <AnimatePresence>
        {visible && (
          <motion.p
            key={toast.n}
            {...fadeUp}
            className="rounded-[var(--radius-card)] border border-accent/40 bg-panel px-4 py-2 text-[14px] shadow-xl"
          >
            {toast.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
