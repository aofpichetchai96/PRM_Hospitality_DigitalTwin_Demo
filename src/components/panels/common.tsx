"use client";

import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { useOpenIncidents } from "@/store/hooks";
import { useAppStore } from "@/store/useAppStore";

export function SectionTitle({
  children,
  action,
  onAction,
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[13px] font-semibold">{children}</h2>
      {action && (
        <button onClick={onAction} className="flex items-center gap-0.5 text-[12px] text-accent">
          {action} <ArrowUpRight size={12} />
        </button>
      )}
    </div>
  );
}

const TONE = { high: "bg-red", medium: "bg-gold", low: "bg-blue" };
const LEVEL = { high: "สูง", medium: "กลาง", low: "ต่ำ" };

/** Open incidents, newest first; each opens the event modal */
export function EventList({ limit = 3 }: { limit?: number }) {
  const open = useOpenIncidents();
  const openModal = useAppStore((s) => s.openModal);
  if (!open.length) return <p className="py-2 text-[13px] text-muted">ไม่มีเหตุการณ์ค้าง</p>;
  return (
    <ul>
      {open.slice(0, limit).map((e) => (
        <li key={e.id} className="border-b border-line/70 last:border-0">
          <button
            onClick={() => openModal({ kind: "event", id: e.id })}
            className="flex w-full gap-2.5 py-2 text-left hover:bg-panel-2/60"
          >
            <span className={`mt-2 size-2 shrink-0 rounded-full ${TONE[e.priority]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{e.title.th}</span>
              <span className="block text-[11px] text-muted">
                {e.location} · ความสำคัญ{LEVEL[e.priority]}
              </span>
            </span>
            <span className="font-mono text-[11px] text-muted">{e.time}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
