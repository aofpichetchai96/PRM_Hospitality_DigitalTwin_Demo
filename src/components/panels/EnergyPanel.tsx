"use client";

// Energy Lab (prototype L368, L373): demand breakdown in the right panel and
// the what-if scenario lab in the bottom panel. Linear, illustrative model.
import { useShallow } from "zustand/react/shallow";
import { OTHER_LOADS_KW, REFERENCE_SETPOINT, SCENARIO_LIMITS } from "@/data/energy";
import { fmt } from "@/lib/format";
import { useEnergy } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { SectionTitle } from "./common";
import { AssetCard, LayersPanel } from "./DetailsPanel";

export function EnergyPanel() {
  const e = useEnergy();
  const setpoint = useAppStore((s) => s.setpoint);
  const setScenario = useAppStore((s) => s.setScenario);
  const rows: [string, number, boolean?][] = [
    ["Mall cooling", e.mall],
    ["Hotel cooling", e.hotel],
    ["Other loads (สมมติฐาน)", OTHER_LOADS_KW],
    ["Scenario total", e.current, true],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>Energy intelligence</SectionTitle>
        <p className="text-[13px] text-muted">What-if scenario · ไม่ส่งคำสั่งควบคุมอาคาร</p>
        <LayersPanel />
      </section>
      <AssetCard />
      <section>
        <SectionTitle>Demand breakdown</SectionTitle>
        <dl className="mt-1">
          {rows.map(([label, kw, total]) => (
            <div key={label} className="flex justify-between border-b border-line/70 py-2 text-[13px] last:border-0">
              <dt className="text-muted">{label}</dt>
              <dd className={`tabular-nums ${total ? "font-semibold text-accent" : ""}`}>{fmt(kw)} kW</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-3 text-[13px]">
        <p className="mb-1 text-[11px] font-semibold tracking-wider text-accent">HUMAN-IN-THE-LOOP</p>
        <p>ทดลองเพิ่ม Setpoint เป็น 25°C แล้วดูผลต่างเทียบฐาน 24°C ภายใต้ Occupancy และอากาศชุดเดียวกัน</p>
        <button
          onClick={() => setScenario({ setpoint: setpoint === 25 ? REFERENCE_SETPOINT : 25 })}
          className="mt-1.5 text-[12px] text-accent"
        >
          {setpoint === 25 ? "กลับฐาน 24°C →" : "จำลอง Setpoint 25°C →"}
        </button>
      </section>
      <p className="text-[12px] text-muted">
        แบบจำลองเชิงเส้นเพื่อสาธิต ไม่ใช่แบบจำลองพลังงานที่สอบเทียบ และไม่ใช่การรับประกันผลประหยัด
      </p>
    </div>
  );
}

function Slider({
  label,
  value,
  display,
  limits,
  ticks,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  limits: { min: number; max: number; step: number };
  ticks: [string, string, string];
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-[13px] text-muted">
        {label} <strong className="font-semibold text-text tabular-nums">{display}</strong>
      </span>
      <input
        type="range"
        {...limits}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        className="accent-[var(--accent)]"
      />
      <span className="flex justify-between text-[11px] text-muted">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </span>
    </label>
  );
}

/** Bottom panel: what-if scenario sliders and the difference against 24 °C */
export function ScenarioLab() {
  const s = useAppStore(
    useShallow((st) => ({ setpoint: st.setpoint, outdoor: st.outdoor, occupancy: st.occupancy, tariff: st.tariff })),
  );
  const setScenario = useAppStore((st) => st.setScenario);
  const openModal = useAppStore((st) => st.openModal);
  const e = useEnergy();
  const tone = e.savingPct > 0.05 ? "text-green" : e.savingPct < -0.05 ? "text-red" : "text-accent";

  return (
    <section className="flex h-[156px] shrink-0 flex-col gap-2 rounded-[var(--radius-card)] border border-line bg-panel px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-muted">WHAT-IF SCENARIO LAB</p>
        <button onClick={() => openModal({ kind: "methodology" })} className="text-[12px] text-accent">
          สมมติฐานการคำนวณ →
        </button>
      </div>
      <div className="grid flex-1 grid-cols-[1fr_1fr_1fr_0.9fr] gap-6">
        <Slider
          label="Cooling setpoint"
          value={s.setpoint}
          display={`${s.setpoint.toFixed(1)}°C`}
          limits={SCENARIO_LIMITS.setpoint}
          ticks={["22°C", "ฐาน 24°C", "26°C"]}
          onChange={(v) => setScenario({ setpoint: v })}
        />
        <Slider
          label="Outdoor temperature"
          value={s.outdoor}
          display={`${s.outdoor}°C`}
          limits={SCENARIO_LIMITS.outdoor}
          ticks={["27°C", "32°C", "38°C"]}
          onChange={(v) => setScenario({ outdoor: v })}
        />
        <div className="flex flex-col gap-2">
          <Slider
            label="Hotel occupancy"
            value={s.occupancy}
            display={`${s.occupancy}%`}
            limits={SCENARIO_LIMITS.occupancy}
            ticks={["30%", "600 keys", "100%"]}
            onChange={(v) => setScenario({ occupancy: v })}
          />
          <label className="flex items-center justify-between gap-2 text-[13px] text-muted">
            ค่าไฟสมมติ
            <span className="flex items-center gap-1">
              <input
                type="number"
                {...SCENARIO_LIMITS.tariff}
                value={s.tariff}
                onChange={(ev) => setScenario({ tariff: Number(ev.target.value) })}
                className="w-16 rounded-[4px] border border-line bg-bg px-1.5 py-0.5 text-right text-text tabular-nums"
              />
              ฿/kWh
            </span>
          </label>
        </div>
        <div className="border-l border-line pl-5">
          <p className="text-[11px] font-semibold tracking-wider text-muted">ผลต่างจากฐาน 24°C</p>
          <p className={`text-[28px] leading-tight font-semibold tabular-nums ${tone}`}>
            {fmt(e.savingPct, 1)}
            <small className="ml-0.5 text-[14px]">%</small>
          </p>
          <p className="text-[13px] text-muted">
            <span className="text-text tabular-nums">{fmt(e.dayCost)}</span> ฿ / วัน (สมมติ)
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">ค่าบวก = ลดพลังงาน · ค่าลบ = ใช้เพิ่ม</p>
        </div>
      </div>
    </section>
  );
}
