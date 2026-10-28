"use client";

import { ChartLine, Database, Lightbulb, ListChecks, type LucideIcon, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/ui/RichText";
import { GREETING, INTENT_LABEL, QUICK_CHIPS } from "@/data/aiScript";
import { VIEWS } from "@/data/views";
import { askContextLabel } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import type { ChatMessage } from "@/types";

type AssistantMessage = Extract<ChatMessage, { role: "assistant" }>;

/** One part of an answer, told apart by colour, icon and heading */
function Part({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-l-2 pl-2.5" style={{ borderColor: tone }}>
      <p className="mb-0.5 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: tone }}>
        <Icon size={13} strokeWidth={2} /> {title}
      </p>
      {children}
    </section>
  );
}

/** Data (with source and time window) · analysis · AI recommendation, kept visibly apart */
function AnswerCard({ m, current }: { m: AssistantMessage; current: boolean }) {
  const openModal = useAppStore((s) => s.openModal);
  return (
    // Answers from another scene stay readable but step back, so they never pass for the current state
    <div
      className={`flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-line bg-panel-2 p-3 ${current ? "" : "opacity-60"}`}
    >
      <p className="font-mono text-[11px] text-accent/80">
        {VIEWS[m.view].title} · {m.time}
        {m.intent && <> · {INTENT_LABEL[m.intent]}</>}
      </p>
      <Part icon={Database} title="ข้อมูล" tone="var(--blue)">
        <RichText text={m.data} />
        <p className="mt-1 text-[13px] text-muted">
          แหล่งข้อมูล: {m.source}
          <br />
          ช่วงเวลา: {m.period}
        </p>
      </Part>
      {m.analysis && (
        <Part icon={ChartLine} title="การวิเคราะห์" tone="var(--gold)">
          <RichText text={m.analysis} />
        </Part>
      )}
      {m.recommendation && (
        <Part icon={Lightbulb} title="ข้อเสนอแนะ AI" tone="var(--accent)">
          <RichText text={m.recommendation} />
          {m.sopFor && (
            <button
              onClick={() => openModal({ kind: "event", id: m.sopFor })}
              className="mt-1.5 flex items-center gap-1.5 text-[13px] text-accent hover:underline"
            >
              <ListChecks size={14} /> เปิด Checklist SOP · {m.sopFor} →
            </button>
          )}
        </Part>
      )}
    </div>
  );
}

/** Rule-based AI Assistant (prototype ask / renderChat, L394–405) */
export function AgentPanel() {
  const chat = useAppStore((s) => s.chat);
  const ask = useAppStore((s) => s.ask);
  const presentation = useAppStore((s) => s.presentation);
  const view = useAppStore((s) => s.view);
  const context = useAppStore(askContextLabel);
  const [draft, setDraft] = useState("");
  const [chipsOpen, setChipsOpen] = useState(false);
  // Suggested questions fold away after the first one, so the answers get the room
  const showChips = chat.length === 0 || chipsOpen || presentation;
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [chat.length]);

  return (
    // Blue-tinted frame with a running light, so the assistant reads as its own space (globals.css .ai-frame)
    <div className="ai-frame m-1.5 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-accent">AI Assistant</p>
          <p className="text-[13px] text-muted">ถามข้อมูล วิเคราะห์ และขอข้อเสนอแนะจากสถานะอาคาร</p>
        </div>
        <span className="shrink-0 rounded border border-gold/50 px-1.5 text-[10px] tracking-wider whitespace-nowrap text-gold">
          LOCAL DEMO
        </span>
      </div>
      <p className="border-b border-line bg-panel-2 px-4 py-1.5 text-[13px] text-muted">
        บริบท: {context} · ข้อมูลจำลอง
      </p>

      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4 text-[13px]" aria-live="polite">
        <div className="rounded-[var(--radius-card)] border border-line bg-panel-2 p-3.5">
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-accent">{GREETING.title}</p>
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
            <AnswerCard key={i} m={m} current={m.view === view} />
          ),
        )}
      </div>

      <div className="border-t border-line p-3">
        {chat.length > 0 && !presentation && (
          <button
            aria-expanded={chipsOpen}
            onClick={() => setChipsOpen(!chipsOpen)}
            className="mb-2 text-[13px] text-accent"
          >
            {chipsOpen ? "ซ่อนคำถามแนะนำ ▴" : "คำถามแนะนำ ▾"}
          </button>
        )}
        <div className={`mb-2.5 flex-wrap gap-1.5 ${showChips ? "flex" : "hidden"}`}>
          {QUICK_CHIPS[view].map((c) => (
            <button
              key={c.label}
              onClick={() => {
                setChipsOpen(false);
                ask(c.question);
              }}
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
        <p className="mt-2 text-[13px] text-muted">
          Rules engine ทำงานในเครื่อง · ตอบจากข้อมูลจำลองในหน้านี้ · ยังไม่เชื่อมต่อ LLM
        </p>
      </div>
    </div>
  );
}
