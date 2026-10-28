"use client";

// Back of House: Alarm & Events on the right (list, filters, the selected
// unit, work orders) and the focused alarm's workflow with its SOP checklist
// at the bottom. Alarms and incidents are one list (Case Management counts it too).
import { ArrowUpRight, Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { INCIDENT_STEPS, INCIDENT_STEPS_TH, NEXT_STEP, SCENARIO_ORDER, SCENARIOS, SEVERITY } from "@/data/events";
import { isRoofEquipment } from "@/data/assets";
import { selectCases } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { Incident, Priority } from "@/types";
import { AssetCard } from "./DetailsPanel";
import { AlarmStatusChip, ReadingLine, SEVERITY_TONE, SeverityChip, SopChecklist } from "./alarm";
import { SectionTitle } from "./common";

type SeverityFilter = "all" | Priority;
type StatusFilter = "active" | "all" | "closed";

function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map(([id, text]) => (
        <button
          key={id}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`rounded-full border px-2 py-0.5 text-[13px] ${
            value === id ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-muted hover:text-text"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Presenter's scenario injector: the same list Shift+1…5 triggers */
function InjectMenu() {
  const [open, setOpen] = useState(false);
  const simulate = useAppStore((s) => s.simulateIncident);
  return (
    <div className="relative">
      <button
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-[var(--radius-button)] border border-red/40 px-2.5 py-1 text-[12px] text-red hover:bg-red/10"
      >
        <Plus size={13} /> จำลองเหตุการณ์ <ChevronDown size={12} />
      </button>
      {open && (
        <ul className="absolute top-full right-0 z-30 mt-1 w-[280px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-panel shadow-2xl">
          {SCENARIO_ORDER.map((id, i) => (
            <li key={id}>
              <button
                onClick={() => {
                  setOpen(false);
                  simulate(id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-panel-2"
              >
                <span className={`size-2 shrink-0 rounded-full ${SEVERITY_TONE[SCENARIOS[id].priority].bg}`} />
                <span className="min-w-0 flex-1">{SCENARIOS[id].title.th}</span>
                <kbd className="shrink-0 rounded border border-line px-1 font-mono text-[10px] text-muted">
                  ⇧{i + 1}
                </kbd>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlarmRow({ e, focused }: { e: Incident; focused: boolean }) {
  const focus = useAppStore((s) => s.focusIncident);
  const openModal = useAppStore((s) => s.openModal);
  return (
    <li
      className={`relative border-b border-line/70 last:border-0 ${focused ? "bg-panel-2/70" : ""}`}
      aria-current={focused || undefined}
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 left-0 w-0.5 rounded-full ${e.status === 3 ? "bg-line" : SEVERITY_TONE[e.priority].bg}`}
      />
      <button onClick={() => focus(e.id)} className="flex w-full flex-col gap-0.5 py-2 pr-7 pl-2.5 text-left">
        <span className="flex items-center gap-2">
          <SeverityChip priority={e.priority} />
          <AlarmStatusChip status={e.status} />
          <span className="ml-auto font-mono text-[11px] text-muted">{e.time}</span>
        </span>
        <span className="line-clamp-2 text-[13px] font-medium">{e.title.th}</span>
        <span className="text-[11px] text-muted">
          <span className="font-mono">{e.id}</span> · {e.location}
        </span>
        <ReadingLine e={e} className="text-[11px]" />
      </button>
      <button
        aria-label={`เปิดรายละเอียด ${e.id}`}
        title="เปิดรายละเอียด"
        onClick={() => openModal({ kind: "event", id: e.id })}
        className="absolute top-2 right-1 grid size-6 place-items-center rounded text-muted hover:text-accent"
      >
        <ArrowUpRight size={14} />
      </button>
    </li>
  );
}

