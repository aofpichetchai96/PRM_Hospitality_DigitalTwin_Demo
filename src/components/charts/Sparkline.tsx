/** Tiny trend line for KPI cards; values are scaled to their own min / max */
export function Sparkline({
  values,
  color = "var(--accent)",
  className = "",
}: {
  values: readonly number[];
  color?: string;
  className?: string;
}) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <polygon points={`0,30 ${points} 100,30`} fill={color} opacity={0.12} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
