"use client";

// ICT: the server room in the right panel — the room now (temperatures, power,
// what is online, ports), the numbered areas of the 3D model, every rack with
// its load and inlet temperature; pick one (here or in 3D) and the panel lists
// its devices U by U, each switch with its ports lit by status. Same readings
// as the 3D racks and the KPI strip (serverRoomAt).
import { ArrowLeft, Cpu, EthernetPort, type LucideIcon, Thermometer, Zap } from "lucide-react";
import {
  type Device,
  inletBand,
  isOnline,
  KIND_LABEL,
  portStatus,
  type PortStatus,
  ROOM_AREAS,
} from "@/data/serverRoom";
import { fmt } from "@/lib/format";
import { useServerRoom } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";
import { PORT_COLOR } from "@/three/ServerRoomScene";
import { SectionTitle } from "./common";

const PORT_LABEL: Record<PortStatus, string> = { up: "Up", idle: "Idle", down: "Down", error: "Error" };
const INLET_COLOR = { ok: "var(--green)", warm: "var(--gold)", high: "var(--red)" } as const;

function Stat({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <Icon size={13} /> {label}
      </p>
      <p className="text-[18px] font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{note}</p>
    </div>
  );
}

function PortLegend() {
  return (
    <span className="flex gap-2.5 text-[11px] text-muted">
      {(Object.keys(PORT_LABEL) as PortStatus[]).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <i className="size-2 rounded-sm" style={{ background: PORT_COLOR[s] }} /> {PORT_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

/** One device: U position, name, status; a switch also shows its ports, two rows of 24 */
function DeviceRow({ d, time }: { d: Device; time: number }) {
  const online = isOnline(d);
  const statuses = d.ports ? Array.from({ length: d.ports }, (_, i) => portStatus(d.id, i + 1, time)) : [];
  const up = statuses.filter((s) => s === "up").length;
  const errors = statuses.filter((s) => s === "error").length;
  return (
    <li className="border-b border-line/70 py-1.5 text-[13px] last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 font-mono text-[11px] text-muted">
          U{d.u}
          {d.height > 1 ? `–${d.u + d.height - 1}` : ""}
        </span>
        <span className="min-w-0 flex-1 truncate">{d.name}</span>
        {d.kind !== "patch" && (
          <span
            className="flex items-center gap-1 text-[11px]"
            style={{ color: online ? "var(--green)" : "var(--red)" }}
          >
            <i className="size-1.5 rounded-full" style={{ background: online ? "var(--green)" : "var(--red)" }} />
            {online ? "Online" : "Offline"}
          </span>
        )}
      </div>
      {d.ports && (
        <div className="mt-1 pl-14">
          <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[2px]" aria-label={`${d.name} ports`}>
            {statuses.map((s, i) => (
              <i
                key={i}
                title={`Port ${i + 1} · ${PORT_LABEL[s]}`}
                className="aspect-square rounded-[2px]"
                style={{ background: PORT_COLOR[s] }}
              />
            ))}
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {up}/{d.ports} up{errors ? ` · ${errors} error` : ""} · {KIND_LABEL[d.kind]}
          </p>
        </div>
      )}
    </li>
  );
}

export function ServerRoomPanel() {
  const room = useServerRoom();
  const time = useAppStore((s) => s.time);
  const focus = useAppStore((s) => s.rackFocus);
  const openRack = useAppStore((s) => s.openRack);
  const openArea = useAppStore((s) => s.openArea);
  const area = useAppStore((s) => s.roomArea);
  const ask = useAppStore((s) => s.ask);
  const sel = room.racks.find((r) => r.rack.id === focus);

  if (sel)
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        <button onClick={() => openRack(null)} className="flex items-center gap-1.5 self-start text-[13px] text-accent">
          <ArrowLeft size={14} /> ทั้งห้อง Server
        </button>
        <section className="flex flex-col gap-2">
          <SectionTitle>
            Rack {sel.rack.id} · {sel.rack.role}
          </SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Zap} label="ไฟฟ้า" value={`${fmt(sel.kw, 2)} kW`} note="IT load" />
            <Stat
              icon={Thermometer}
              label="Inlet"
              value={`${fmt(sel.inlet, 1)} °C`}
              note={inletBand(sel.inlet) === "ok" ? "ปกติ" : "สูง"}
            />
            <Stat
              icon={Cpu}
              label="ออนไลน์"
              value={`${sel.online}/${sel.devices}`}
              note={`${sel.portsUp}/${sel.ports} ports`}
            />
          </div>
        </section>
        <section className="flex flex-col gap-1 border-t border-line pt-3">
          <p className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">อุปกรณ์ใน Rack (บนลงล่าง)</span>
            <PortLegend />
          </p>
          <ul>
            {[...sel.rack.devices]
              .sort((a, b) => b.u - a.u)
              .map((d) => (
                <DeviceRow key={d.id} d={d} time={time} />
              ))}
          </ul>
        </section>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <section className="flex flex-col gap-2">
        <SectionTitle>Server room · MDF-01 ตอนนี้</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            icon={Thermometer}
            label="อุณหภูมิ"
            value={`${fmt(room.coldAisle, 1)} °C`}
            note={`Hot aisle ${fmt(room.hotAisle, 1)} °C · RH ${room.humidity}%`}
          />
          <Stat
            icon={Zap}
            label="ไฟฟ้า IT"
            value={`${fmt(room.itKw, 1)} kW`}
            note={`รวมทำความเย็น ${fmt(room.facilityKw, 1)} kW`}
          />
          <Stat
            icon={Cpu}
            label="ออนไลน์"
            value={`${room.online}/${room.devices}`}
            note={`${room.devices - room.online} offline`}
          />
          <Stat
            icon={EthernetPort}
            label="Port up"
            value={`${room.portsUp}/${room.ports}`}
            note={`${room.portErrors} error`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-1 border-t border-line pt-3">
        <SectionTitle>Rack · ไฟฟ้า · Inlet</SectionTitle>
        <p className="text-[13px] text-muted">คลิก Rack ที่นี่หรือในโมเดลเพื่อดูอุปกรณ์และ Port</p>
        <div className="grid grid-cols-2 gap-1.5">
          {room.racks.map((r) => {
            const band = inletBand(r.inlet);
            return (
              <button
                key={r.rack.id}
                onClick={() => openRack(r.rack.id)}
                className="rounded-[var(--radius-button)] border border-line bg-panel-2 px-2 py-1.5 text-left hover:border-accent/60"
              >
                <span className="flex items-center justify-between text-[13px] font-semibold">
                  {r.rack.id}
                  <span className="text-[11px] font-normal" style={{ color: INLET_COLOR[band] }}>
                    {fmt(r.inlet, 1)} °C
                  </span>
                </span>
                <span className="flex justify-between text-[11px] text-muted tabular-nums">
                  <span>{fmt(r.kw, 1)} kW</span>
                  <span style={{ color: r.errors ? "var(--red)" : undefined }}>
                    {r.online}/{r.devices}
                    {r.errors ? ` · ${r.errors} err` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-1 border-t border-line pt-3">
        <SectionTitle>พื้นที่ในห้อง</SectionTitle>
        <p className="text-[13px] text-muted">คลิกเพื่อพากล้องไปที่จุดนั้น (เหมือนดรอปดาวบนโมเดล)</p>
        <ol className="flex flex-col text-[13px]">
          {ROOM_AREAS.map((a) => (
            <li key={a.n}>
              <button
                onClick={() => openArea(a.n)}
                aria-pressed={area === a.n}
                className={`flex w-full items-center gap-2 rounded-[var(--radius-button)] px-1 py-0.5 text-left transition-colors hover:bg-panel-2 ${
                  area === a.n ? "text-accent" : ""
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                    area === a.n ? "border-accent bg-accent/15" : "border-text/70"
                  }`}
                >
                  {a.n}
                </span>
                {a.name}
              </button>
            </li>
          ))}
        </ol>
        <button
          onClick={() => ask("ห้อง Server room ตอนนี้อุณหภูมิและไฟฟ้าเท่าไร")}
          className="mt-1 self-start text-[13px] text-accent"
        >
          ถาม AI เรื่องห้อง Server →
        </button>
      </section>

      <p className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-3 text-[13px]">
        ข้อมูลจำลอง · ระบบจริงจะดึงจาก DCIM, SNMP ของ Switch และ BMS ของระบบทำความเย็น
      </p>
    </div>
  );
}