export function AlarmPanel() {
  const incidents = useAppStore((s) => s.incidents);
  const workOrders = useAppStore((s) => s.workOrders);
  const focus = useAppStore((s) => s.incidentFocus);
  const asset = useAppStore((s) => s.asset);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const cases = selectCases(incidents);
  const shown = incidents
    .filter((e) => severity === "all" || e.priority === severity)
    .filter((e) => (status === "all" ? true : status === "active" ? e.status < 3 : e.status === 3))
    // Open first, then by severity; the list itself is newest first
    .sort((a, b) => Number(a.status === 3) - Number(b.status === 3));
  const equipment = isRoofEquipment(asset) || asset === "plant" || asset === "ahu";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Alarm & Events</SectionTitle>
          <InjectMenu />
        </div>
        <p className="text-[12px] text-muted">
          New {cases.open} · Pending {cases.pending} · Closed {cases.resolved} · BMS / ACS mock feed
        </p>
        <FilterChips<SeverityFilter>
          label="กรองตามความรุนแรง"
          value={severity}
          onChange={setSeverity}
          options={[
            ["all", "ทุกระดับ"],
            ["high", SEVERITY.high.label],
            ["medium", SEVERITY.medium.label],
            ["low", SEVERITY.low.label],
          ]}
        />
        <FilterChips<StatusFilter>
          label="กรองตามสถานะ"
          value={status}
          onChange={setStatus}
          options={[
            ["active", "ยังไม่ปิด"],
            ["closed", "ปิดแล้ว"],
            ["all", "ทั้งหมด"],
          ]}
        />
        {shown.length ? (
          <ul className="mt-1">
            {shown.map((e) => (
              <AlarmRow key={e.id} e={e} focused={e.id === focus} />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-[13px] text-muted">ไม่มีรายการตามตัวกรองนี้</p>
        )}
      </section>

      {equipment && <AssetCard />}

      <section className="flex flex-col gap-1 border-t border-line pt-3">
        <SectionTitle>
          Work orders <span className="ml-1 font-mono text-[11px] font-normal text-muted">{workOrders.length}</span>
        </SectionTitle>
        {workOrders.length ? (
          <ul>
            {[...workOrders]
              .reverse()
              .slice(0, 5)
              .map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-2 border-b border-line/70 py-1.5 text-[13px] last:border-0"
                >
                  <span className="font-mono text-[11px]">{w.id}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {w.assetCode} · {w.owner}
                  </span>
                  <span className={`text-[11px] ${w.status === "Completed" ? "text-green" : "text-gold"}`}>
                    {w.status}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">ยังไม่มีใบงานจำลอง · ใบงานเกิดเมื่อ Alarm เข้าสู่ In progress</p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-3 text-[13px]">
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-gold">OPERATIONAL BOUNDARY</p>
        <p>
          หน้าสาธิตนี้ไม่ควบคุมอุปกรณ์จริง ระบบจริงจะรับ Alarm จาก BMS / ACS และส่งใบงานเข้า CMMS
          โดยผู้ปฏิบัติงานเป็นผู้ยืนยันทุกขั้น ระบบ Life Safety ต้องทำงานอิสระ
        </p>
      </section>
    </div>
  );
}

/** Bottom panel: the focused (or first open) alarm's workflow and its SOP checklist */
export function AlarmWorkflow() {
  const incidents = useAppStore((s) => s.incidents);
  const focusId = useAppStore((s) => s.incidentFocus);
  const advance = useAppStore((s) => s.advanceIncident);
  const openModal = useAppStore((s) => s.openModal);
  const simulate = useAppStore((s) => s.simulateIncident);
  const e = incidents.find((x) => x.id === focusId) ?? incidents.find((x) => x.status < 3);

  return (
    <section className="grid h-[172px] shrink-0 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 rounded-[var(--radius-card)] border border-line bg-panel px-4 py-3">
      <div className="flex min-w-0 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-[11px] font-semibold tracking-wider text-muted">
            ALARM WORKFLOW
            {e && (
              <button
                onClick={() => openModal({ kind: "event", id: e.id })}
                className="block truncate text-left text-[13px] font-semibold tracking-normal text-text hover:text-accent"
              >
                <span className="font-mono text-[11px] text-muted">{e.id}</span> {e.title.th}
              </button>
            )}
          </p>
          <span className="shrink-0 text-[11px] text-muted">SIMULATED · HUMAN APPROVAL</span>
        </div>
        {e ? (
          <>
            <p className="flex flex-wrap items-center gap-x-2 text-[12px]">
              <SeverityChip priority={e.priority} />
              <ReadingLine e={e} />
            </p>
            <div className="flex items-center gap-3">
              <ol className="flex flex-1 items-center gap-1.5" aria-label="Workflow">
                {INCIDENT_STEPS.map((step, i) => {
                  const done = i <= e.status;
                  const active = i === e.status + 1;
                  return (
                    <li key={step} className="flex flex-1 items-center gap-1.5">
                      <span
                        aria-current={active ? "step" : undefined}
                        className={`grid size-6 shrink-0 place-items-center rounded-full border text-[11px] ${
                          done
                            ? "border-green/60 bg-green/15 text-green"
                            : active
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-line text-muted"
                        }`}
                      >
                        {done ? <Check size={12} /> : i + 1}
                      </span>
                      <span
                        className={`text-[12px] leading-tight whitespace-nowrap ${active ? "text-text" : "text-muted"}`}
                      >
                        {step}
                        <span className="block text-[13px]">{INCIDENT_STEPS_TH[i]}</span>
                      </span>
                      {i < INCIDENT_STEPS.length - 1 && <span className="h-px min-w-2 flex-1 bg-line" />}
                    </li>
                  );
                })}
              </ol>
              {e.status < 3 ? (
                <button
                  onClick={() => advance(e.id)}
                  className="shrink-0 rounded-[var(--radius-button)] bg-accent px-3 py-2 text-[13px] font-semibold text-bg"
                >
                  {NEXT_STEP[e.status]} →
                </button>
              ) : (
                <span className="shrink-0 text-[13px] text-green">ปิดแล้ว</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between text-[13px] text-muted">
            ไม่มี Alarm ค้าง
            <button onClick={() => simulate()} className="text-accent">
              + จำลองเหตุการณ์ใหม่
            </button>
          </div>
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-col border-l border-line pl-5">
        {e ? <SopChecklist e={e} compact /> : <p className="text-[13px] text-muted">เลือก Alarm เพื่อดู SOP</p>}
      </div>
    </section>
  );
}
