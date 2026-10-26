"use client";

// App-wide side effects owned by AppShell: URL ↔ view, keyboard / clicker
// shortcuts (PLAN 8.1) and the projector tokens in presentation mode.
import { useEffect } from "react";
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
      const target = e.target as HTMLElement | null;
      if (target && (TYPING.has(target.tagName) || target.isContentEditable)) return;
      const s = useAppStore.getState();

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
          // Innermost first: modal → picked floor → slice → tour → presentation
          if (s.modal) s.closeModal();
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
