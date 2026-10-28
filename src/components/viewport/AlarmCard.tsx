"use client";

// Back of House alarm card: pinned to the top-left of the viewport, away from
// the unit, with a red leader line to it. The line's end follows the unit on
// screen: three/AlarmCallout.tsx projects the unit every frame and moves the
// line (by id), so the card itself never re-renders with the camera. Reading,
// likely cause, SOP steps and "ask the AI what to do next".
import { X } from "lucide-react";
import { useState } from "react";
import { AlarmStatusChip, ReadingLine, SeverityChip, SopChecklist } from "@/components/panels/alarm";
import { AssistantIcon } from "@/components/ui/AssistantIcon";
import { plantAlarm } from "@/data/events";
import { SOPS } from "@/data/sop";
import { useAppStore } from "@/store/useAppStore";

/** DOM ids the 3D side looks up to draw the leader */
export const ALARM_CARD_ID = "alarm-card";
export const ALARM_LEADER_ID = "alarm-leader";
export const ALARM_LEADER_DOT_ID = "alarm-leader-dot";

export function AlarmCard() {
  // "INC-003", or "" — a string so the store subscription stays cheap; not over a chiller that is opened up
  const id = useAppStore((s) =>
    s.view === "boh" && s.chillerView === null ? (plantAlarm(s.incidents, s.incidentFocus)?.id ?? "") : "",
  );
  const e = useAppStore((s) => s.incidents.find((x) => x.id === id));
  const ask = useAppStore((s) => s.ask);
  const openModal = useAppStore((s) => s.openModal);
  // A dismissed card comes back with the next camera move to a shot (Home, opening the scene again)
  const shot = useAppStore((s) => s.camera.n);
  const [dismissed, setDismissed] = useState({ id: "", shot: -1 });
  if (!e || (dismissed.id === e.id && dismissed.shot === shot)) return null;
  const sop = SOPS[e.sop];

  return (
    <>
      {/* Leader from the card to the unit; its end is set by the 3D side every frame (hidden until then) */}
      <svg className="pointer-events-none absolute inset-0 z-[15] h-full w-full" aria-hidden>
        <line id={ALARM_LEADER_ID} stroke="#ff5c66" strokeWidth={2} strokeDasharray="6 4" visibility="hidden" />
        <circle id={ALARM_LEADER_DOT_ID} r={6} fill="#ff4d5a" stroke="white" strokeWidth={2} visibility="hidden" />
      </svg>
      <section
        id={ALARM_CARD_ID}
        role="region"
        aria-label={`Alarm callout ${e.id}`}
        className="absolute top-14 left-16 z-[16] w-[372px] rounded-[var(--radius-card)] border border-red/60 bg-bg/92 px-3 py-2.5 text-[13px] leading-[1.45] shadow-[0_8px_30px_rgb(0_0_0/0.45)] backdrop-blur short:top-[136px] short:w-[330px]"
      >
        <div className="flex items-center gap-2">
          <SeverityChip priority={e.priority} />
          <AlarmStatusChip status={e.status} />
          <span className="ml-auto font-mono text-[11px] text-muted">
            {e.id} · {e.time}
          </span>
          <button
            onClick={() => setDismissed({ id: e.id, shot })}
            aria-label="ซ่อนการ์ด Alarm"
            className="text-muted hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
        <p className="mt-1.5 leading-snug font-semibold">{e.title.th}</p>
        <p className="text-muted">{e.location}</p>
        <ReadingLine e={e} className="mt-1 block" />
        <p className="mt-1.5 font-semibold text-red">สาเหตุที่เป็นไปได้</p>
        <p>{sop.cause}</p>
        {/* Short screens leave the steps to the workflow panel below, which follows the same alarm */}
        <div className="mt-1.5 short:hidden">
          <SopChecklist e={e} compact />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => ask(`${e.id} ${e.title.th} ต้อง Action อะไรต่อ ตาม SOP`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-button)] bg-accent px-2 py-1.5 font-semibold text-bg"
          >
            <AssistantIcon size={18} /> ถาม AI: ทำอะไรต่อ
          </button>
          <button
            onClick={() => openModal({ kind: "event", id: e.id })}
            className="rounded-[var(--radius-button)] border border-line px-2.5 py-1.5 hover:border-accent/60"
          >
            เปิด Alarm
          </button>
        </div>
      </section>
    </>
  );
}
