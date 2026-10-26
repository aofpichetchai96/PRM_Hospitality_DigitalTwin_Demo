"use client";

// Right panel while the floor plan is open (prototype planDetailsHtml L440)
import { Box } from "lucide-react";
import { FLOOR_PLANS } from "@/data/floorPlans";
import { useAppStore } from "@/store/useAppStore";

export function PlanDetails() {
  const { type, zone } = useAppStore((s) => s.plan);
  const selectPlanZone = useAppStore((s) => s.selectPlanZone);
  const setSpatial = useAppStore((s) => s.setSpatial);
  const ask = useAppStore((s) => s.ask);
  const p = FLOOR_PLANS[type];
  const z = p.zones.find((x) => x.id === zone) ?? p.zones[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section>
        <p className="text-[11px] tracking-[0.18em] text-muted">PRM HOSPITALITY / INTERIORS</p>
        <h2 className="text-[18px] font-semibold">{p.label}</h2>
        <p className="mt-1 text-[13px] text-muted">{p.intro}</p>
      </section>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
          <p className="text-[20px] font-semibold">{p.count}</p>
          <p className="text-[12px] text-muted">{p.countLabel}</p>
        </div>
        <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
          <p className="text-[20px] font-semibold">{p.type}</p>
          <p className="text-[12px] text-muted">{p.typeLabel}</p>
        </div>
      </div>

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wider text-muted">EXPLORE THE SPACES</p>
          <span className="text-[12px] text-muted">เลือกโซนบนภาพ</span>
        </div>
        {p.zones.map((a) => (
          <button
            key={a.id}
            aria-pressed={a.id === z.id}
            onClick={() => selectPlanZone(a.id)}
            className={`flex items-center gap-2.5 rounded-[var(--radius-button)] px-2 py-1.5 text-left text-[13px] ${
              a.id === z.id ? "bg-accent/10 text-text" : "text-muted hover:text-text"
            }`}
          >
            <b
              className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] ${
                a.id === z.id ? "bg-accent text-bg" : "bg-panel-2"
              }`}
            >
              {a.id}
            </b>
            {a.name}
            <small className="ml-auto text-[12px] text-muted">{a.sub}</small>
          </button>
        ))}
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3 text-[13px]">
        <h3 className="font-semibold">{z.name}</h3>
        <p className="mt-1 text-muted">{z.desc}</p>
        <button
          onClick={() => ask(`เล่าเกี่ยวกับ ${z.name} ในแปลน`)}
          className="mt-2 rounded-[var(--radius-button)] bg-accent px-3 py-1.5 font-semibold text-bg"
        >
          ถามผู้ช่วยเกี่ยวกับโซนนี้
        </button>
      </section>

      <p className="text-[12px] text-muted">
        ภาพและโซนใช้เพื่อสำรวจแนวคิด ยังไม่ผูกกับชั้นจริงของอาคาร และไม่ใช่ผังห้องพัก 600 ห้องในข้อมูลจำลอง
      </p>
      <button
        onClick={() => setSpatial("building")}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-button)] border border-line py-2 text-[13px] hover:border-accent/60"
      >
        <Box size={15} /> กลับไปดูอาคาร 3D
      </button>
    </div>
  );
}
