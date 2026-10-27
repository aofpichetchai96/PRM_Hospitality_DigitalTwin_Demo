"use client";

import { ChartColumn, CircleQuestionMark, Download, MessageSquareText, Play } from "lucide-react";
import { VIEWS } from "@/data/views";
import { exportSnapshot } from "@/lib/exportSnapshot";
import { timeStr } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

/** Views whose bottom panel is hidden until "แสดงกราฟ" is pressed */
export const CHARTS_ON_DEMAND = new Set(["twin"]);

/** Header with the page head merged in (PLAN 8) — 64px instead of the prototype's ~150px */
export function Header() {
  const view = useAppStore((s) => s.view);
  const time = useAppStore((s) => timeStr(s.time));
  const chartsOpen = useAppStore((s) => s.chartsOpen);
  const setChartsOpen = useAppStore((s) => s.setChartsOpen);
  const setPanel = useAppStore((s) => s.setPanel);
  const startTour = useAppStore((s) => s.startTour);
  const openModal = useAppStore((s) => s.openModal);
  const notify = useAppStore((s) => s.notify);
  const { title, subtitle } = VIEWS[view];

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-4">
      <div className="flex items-center gap-3 wide:w-[188px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 160 px WebP made from public/images/Logo-Piramid.png */}
        <img src="/images/Logo-Piramid.webp" alt="Piramid Solutions" className="size-10 shrink-0 rounded-full" />

        <div className="hidden leading-tight wide:block">
          <p className="font-semibold">PRM Hospitality</p>
          <p className="text-[10px] tracking-[0.2em] text-muted">DIGITAL TWIN</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 border-l border-line pl-4 leading-tight">
        <h1 className="truncate text-[20px] font-semibold">{title}</h1>
        <p className="truncate text-[13px] text-muted">{subtitle}</p>
      </div>

      <nav className="flex items-center gap-2 text-[13px]" aria-label="คำสั่ง">
        {CHARTS_ON_DEMAND.has(view) && (
          <HeaderButton
            icon={<ChartColumn size={16} />}
            label={chartsOpen ? "ซ่อนกราฟ" : "แสดงกราฟ"}
            pressed={chartsOpen}
            onClick={() => setChartsOpen(!chartsOpen)}
          />
        )}
        <HeaderButton icon={<MessageSquareText size={16} />} label="ถาม AI" onClick={() => setPanel("agent")} />
        <HeaderButton
          icon={<Download size={16} />}
          label="Export"
          onClick={() => {
            exportSnapshot(useAppStore.getState());
            notify("ส่งออก Snapshot ข้อมูลจำลองแล้ว");
          }}
        />
        <button
          onClick={() => startTour()}
          className="flex h-9 items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 font-semibold text-bg hover:brightness-110"
        >
          <Play size={16} fill="currentColor" />
          เริ่มสาธิต
        </button>
      </nav>

      <div className="flex items-center gap-3 border-l border-line pl-4">
        <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold">
          SIMULATED DEMO
        </span>
        <p className="text-right leading-tight">
          <span className="font-mono text-[15px]">{time}</span>
          <span className="block text-[10px] text-muted">ICT · DAY 01</span>
        </p>
        <button
          aria-label="ช่วยเหลือ"
          onClick={() => openModal({ kind: "help" })}
          className="text-muted hover:text-text"
        >
          <CircleQuestionMark size={20} />
        </button>
      </div>
    </header>
  );
}

function HeaderButton({
  icon,
  label,
  onClick,
  pressed,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-[var(--radius-button)] border px-2.5 hover:border-accent/60 wide:px-3 ${
        pressed ? "border-accent/60 text-accent" : "border-line"
      }`}
    >
      {icon}
      <span className="hidden wide:inline">{label}</span>
    </button>
  );
}
