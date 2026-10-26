"use client";

import { useSyncExternalStore } from "react";

/** Live result of a CSS media query; false during server render */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches the `short` Tailwind variant in globals.css */
export const SHORT_SCREEN = "(max-height: 899.98px)";
