"use client";

// Alarm building blocks shared by Alarm & Events, the workflow bar, the event
// modal and the incoming-alert card. Severity and status always pair colour
// with words or an icon, never colour alone.
import { Check, CircleCheck, CircleDot, Hand, type LucideIcon, Wrench } from "lucide-react";
import { INCIDENT_STEPS, SEVERITY } from "@/data/events";
import { SOP_STAGE_LABEL, SOPS } from "@/data/sop";
import { useAppStore } from "@/store/useAppStore";
import type { Incident, IncidentStatus, Priority } from "@/types";

export const SEVERITY_TONE: Record<Priority, { text: string; border: string; bg: string; color: string }> = {
  high: { text: "text-red", border: "border-red/60", bg: "bg-red", color: "var(--red)" },
  medium: { text: "text-orange", border: "border-orange/60", bg: "bg-orange", color: "var(--orange)" },
  low: { text: "text-gold", border: "border-gold/60", bg: "bg-gold", color: "var(--gold)" },
};

export function SeverityChip({ priority }: { priority: Priority }) {
  const tone = SEVERITY_TONE[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 text-[10px] leading-4 font-semibold tracking-wide uppercase ${tone.border} ${tone.text}`}
    >
      <span className={`size-1.5 rounded-full ${tone.bg}`} />
      {SEVERITY[priority].label}
    </span>
  );
}

const STATUS_META: Record<IncidentStatus, { icon: LucideIcon; tone: string }> = {
  0: { icon: CircleDot, tone: "text-red" },
  1: { icon: Hand, tone: "text-gold" },
  2: { icon: Wrench, tone: "text-blue" },
  3: { icon: CircleCheck, tone: "text-green" },
};

export function AlarmStatusChip({ status }: { status: IncidentStatus }) {
  const { icon: Icon, tone } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] whitespace-nowrap ${tone}`}>
      <Icon size={12} strokeWidth={2} /> {INCIDENT_STEPS[status]}
    </span>
  );
}

/** "Vibration 7.1 mm/s · limit ≤ 4.5 mm/s" */
export function ReadingLine({ e, className = "" }: { e: Incident; className?: string }) {
  if (!e.reading) return null;
  return (
    <span className={`tabular-nums ${className}`}>
      {e.reading.metric} <b className={`font-semibold ${SEVERITY_TONE[e.priority].text}`}>{e.reading.value}</b>
      <span className="text-muted"> · limit {e.reading.threshold}</span>
    </span>
  );
}

/** The incident's SOP as a checklist; steps of the current stage are highlighted */
export function SopChecklist({ e, compact = false }: { e: Incident; compact?: boolean }) {
  const sop = SOPS[e.sop];
  const done = useAppStore((s) => s.sopChecks[e.id]);
  const toggle = useAppStore((s) => s.toggleSopStep);
  const ticked = done ?? [];
  // Status 0 (New) and 1 (Acknowledged) work on stage 1; In progress on 2; Closed shows all
  const stage = e.status <= 1 ? 1 : e.status === 2 ? 2 : 3;

  return (
    <div className="flex min-h-0 flex-col gap-1">
      <p className="flex items-baseline justify-between gap-2 text-[11px] font-semibold tracking-wider text-muted">
        <span className="truncate">SOP · {sop.title.toUpperCase()}</span>
        <span className="shrink-0 font-normal tracking-normal">
          {ticked.length}/{sop.steps.length} · {sop.team}
        </span>
      </p>
      <ol className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"} overflow-auto`}>
        {sop.steps.map((step, i) => {
          const checked = ticked.includes(i);
          const current = step.stage === stage && e.status < 3;
          return (
            <li key={i}>
              <label
                className={`flex cursor-pointer items-start gap-2 rounded-[4px] px-1 text-[13px] leading-snug ${
                  current ? "bg-accent/8" : ""
                } ${checked ? "text-muted line-through decoration-muted/60" : ""}`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(e.id, i)} className="peer sr-only" />
                <span
                  aria-hidden
                  className={`mt-[3px] grid size-4 shrink-0 place-items-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${
                    checked ? "border-accent bg-accent text-bg" : "border-line"
                  }`}
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">{step.text}</span>
                <span className="shrink-0 text-[13px] text-muted no-underline">{SOP_STAGE_LABEL[step.stage]}</span>
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
