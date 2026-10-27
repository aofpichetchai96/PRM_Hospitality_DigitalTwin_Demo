"use client";

// IOC view (prototype L369, L374): incident workspace and work orders on the
// right, the response workflow of the focused incident at the bottom.
import { Check, Plus } from "lucide-react";
import { INCIDENT_STEPS, INCIDENT_STEPS_TH } from "@/data/events";
import { useAppStore } from "@/store/useAppStore";
import type { Incident } from "@/types";
import { SectionTitle } from "./common";

const TONE = { high: "bg-red", medium: "bg-gold", low: "bg-blue" };
const STATUS_TONE = ["text-red", "text-gold", "text-blue", "text-green"] as const;

function IncidentRow({ e, focused }: { e: Incident; focused: boolean }) {
  const openModal = useAppStore((s) => s.openModal);
  return (
    <li className="border-b border-line/70 last:border-0">
      <button
        onClick={() => openModal({ kind: "event", id: e.id })}
        aria-current={focused || undefined}
        className={`flex w-full gap-2.5 px-1 py-2 text-left hover:bg-panel-2/60 ${focused ? "bg-panel-2/60" : ""}`}
      >
        <span className={`mt-2 size-2 shrink-0 rounded-full ${e.status === 3 ? "bg-green" : TONE[e.priority]}`} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[13px] font-medium">
            <span className="font-mono text-[11px] text-muted">{e.id}</span> {e.title.th}
          </span>
          <span className="block text-[11px] text-muted">
            {e.location} · <span className={STATUS_TONE[e.status]}>{INCIDENT_STEPS[e.status]}</span>
          </span>
        </span>
        <span className="font-mono text-[11px] text-muted">{e.time}</span>
      </button>
    </li>
  );
}

export function IocPanel() {
  const incidents = useAppStore((s) => s.incidents);
  const workOrders = useAppStore((s) => s.workOrders);
  const focus = useAppStore((s) => s.incidentFocus);
  const simulate = useAppStore((s) => s.simulateIncident);
  const open = incidents.filter((e) => e.status < 3);
  // Open incidents first, newest first within each group
  const sorted = [...open, ...incidents.filter((e) => e.status === 3)];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-1">
        <SectionTitle>Incident workspace</SectionTitle>
        <p className="text-[13px] text-muted">พื้นที่ร่วมกัน · ผู้รับผิดชอบและสิทธิ์แยกตามบทบาท</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[12px] text-muted">
            ค้าง {open.length} · ปิดแล้ว {incidents.length - open.length}
          </span>
          <button
            onClick={() => simulate()}
            className="flex items-center gap-1 rounded-[var(--radius-button)] border border-red/40 px-2.5 py-1 text-[12px] text-red hover:bg-red/10"
          >
            <Plus size={13} /> จำลองเหตุการณ์
          </button>
        </div>
        <ul className="mt-1">
          {sorted.map((e) => (
            <IncidentRow key={e.id} e={e} focused={e.id === focus} />
          ))}
        </ul>
      </section>

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
          <p className="text-[13px] text-muted">ยังไม่มีใบงานจำลอง · เลือกเหตุการณ์เพื่อเริ่ม Workflow</p>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-3 text-[13px]">
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-gold">OPERATIONAL BOUNDARY</p>
        <p>
          IOC ประสานเหตุการณ์และติดตามการตอบสนอง ระบบ Life Safety ต้องคงการทำงานอิสระ
          หน้าสาธิตนี้ไม่ควบคุมประตูหรืออุปกรณ์จริง
        </p>
      </section>
    </div>
  );
}

/** Bottom panel: response workflow of the focused (or first open) incident */
export function IncidentWorkflow() {
  const incidents = useAppStore((s) => s.incidents);
  const focusId = useAppStore((s) => s.incidentFocus);
  const advance = useAppStore((s) => s.advanceIncident);
  const openModal = useAppStore((s) => s.openModal);
  const simulate = useAppStore((s) => s.simulateIncident);
  const e = incidents.find((x) => x.id === focusId) ?? incidents.find((x) => x.status < 3);
  const next = ["Verify", "Dispatch", "Resolve"];

  return (
    <section className="flex h-[112px] shrink-0 flex-col justify-center gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wider text-muted">
          INCIDENT RESPONSE WORKFLOW
          {e && (
            <button
              onClick={() => openModal({ kind: "event", id: e.id })}
              className="ml-2 font-normal normal-case text-text hover:text-accent"
            >
              · <span className="font-mono">{e.id}</span> {e.title.th}
            </button>
          )}
        </p>
        <span className="text-[11px] text-muted">SIMULATED · HUMAN APPROVAL</span>
      </div>
      {e ? (
        <div className="flex items-center gap-3">
          <ol className="flex flex-1 items-center gap-2" aria-label="Workflow">
            {INCIDENT_STEPS.map((step, i) => {
              // status is the last step reached (0 = Detected), so the next step is the active one
              const done = i <= e.status;
              const active = i === e.status + 1;
              return (
                <li key={step} className="flex flex-1 items-center gap-2">
                  <span
                    aria-current={active ? "step" : undefined}
                    className={`grid size-7 shrink-0 place-items-center rounded-full border text-[12px] ${
                      done
                        ? "border-green/60 bg-green/15 text-green"
                        : active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-line text-muted"
                    }`}
                  >
                    {done ? <Check size={13} /> : i + 1}
                  </span>
                  <span className={`text-[13px] leading-tight ${active ? "text-text" : "text-muted"}`}>
                    {step}
                    <span className="block text-[11px]">{INCIDENT_STEPS_TH[i]}</span>
                  </span>
                  {i < INCIDENT_STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
                </li>
              );
            })}
          </ol>
          {e.status < 3 ? (
            <button
              onClick={() => advance(e.id)}
              className="rounded-[var(--radius-button)] bg-accent px-4 py-2 text-[13px] font-semibold text-bg"
            >
              {next[e.status]} →
            </button>
          ) : (
            <span className="text-[13px] text-green">ปิดเหตุการณ์แล้ว</span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[13px] text-muted">
          ไม่มีเหตุการณ์ค้าง
          <button onClick={() => simulate()} className="text-accent">
            + จำลองเหตุการณ์ใหม่
          </button>
        </div>
      )}
    </section>
  );
}

const LINEAGE = ["BMS · PMS · CCTV", "Local state", "Rules engine", "Answer"];

/** AI view bottom panel: where answers come from (prototype L376) */
export function DataLineage() {
  return (
    <section className="flex h-[92px] shrink-0 flex-col justify-center gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-muted">SIMULATED DATA LINEAGE</p>
        <span className="text-[11px] text-muted">No external requests</span>
      </div>
      <div className="flex items-center gap-2 text-[13px]">
        {LINEAGE.map((node, i) => (
          <span key={node} className="flex items-center gap-2">
            <span className="rounded-[4px] border border-line bg-panel-2 px-2.5 py-1 font-mono text-[12px] text-accent/90">
              {node}
            </span>
            {i < LINEAGE.length - 1 && <span className="text-muted">→</span>}
          </span>
        ))}
        <span className="ml-auto text-[12px] text-muted">
          แนวคิดใช้งานจริง: governed APIs / MCP tools → ข้อมูลที่ได้รับอนุญาต → LLM → ผู้ปฏิบัติงานอนุมัติ
        </span>
      </div>
    </section>
  );
}
