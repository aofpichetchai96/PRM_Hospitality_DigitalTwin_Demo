/** Seeded LCG returning integers (prototype `makeRooms` shuffle, L347) */
export function createLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

/** In-place Fisher–Yates shuffle driven by the seeded LCG — same result every run */
export function seededShuffle<T>(items: T[], seed: number) {
  const next = createLcg(seed);
  for (let i = items.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
