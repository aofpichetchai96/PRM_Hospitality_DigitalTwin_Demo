// Incident detail with the Detect → Verify → Dispatch → Resolve workflow
// (prototype eventModal L387). The full IOC workspace comes in Phase 7.
import { Check, Crosshair } from "lucide-react";
import { SourceNotice } from "@/components/ui/Modal";
import { INCIDENT_STEPS, INCIDENT_STEPS_TH, incidentSource } from "@/data/events";
import { useAppStore } from "@/store/useAppStore";

const PRIORITY = {
  high: "border-red/60 text-red",
  medium: "border-gold/60 text-gold",
  low: "border-blue/60 text-blue",
};
const NEXT_LABEL = ["ยืนยันเหตุการณ์ (Verify)", "มอบหมายงาน (Dispatch)", "ปิดเหตุการณ์ (Resolve)"];

export function EventModal({ id }: { id: string }) {
  const e = useAppStore((s) => s.incidents.find((x) => x.id === id));
  const workOrder = useAppStore((s) => s.workOrders.find((w) => w.incidentId === id));
  const advance = useAppStore((s) => s.advanceIncident);
  const locate = useAppStore((s) => s.locateIncident);
  if (!e) return <p className="text-muted">ไม่พบเหตุการณ์ {id}</p>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className={`rounded border px-2 uppercase ${PRIORITY[e.priority]}`}>{e.priority}</span>
        <span className="text-muted">
          {e.location} · {e.time} · {e.owner}
        </span>
      </div>
      <h3 className="!mt-3 text-[18px]">{e.title.th}</h3>
      <p className="font-mono text-[12px] text-muted">{e.assetCode}</p>
      <p className="mt-1 text-[13px] text-muted">แหล่งข้อมูล: {incidentSource(e.type)}</p>

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
        {e.type === "security"
          ? "ตัวอย่างขั้นตอน: ตรวจสอบภาพและสถานะประตู → ยืนยันกับเจ้าหน้าที่ประจำพื้นที่ → ส่งทีมตรวจสอบ → บันทึกสาเหตุและหลักฐานการปิดงาน"
          : "ตัวอย่างขั้นตอน: ตรวจสอบ Sensor / Trend → ยืนยันสภาพหน้างาน → มอบหมายทีมวิศวกรรม → บันทึกผลและปิดงาน"}
        <br />
        Workflow นี้เป็นการสาธิต ไม่ใช่ SOP ที่อนุมัติสำหรับโครงการ · ไม่มีคำสั่งไปยังระบบจริง
      </SourceNotice>
    </>
  );
}
