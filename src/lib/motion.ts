// Motion tokens (PLAN 8) — every UI transition uses these. Reduced motion is
// handled globally by <MotionConfig reducedMotion="user"> in AppShell.
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 } as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: 4, transition: { duration: DURATION.fast } },
};

export const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.base } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};
