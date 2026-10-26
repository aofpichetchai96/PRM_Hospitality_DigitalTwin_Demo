"use client";

import { useEffect } from "react";
import { TICK_MS } from "./simSlice";
import { useAppStore } from "./useAppStore";

/**
 * Owns the simulation clock (prototype L453): one tick every 6 s, skipped
 * while paused, while a modal is open or when the tab is hidden. Mount once
 * in AppShell.
 */
export function useSimTicker() {
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useAppStore.getState();
      if (s.paused || s.modal || document.hidden) return;
      s.tick();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
}
