import type { ReactNode } from "react";

/** Compact segmented control used on the viewport overlay */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-[var(--radius-button)] border border-line bg-bg/70 p-0.5 text-[12px] backdrop-blur"
    >
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 transition-colors ${
            o.value === value ? "bg-panel-2 text-accent" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
