"use client";

import { Check, ChevronLeft, ChevronRight, Pause, Play, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SHOWCASES, type ShowcasePath } from "@/data/showcase";
import { fadeUp } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";

const pad = (n: number) => String(n).padStart(2, "0");
const PATH_LABEL: Record<ShowcasePath, string> = { executive: "EXECUTIVE", technical: "TECHNICAL" };

/**
 * Demo showcase card over the viewport: chapter pitch (and business outcome), what is playing now,
 * beat progress and a dot per feature to jump to. While the showcase has a
 * modal open the card steps aside for <ShowcaseBar>.
 */
export function ShowcaseCard() {
  const sc = useAppStore((s) => s.showcase);
  const modalOpen = useAppStore((s) => s.modal !== null);
  const go = useAppStore((s) => s.goToChapter);
  const setPlaying = useAppStore((s) => s.setShowcasePlaying);
  const end = useAppStore((s) => s.endShowcase);
  const list = sc ? SHOWCASES[sc.path] : [];
  const chapter = sc ? list[sc.chapter] : null;
  const last = sc !== null && sc.chapter === list.length - 1;

  return (
    <AnimatePresence>
      {sc && chapter && !modalOpen && (
        <motion.section
          key={sc.chapter}
          {...fadeUp}
          data-showcase
          aria-live="polite"
          aria-label="Feature showcase"
          className="absolute bottom-4 left-1/2 z-40 w-[min(560px,calc(100%-32px))] -translate-x-1/2 short:left-4 short:w-[min(520px,calc(100%-32px))] short:translate-x-0 rounded-[var(--radius-card)] border border-accent/40 bg-panel/95 p-4 shadow-2xl backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <span className="rounded border border-gold/50 px-2 font-mono text-[11px] tracking-wider text-gold">
              {PATH_LABEL[sc.path]} · {pad(sc.chapter + 1)} / {pad(list.length)}
            </span>
            <PlayButton playing={sc.playing} onClick={() => setPlaying(!sc.playing)} />
            <button aria-label="ปิดการสาธิต" onClick={end} className="ml-auto text-muted hover:text-text">
              <X size={16} />
            </button>
          </div>

          <h3 className="mt-2 text-[18px] font-semibold">{chapter.title}</h3>
          <p className="mt-0.5 text-[14px]">{chapter.pitch}</p>
          {chapter.outcome && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-green">
              <TrendingUp size={16} className="shrink-0" />
              {chapter.outcome}
              <span className="font-normal text-muted">· ค่าสมมติ</span>
            </p>
          )}
          <ul className="mt-1.5 hidden flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-muted tall:flex">
            {chapter.points.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <Check size={14} className="shrink-0 text-accent" />
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-3 rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
            <p className="flex items-center gap-2 text-[13px]">
              <span
                className={`size-1.5 shrink-0 rounded-full ${sc.playing ? "animate-pulse bg-accent" : "bg-muted"}`}
              />
              {chapter.beats[sc.beat].caption}
            </p>
            <BeatProgress />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              disabled={sc.chapter === 0}
              onClick={() => go(sc.chapter - 1)}
              className="flex items-center text-[13px] text-muted hover:text-text disabled:opacity-40"
            >
              <ChevronLeft size={16} /> ก่อนหน้า
            </button>
            <nav aria-label="ฟังก์ชันทั้งหมด" className="flex flex-1 items-center justify-center gap-1.5">
              {list.map((c, i) => (
                <button
                  key={c.id}
                  title={c.title}
                  aria-label={c.title}
                  aria-current={i === sc.chapter ? "step" : undefined}
                  onClick={() => go(i)}
                  className="grid h-5 place-items-center"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      i === sc.chapter ? "w-5 bg-accent" : i < sc.chapter ? "w-1.5 bg-accent/50" : "w-1.5 bg-line"
                    }`}
                  />
                </button>
              ))}
            </nav>
            <button
              onClick={() => go(sc.chapter + 1)}
              className="flex items-center gap-1 rounded-[var(--radius-button)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg"
            >
              {last ? "จบการสาธิต" : "ถัดไป"}
              {!last && <ChevronRight size={16} />}
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** Slim showcase controls above a modal the showcase opened */
export function ShowcaseBar() {
  const sc = useAppStore((s) => s.showcase);
  const modalOpen = useAppStore((s) => s.modal !== null);
  const go = useAppStore((s) => s.goToChapter);
  const setPlaying = useAppStore((s) => s.setShowcasePlaying);
  const end = useAppStore((s) => s.endShowcase);
  if (!sc || !modalOpen) return null;
  const list = SHOWCASES[sc.path];
  const chapter = list[sc.chapter];

  return (
    <section
      data-showcase
      aria-label="Feature showcase"
      className="fixed bottom-3 left-1/2 z-[60] flex w-[min(640px,calc(100%-32px))] -translate-x-1/2 flex-col rounded-[var(--radius-card)] border border-accent/40 bg-panel/95 px-3 py-1.5 shadow-2xl backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] whitespace-nowrap text-gold">
          {PATH_LABEL[sc.path]} · {pad(sc.chapter + 1)} / {pad(list.length)}
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px]">
          <b className="font-semibold">{chapter.title}</b>
          <span className="text-muted"> · {chapter.beats[sc.beat].caption}</span>
        </p>
        <PlayButton playing={sc.playing} onClick={() => setPlaying(!sc.playing)} />
        <button aria-label="ฟังก์ชันถัดไป" onClick={() => go(sc.chapter + 1)} className="text-muted hover:text-text">
          <ChevronRight size={18} />
        </button>
        <button aria-label="ปิดการสาธิต" onClick={end} className="text-muted hover:text-text">
          <X size={16} />
        </button>
      </div>
      <BeatProgress />
    </section>
  );
}

function PlayButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button
      aria-label={playing ? "หยุดชั่วคราว" : "เล่นต่อ"}
      title={playing ? "หยุดชั่วคราว" : "เล่นต่อ"}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-full border border-line text-muted hover:border-accent/60 hover:text-text"
    >
      {playing ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
    </button>
  );
}

/** One segment per beat; the current one fills over its wait and holds while paused */
function BeatProgress() {
  const sc = useAppStore((s) => s.showcase);
  if (!sc) return null;
  const beats = SHOWCASES[sc.path][sc.chapter].beats;
  return (
    <div className="mt-1.5 flex gap-1" aria-hidden>
      {beats.map((b, i) => (
        <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
          {i < sc.beat && <span className="block h-full bg-accent/60" />}
          {i === sc.beat && (
            <span
              key={sc.n}
              className="block h-full origin-left bg-accent"
              style={{
                animation: `showcase-fill ${b.wait}ms linear forwards`,
                animationPlayState: sc.playing ? "running" : "paused",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
