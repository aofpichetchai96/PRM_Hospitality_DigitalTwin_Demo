import { ChartColumn, CircleQuestionMark, Download, Play, Sparkles } from "lucide-react";

/** Header with the page head merged in (PLAN 8) — 64px instead of the prototype's ~150px */
export function Header({
  title,
  subtitle,
  showChartsButton,
}: {
  title: string;
  subtitle: string;
  showChartsButton?: boolean;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-4">
      <div className="flex items-center gap-3 wide:w-[188px]">
        <span className="grid size-9 place-items-center rounded-[var(--radius-button)] border border-text/70 font-semibold">
          P
        </span>
        <div className="hidden leading-tight wide:block">
          <p className="font-semibold">PRM Hospitality</p>
          <p className="text-[10px] tracking-[0.2em] text-muted">DIGITAL TWIN</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 border-l border-line pl-4 leading-tight">
        <h1 className="truncate text-[20px] font-semibold">{title}</h1>
        <p className="truncate text-[13px] text-muted">{subtitle}</p>
      </div>

      <nav className="flex items-center gap-2 text-[13px]">
        {showChartsButton && <HeaderButton icon={<ChartColumn size={16} />} label="แสดงกราฟ" />}
        <HeaderButton icon={<Sparkles size={16} />} label="ถาม AI" />
        <HeaderButton icon={<Download size={16} />} label="Export" />
        <button className="flex h-9 items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 font-semibold text-bg">
          <Play size={16} fill="currentColor" />
          เริ่มสาธิต
        </button>
      </nav>

      <div className="flex items-center gap-3 border-l border-line pl-4">
        <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold">
          SIMULATED DEMO
        </span>
        <p className="text-right leading-tight">
          <span className="font-mono text-[15px]">14:30</span>
          <span className="block text-[10px] text-muted">ICT · DAY 01</span>
        </p>
        <button aria-label="ช่วยเหลือ" className="text-muted hover:text-text">
          <CircleQuestionMark size={20} />
        </button>
      </div>
    </header>
  );
}

function HeaderButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="flex h-9 items-center gap-2 rounded-[var(--radius-button)] border border-line px-2.5 hover:border-accent/60 wide:px-3"
    >
      {icon}
      <span className="hidden wide:inline">{label}</span>
    </button>
  );
}
