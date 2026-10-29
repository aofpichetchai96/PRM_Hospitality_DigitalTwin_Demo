"use client";

// App-wide side effects owned by AppShell: URL ↔ scene, keyboard / clicker
// shortcuts (PLAN 8.1) and the projector tokens in presentation mode.
import { useEffect } from "react";
import { SCENARIO_ORDER } from "@/data/events";
import { SCENE_IDS } from "@/data/nav";
import { isViewId, VIEWS } from "@/data/views";
import { useAppStore } from "@/store/useAppStore";

const SCENE_PARAM = "scene";

/** `?scene=` reflects the store; the store stays the source of truth (PLAN R2) */
export function useUrlSync() {
  useEffect(() => {
    const write = (view: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set(SCENE_PARAM, view);
      url.searchParams.delete("view");
      window.history.replaceState(null, "", url);
    };
    const params = new URLSearchParams(window.location.search);
    // Links made before the scenes still say ?view=
    const initial = params.get(SCENE_PARAM) ?? params.get("view");
    if (isViewId(initial) && initial !== useAppStore.getState().view) useAppStore.getState().setView(initial);
    // The address always names the open view, so a copied link reopens it
    write(useAppStore.getState().view);

    return useAppStore.subscribe((s, prev) => {
      if (s.view !== prev.view) write(s.view);
    });
  }, []);
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Next (+1) or previous (−1) scene in menu order, wrapping around; from a workspace page the first / last scene */
function stepScene(dir: 1 | -1) {
  const s = useAppStore.getState();
  const i = (SCENE_IDS as readonly string[]).indexOf(s.view);
  const n = SCENE_IDS.length;
  s.setView(SCENE_IDS[i < 0 ? (dir > 0 ? 0 : n - 1) : (i + dir + n) % n]);
}

/**
 * 1–7 open a scene, Shift+1–5 inject a scenario, ← / → / PageUp / PageDown step through scenes (clicker), P presentation,
 * R reset, [ / ] floor down / up, Home back to the scene's shot, Esc closes (3D_PLAN 5.1)
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

      // Digits by key code, so the shifted ones (scenario injector) still read as digits
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit) {
        const n = Number(digit[1]) - 1;
        // Shift+1…5: the presenter injects an abnormal situation (Back of House scenarios)
        const scenario = e.shiftKey ? SCENARIO_ORDER[n] : undefined;
        const id = e.shiftKey ? undefined : SCENE_IDS[n];
        if (s.modal || (!scenario && !id)) return;
        if (scenario) s.simulateIncident(scenario);
        else if (id) s.setView(id);
        e.preventDefault();
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          if (s.modal) return;
          stepScene(1);
          break;
        case "ArrowLeft":
        case "PageUp":
          if (s.modal) return;
          stepScene(-1);
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
          // Innermost first: modal → chiller inside view → floor plan → picked floor → slice → presentation
          if (s.modal) s.closeModal();
          else if (s.chillerView !== null) s.openChiller(null);
          else if (s.rackFocus !== null) s.openRack(null);
          else if (s.roomArea !== null) s.openArea(null);
          else if (s.spatial === "plan") s.setSpatial("building");
          else if (s.selectedFloor) s.pickFloor(null);
          else if (s.mode === "slice") s.setMode("exterior");
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
