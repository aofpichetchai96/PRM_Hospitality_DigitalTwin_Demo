"use client";

// Sales pages: expected business value (assumed figures) and the three-phase
// delivery roadmap (review 27 Oct 2026). Content lives in data/value.ts.
import { ArrowRight } from "lucide-react";
import { SourceNotice } from "@/components/ui/Modal";
import { ROADMAP, VALUE_METRICS } from "@/data/value";
import { useAppStore } from "@/store/useAppStore";

export function ValueModal() {
  const openModal = useAppStore((s) => s.openModal);
  return (
    <>
      <p className="text-muted">ผลลัพธ์ที่ผู้บริหารใช้ตัดสินใจ เทียบก่อนและหลังใช้ระบบ · ตัวเลขทั้งหมดเป็นค่าสมมติ</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {VALUE_METRICS.map((m) => (
          <article key={m.id} className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3.5">
            <h3 className="!mt-0 text-[14px] font-semibold">{m.label}</h3>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-muted line-through decoration-muted/60">{m.before}</span>
              <ArrowRight size={14} className="self-center text-muted" />
              <span className="text-[22px] font-semibold text-green tabular-nums">{m.after}</span>
              <span className="text-[13px] text-green">{m.change}</span>
            </p>
            <p className="mt-1 text-[13px] text-muted">{m.how}</p>
          </article>
        ))}
      </div>
      <SourceNotice>
        ค่าสมมติเพื่อประกอบการนำเสนอ ไม่ใช่การรับประกันผล · ผลประหยัดจริงต้องวัดผลตามแนวทาง M&V หลังติดตั้ง
        และขึ้นกับข้อมูลจริงของโครงการ
      </SourceNotice>
      <button onClick={() => openModal({ kind: "roadmap" })} className="mt-3 text-[13px] text-accent">
        ดู Roadmap 3 เฟส →
      </button>
    </>
  );
}

export function RoadmapModal() {
  const openModal = useAppStore((s) => s.openModal);
  return (
    <>
      <p className="text-muted">
        เริ่มจากโครงการเล็กที่อ่านข้อมูลอย่างเดียว แล้วขยายเมื่อได้สิทธิ์เข้าถึงระบบของผู้ขายเดิม
      </p>
      <ol className="mt-3 grid grid-cols-3 gap-3">
        {ROADMAP.map((p, i) => (
          <li
            key={p.phase}
            className={`flex flex-col rounded-[var(--radius-card)] border p-3.5 ${
              i === 0 ? "border-accent/50 bg-accent/5" : "border-line bg-panel-2"
            }`}
          >
            <span className="text-[13px] font-semibold text-accent">{p.phase}</span>
            <h3 className="!mt-0.5 text-[15px] font-semibold">{p.title}</h3>
            <ul className="mt-2 flex flex-1 flex-col gap-1 text-[13px]">
              {p.scope.map((x) => (
                <li key={x} className="flex gap-1.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-2 text-[13px] text-muted">
              <span className="text-text">ต้องมีก่อนเริ่ม:</span> {p.prerequisite}
            </p>
            <p className="mt-1 text-[13px] text-muted">{p.note}</p>
          </li>
        ))}
      </ol>
      <SourceNotice>
        ขอบเขตและลำดับปรับได้ตามความพร้อมของข้อมูลโครงการ · ความเสี่ยงหลักคือการเข้าถึงข้อมูลจากผู้ขายระบบเดิม (PMS,
        VMS) และงาน Data point mapping ไม่ใช่ตัวเทคโนโลยี
      </SourceNotice>
      <button onClick={() => openModal({ kind: "value" })} className="mt-3 text-[13px] text-accent">
        ดู Value / ROI →
      </button>
    </>
  );
}
