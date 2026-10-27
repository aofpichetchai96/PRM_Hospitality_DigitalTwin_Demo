"use client";

// App-wide side effects owned by AppShell: URL ↔ view, keyboard / clicker
// shortcuts (PLAN 8.1) and the projector tokens in presentation mode.
import { useEffect, useRef } from "react";
import { SHOWCASES } from "@/data/showcase";
import { isViewId, VIEWS } from "@/data/views";
import { useAppStore } from "@/store/useAppStore";

/** `?view=` reflects the store; the store stays the source of truth (PLAN R2) */
export function useUrlSync() {
  useEffect(() => {
    const write = (view: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.replaceState(null, "", url);
    };
    const initial = new URLSearchParams(window.location.search).get("view");
    if (isViewId(initial) && initial !== useAppStore.getState().view) useAppStore.getState().setView(initial);
    // The address always names the open view, so a copied link reopens it
    write(useAppStore.getState().view);

    return useAppStore.subscribe((s, prev) => {
      if (s.view !== prev.view) write(s.view);
    });
  }, []);
}

const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * ← / → / PageUp / PageDown step the showcase chapters, P presentation, R reset,
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
          if (!s.showcase) return;
          s.goToChapter(s.showcase.chapter + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          if (!s.showcase) return;
          s.goToChapter(s.showcase.chapter - 1);
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
          // Innermost first: modal → showcase → floor plan → picked floor → slice → presentation
          if (s.modal) s.closeModal();
          else if (s.showcase) s.endShowcase();
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

/** No input for this long starts attract mode (PLAN 5: default 2 minutes) */
export const ATTRACT_IDLE_MS = 120_000;
const TICK_MS = 1_000;
const ATTRACT_KEY = "prm.attractEnabled";

/**
 * Booth attract mode: after a quiet spell the feature showcase plays on its own
 * in a loop; any pointer, wheel or key input hands control back.
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
    const onInput = () => {
      idle = 0;
      const s = useAppStore.getState();
      if (!s.attractActive) return;
      s.setAttractActive(false);
      s.endShowcase();
    };

    const timer = window.setInterval(() => {
      const s = useAppStore.getState();
      if (s.attractActive) return;
      idle += TICK_MS;
      if (!s.attractEnabled || s.modal || s.showcase || idle < ATTRACT_IDLE_MS) return;
      s.setAttractActive(true);
      s.startShowcase({ loop: true });
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

/** Clicks and wheel outside the showcase card: the presenter takes over, so it pauses */
const SHOWCASE_CARD = "[data-showcase]";

/**
 * Plays the showcase: each beat waits its `wait` and then moves on. A pause
 * keeps the remaining time, so the card's progress bar and the timer agree.
 */
export function useShowcasePlayer() {
  const key = useAppStore((s) => (s.showcase ? `${s.showcase.chapter}:${s.showcase.beat}:${s.showcase.n}` : null));
  const playing = useAppStore((s) => s.showcase?.playing ?? false);
  const left = useRef<{ key: string; ms: number } | null>(null);

  useEffect(() => {
    if (!key || !playing) return;
    const sc = useAppStore.getState().showcase;
    if (!sc) return;
    const ms = left.current?.key === key ? left.current.ms : SHOWCASES[sc.path][sc.chapter].beats[sc.beat].wait;
    const started = performance.now();
    const timer = window.setTimeout(() => useAppStore.getState().nextBeat(), ms);
    return () => {
      window.clearTimeout(timer);
      left.current = { key, ms: Math.max(0, ms - (performance.now() - started)) };
    };
  }, [key, playing]);

  useEffect(() => {
    const onInput = (e: Event) => {
      const s = useAppStore.getState();
      if (!s.showcase?.playing || s.attractActive) return;
      if (e.target instanceof Element && e.target.closest(SHOWCASE_CARD)) return;
      s.setShowcasePlaying(false);
    };
    const events = ["pointerdown", "wheel"] as const;
    for (const e of events) window.addEventListener(e, onInput, { capture: true, passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, onInput, { capture: true });
    };
  }, []);
}
