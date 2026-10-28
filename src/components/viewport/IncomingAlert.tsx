"use client";

import { Check, Cctv, Crosshair, Siren, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ReadingLine } from "@/components/panels/alarm";
import { autoResponse, incidentSource, SEVERITY } from "@/data/events";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { useAppStore } from "@/store/useAppStore";

/** Delay between the automatic response steps ticking in */
const STEP_MS = 700;

const TONE = {
  high: { border: "border-red/70", text: "text-red", bg: "bg-red" },
  medium: { border: "border-orange/70", text: "text-orange", bg: "bg-orange" },
  low: { border: "border-gold/70", text: "text-gold", bg: "bg-gold" },
};

/**
 * Incoming alert over the viewport: the new incident, where it came from and
 * what the platform does on its own (locate, camera / sensor, notify, SLA),
 * ticking in step by step. Gone once the incident is opened or verified.
 */
export function IncomingAlert() {
  const alert = useAppStore((s) => s.alert);
  const e = useAppStore((s) => (s.alert ? s.incidents.find((x) => x.id === s.alert?.id) : undefined));
  const modalOpen = useAppStore((s) => s.modal !== null);
  const show = alert && e && e.status === 0 && !modalOpen;

  return <AnimatePresence>{show && <AlertCard key={alert.n} id={e.id} />}</AnimatePresence>;
}

function AlertCard({ id }: { id: string }) {
  const e = useAppStore((s) => s.incidents.find((x) => x.id === id));
  const openModal = useAppStore((s) => s.openModal);
  const locate = useAppStore((s) => s.locateIncident);
  const dismiss = useAppStore((s) => s.dismissAlert);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 250);
    return () => window.clearInterval(timer);
  }, []);

  if (!e) return null;
  const tone = TONE[e.priority];
  const steps = autoResponse(e);
  const done = Math.min(steps.length, Math.floor(elapsed / STEP_MS));
  const secs = Math.floor(elapsed / 1000);
  const camera = e.type === "security" || e.type === "people";

  return (
    <motion.section
      role="alert"
      aria-label={`แจ้งเตือนใหม่ ${e.id}`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE_OUT } }}
      exit={{ opacity: 0, x: 16, transition: { duration: DURATION.fast } }}
      className={`absolute top-16 right-3 z-40 w-[min(360px,calc(100%-24px))] short:top-[150px] short:w-[300px] overflow-hidden rounded-[var(--radius-card)] border ${tone.border} bg-panel/95 shadow-2xl backdrop-blur`}
    >
      <div className={`flex items-center gap-2 px-3 py-1.5 ${tone.text}`}>
        <span className="relative grid size-6 place-items-center">
          <span className={`absolute inset-0 animate-ping rounded-full opacity-40 ${tone.bg}`} />
          <Siren size={15} />
        </span>
        <span className="font-mono text-[11px] font-semibold tracking-wider">
          INCOMING ALARM · {SEVERITY[e.priority].label.toUpperCase()}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </span>
        <button aria-label="รับทราบและซ่อน" onClick={dismiss} className="text-muted hover:text-text">
          <X size={15} />
        </button>
      </div>

      <div className="border-t border-line px-3 py-2.5">
        <p className="font-mono text-[11px] text-muted">
          {e.id} · {e.time}
        </p>
        <h3 className="text-[15px] font-semibold">{e.title.th}</h3>
        <p className="text-[13px] text-muted">{e.location}</p>
        <p className="text-[13px] text-muted">แหล่งข้อมูล: {incidentSource(e.type)}</p>
        {e.reading && (
          <p className="text-[13px]">
            <ReadingLine e={e} />
          </p>
        )}

        <p className="mt-2 text-[13px] font-semibold text-muted">ระบบเตรียมการให้ · ผู้ปฏิบัติงานยืนยันก่อนสั่งงาน</p>
        <ol className="mt-1 flex flex-col gap-1">
          {steps.map((step, i) => (
            <li
              key={step}
              className={`flex items-center gap-2 text-[13px] transition-opacity ${i < done ? "" : "opacity-40"}`}
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                  i < done ? "border-accent bg-accent text-bg" : "border-line"
                }`}
              >
                {i < done && <Check size={11} strokeWidth={3} />}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => openModal({ kind: "event", id: e.id })}
            className="rounded-[var(--radius-button)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-bg"
          >
            เปิด Alarm · Acknowledge
          </button>
          {camera ? (
            <button
              onClick={() => openModal({ kind: "cctv", id: e.type === "people" ? "0" : "1" })}
              className="flex items-center gap-1.5 rounded-[var(--radius-button)] border border-line px-3 py-1.5 text-[13px] hover:border-accent/60"
            >
              <Cctv size={14} /> ดูกล้อง
            </button>
          ) : (
            <button
              onClick={() => locate(e.id)}
              className="flex items-center gap-1.5 rounded-[var(--radius-button)] border border-line px-3 py-1.5 text-[13px] hover:border-accent/60"
            >
              <Crosshair size={14} /> ดูตำแหน่ง
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/** Red (or amber) edge pulse around the viewport as an alert lands */
export function AlertFlash() {
  const alert = useAppStore((s) => s.alert);
  const priority = useAppStore((s) => s.incidents.find((x) => x.id === s.alert?.id)?.priority);
  if (!alert || !priority) return null;
  return (
    <span
      key={alert.n}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 rounded-[inherit]"
      style={{
        animation: "alert-flash 0.9s ease-in-out 3 forwards",
        ["--alert-color" as string]:
          priority === "high" ? "var(--red)" : priority === "medium" ? "var(--orange)" : "var(--gold)",
      }}
    />
  );
}
