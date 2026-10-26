"use client";

// App-wide side effects owned by AppShell: URL ↔ view, keyboard / clicker
// shortcuts (PLAN 8.1) and the projector tokens in presentation mode.
import { useEffect } from "react";
import { TOURS } from "@/data/tour";
import { isViewId, VIEWS } from "@/data/views";
import { useAppStore } from "@/store/useAppStore";

/** `?view=` reflects the store; the store stays the source of truth (PLAN R2) */
export function useUrlSync() {
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("view");
    if (isViewId(initial) && initial !== useAppStore.getState().view) useAppStore.getState().setView(initial);

    return useAppStore.subscribe((s, prev) => {
      if (s.view === prev.view) return;
      const url = new URL(window.location.href);
      url.searchParams.set("view", s.view);
      window.history.replaceState(null, "", url);
    });
  }, []);
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * ← / → / PageUp / PageDown step the tour, P presentation, R reset,
 * [ / ] floor down / up, Home back to the view's shot, Esc closes (3D_PLAN 5.1)
 */
export function useKeyboard() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useAppStore.getState();
      // Esc always closes a modal, even while focus is in one of its fields
      if (e.key === "Escape" && s.modal) {
        s.closeModal();
        e.preventDefault();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target && (TYPING.has(target.tagName) || target.isContentEditable)) return;
      if (s.intro) {
        s.finishIntro();
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          if (!s.tour) return;
          s.goToTourStep(s.tour.step + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          if (!s.tour) return;
          s.goToTourStep(s.tour.step - 1);
          break;
        case "p":
        case "P":
          s.togglePresentation();
          break;
        case "r":
        case "R":
          if (s.modal) return;
          s.resetDemo();
          break;
        case "Escape":
          // Innermost first: modal → floor plan → picked floor → slice → tour → presentation
          if (s.modal) s.closeModal();
          else if (s.spatial === "plan") s.setSpatial("building");
          else if (s.selectedFloor) s.pickFloor(null);
          else if (s.mode === "slice") s.setMode("exterior");
          else if (s.tour) s.endTour();
          else if (s.presentation) s.togglePresentation();
          else return;
          break;
        case "[":
          s.stepFloor(-1);
          break;
        case "]":
          s.stepFloor(1);
          break;
        case "Home":
          s.flyTo(VIEWS[s.view].camera);
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Presentation mode switches to the higher-contrast projector tokens */
export function useProjectorTokens(on: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.display = "projector";
    else delete root.dataset.display;
  }, [on]);
}

/** No input for this long starts attract mode (PLAN 5: default 2 minutes) */
export const ATTRACT_IDLE_MS = 120_000;
/** How long each tour step stays on screen while attract mode plays */
export const ATTRACT_STEP_MS = 12_000;
const TICK_MS = 1_000;
const ATTRACT_KEY = "prm.attractEnabled";

/**
 * Booth attract mode: after a quiet spell the full tour plays on its own in a
 * loop with auto-rotate; any pointer, wheel or key input hands control back.
 */
export function useAttractMode() {
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ATTRACT_KEY) === "true") useAppStore.getState().setAttractEnabled(true);
    } catch {}
    const unsubscribe = useAppStore.subscribe((s, prev) => {
      if (s.attractEnabled === prev.attractEnabled) return;
      try {
        window.localStorage.setItem(ATTRACT_KEY, String(s.attractEnabled));
      } catch {}
    });

    let idle = 0;
    let onStep = 0;
    const onInput = () => {
      idle = 0;
      const s = useAppStore.getState();
      if (!s.attractActive) return;
      s.setAttractActive(false);
      s.endTour();
      s.setAutoRotate(false);
    };

    const timer = window.setInterval(() => {
      const s = useAppStore.getState();
      if (s.attractActive) {
        onStep += TICK_MS;
        if (onStep < ATTRACT_STEP_MS) return;
        onStep = 0;
        // Loop back to the first step instead of ending the tour
        s.goToTourStep(s.tour ? (s.tour.step + 1) % TOURS.full.length : 0);
        if (!useAppStore.getState().tour) s.startTour("full");
        s.setAutoRotate(true);
        return;
      }
      idle += TICK_MS;
      if (!s.attractEnabled || s.modal || s.tour || idle < ATTRACT_IDLE_MS) return;
      onStep = 0;
      s.setAttractActive(true);
      s.startTour("full");
      s.setAutoRotate(true);
    }, TICK_MS);

    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, onInput, { capture: true, passive: true });
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, onInput, { capture: true });
    };
  }, []);
}
