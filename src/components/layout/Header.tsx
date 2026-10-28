"use client";

import { useSyncExternalStore } from "react";
import { AssistantIcon } from "@/components/ui/AssistantIcon";
import { VIEWS } from "@/data/views";
import { asset } from "@/lib/asset";
import { useAppStore } from "@/store/useAppStore";

const BANGKOK = "Asia/Bangkok";
const clockTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// "28 Oct 26"
const clockDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK,
  day: "2-digit",
  month: "short",
  year: "2-digit",
});

/** Wall-clock minute in Thailand, ticking on the client; null while prerendering (no hydration mismatch) */
function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 5_000);
  return () => window.clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000);
const noMinute = () => null;

function useBangkokClock() {
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, noMinute);
  if (minute === null) return { time: "--:--", date: "" };
  const now = new Date(minute * 60_000);
  return { time: clockTime.format(now), date: clockDate.format(now) };
}

/** Header with the page head merged in (PLAN 8) — 64px instead of the prototype's ~150px */
export function Header() {
  const view = useAppStore((s) => s.view);
  // The real time in Thailand; the simulation clock is in the footer bar
  const clock = useBangkokClock();
  const setPanel = useAppStore((s) => s.setPanel);
  const { title, subtitle } = VIEWS[view];

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-4">
      <div className="flex items-center gap-3 wide:w-[188px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- 160 px WebP made from public/images/Logo-Piramid.png */}
        <img
          src={asset("/images/Logo-Piramid.webp")}
          alt="Piramid Solutions"
          className="size-10 shrink-0 rounded-full"
        />

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
        <HeaderButton icon={<AssistantIcon size={20} />} label="AI Assistant" onClick={() => setPanel("agent")} />
        {/* Hidden at the owner's request; lib/exportSnapshot.ts is kept
        <HeaderButton
          icon={<Download size={16} />}
          label="Export"
          onClick={() => {
            exportSnapshot(useAppStore.getState());
            notify("ส่งออก Snapshot ข้อมูลจำลองแล้ว");
          }}
        /> */}
      </nav>

      <div className="flex items-center gap-3 border-l border-line pl-4">
        <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gold">
          SIMULATED DEMO
        </span>
        <p className="text-right leading-tight" title="เวลาปัจจุบัน (ประเทศไทย)">
          <time className="font-mono text-[15px]">{clock.time}</time>
          <span className="block text-[10px] text-muted">{clock.date}</span>
        </p>
        {/* Help button hidden at the owner's request; the help modal (shortcuts, quality, Value / ROI) still exists
        <button
          aria-label="ช่วยเหลือ"
          onClick={() => openModal({ kind: "help" })}
          className="text-muted hover:text-text"
        >
          <CircleQuestionMark size={20} />
        </button> */}
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
