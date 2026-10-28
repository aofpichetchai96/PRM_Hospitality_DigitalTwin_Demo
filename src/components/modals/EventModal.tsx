// Alarm / incident detail: severity, the reading against its limit, the
// New → Acknowledged → In progress → Closed workflow and the SOP checklist
// (prototype eventModal L387).
import { Check, Crosshair } from "lucide-react";
import { ReadingLine, SeverityChip, SopChecklist } from "@/components/panels/alarm";
import { SourceNotice } from "@/components/ui/Modal";
import { INCIDENT_STEPS, INCIDENT_STEPS_TH, incidentSource } from "@/data/events";
import { useAppStore } from "@/store/useAppStore";

const NEXT_LABEL = ["รับทราบ (Acknowledge)", "เริ่มดำเนินการ (Start work)", "ปิดงาน (Close)"];

export function EventModal({ id }: { id: string }) {
  const e = useAppStore((s) => s.incidents.find((x) => x.id === id));
  const workOrder = useAppStore((s) => s.workOrders.find((w) => w.incidentId === id));
  const advance = useAppStore((s) => s.advanceIncident);
  const locate = useAppStore((s) => s.locateIncident);
  if (!e) return <p className="text-muted">ไม่พบเหตุการณ์ {id}</p>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <SeverityChip priority={e.priority} />
        <span className="text-muted">
          {e.location} · {e.time} · {e.owner}
        </span>
      </div>
      <h3 className="!mt-3 text-[18px]">{e.title.th}</h3>
      <p className="font-mono text-[12px] text-muted">{e.assetCode}</p>
      <p className="mt-1 text-[13px] text-muted">แหล่งข้อมูล: {incidentSource(e.type)}</p>
      {e.reading && (
        <p className="mt-1 text-[14px]">
          <ReadingLine e={e} />
        </p>
      )}

      <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Incident workflow">
        {INCIDENT_STEPS.map((step, i) => {
          const done = i <= e.status;
          return (
            <li
              key={step}
              aria-current={i === e.status ? "step" : undefined}
              className={`rounded-[var(--radius-button)] border px-2 py-2 text-center text-[13px] ${
                done ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-muted"
              }`}
            >
              {done && <Check size={13} className="mr-1 inline" />}
              {step}
              <span className="block text-[12px] opacity-80">{INCIDENT_STEPS_TH[i]}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-panel-2 p-3">
        <SopChecklist e={e} />
      </div>

      {workOrder && (
        <p className="mt-3 text-[13px] text-muted">
          ใบงาน <span className="font-mono text-text">{workOrder.id}</span> · {workOrder.owner} · {workOrder.status}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {e.status < 3 && (
          <button
            onClick={() => advance(e.id)}
            className="rounded-[var(--radius-button)] bg-accent px-4 py-2 font-semibold text-bg"
          >
            {NEXT_LABEL[e.status]}
          </button>
        )}
        <button
          onClick={() => locate(e.id)}
          className="flex items-center gap-2 rounded-[var(--radius-button)] border border-line px-4 py-2"
        >
          <Crosshair size={16} /> ดูตำแหน่งใน 3D
        </button>
      </div>
      <SourceNotice>
        SOP และ Workflow นี้เป็นตัวอย่างเพื่อสาธิต ไม่ใช่ SOP ที่อนุมัติสำหรับโครงการ · ไม่มีคำสั่งไปยังระบบจริง
        ระบบจริงจะใช้ SOP ของเจ้าของอาคารและส่งใบงานเข้า CMMS
      </SourceNotice>
    </>
  );
}
