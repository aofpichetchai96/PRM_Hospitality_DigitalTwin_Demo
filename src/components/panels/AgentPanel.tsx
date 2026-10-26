"use client";

import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/ui/RichText";
import { GREETING, QUICK_CHIPS } from "@/data/aiScript";
import { timeStr } from "@/lib/format";
import { selectionLabel } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";

/** Rule-based assistant chat (prototype ask / renderChat, L394–405) */
export function AgentPanel() {
  const chat = useAppStore((s) => s.chat);
  const ask = useAppStore((s) => s.ask);
  const presentation = useAppStore((s) => s.presentation);
  const context = useAppStore((s) => `${selectionLabel(s)} · ${timeStr(s.time)}`);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [chat.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-accent">
            <Sparkles size={16} /> PRM AI Agent
          </p>
          <p className="text-[13px] text-muted">ผู้ช่วยประจำอาคาร · ถามข้อมูลและสำรวจพื้นที่</p>
        </div>
        <span className="shrink-0 rounded border border-gold/50 px-1.5 text-[10px] tracking-wider whitespace-nowrap text-gold">
          LOCAL DEMO
        </span>
      </div>
      <p className="border-b border-line bg-panel-2 px-4 py-1.5 text-[12px] text-muted">
        บริบท: {context} · ข้อมูลจำลอง
      </p>

      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4 text-[13px]" aria-live="polite">
        <div className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3.5">
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-accent">
            <Sparkles size={14} /> {GREETING.title}
          </p>
          <p>{GREETING.body}</p>
          <p className="mt-2 text-muted">{GREETING.note}</p>
        </div>
        {chat.map((m, i) =>
          m.role === "user" ? (
            <p
              key={i}
              className="ml-8 self-end rounded-[var(--radius-card)] rounded-br-sm bg-accent/15 px-3 py-2 text-text"
            >
              {m.text}
            </p>
          ) : (
            <div key={i} className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3 text-muted">
              <RichText text={m.text} />
              <p className="mt-2 border-t border-line pt-1.5 text-[11px]">{m.source}</p>
            </div>
          ),
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((c) => (
            <button
              key={c.label}
              onClick={() => ask(c.question)}
              className="rounded-full border border-line px-2.5 py-0.5 text-[13px] hover:border-accent/60 hover:text-accent"
            >
              {c.label}
            </button>
          ))}
        </div>
        {/* Presentation mode shows chips only — no typing in front of the client (PLAN 5) */}
        {!presentation && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="ถามเกี่ยวกับอาคาร..."
              aria-label="ถามผู้ช่วย"
              className="h-10 min-w-0 flex-1 rounded-[var(--radius-button)] border border-line bg-bg px-3 text-[13px] outline-none focus:border-accent/60"
            />
            <button
              aria-label="ส่งคำถาม"
              className="grid size-10 place-items-center rounded-[var(--radius-button)] bg-accent text-bg"
            >
              <Send size={16} />
            </button>
          </form>
        )}
        <p className="mt-2 text-[11px] text-muted">ตอบตามกฎจากข้อมูลในหน้านี้ · ยังไม่เชื่อมต่อ AI / LLM</p>
      </div>
    </div>
  );
}
