"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import { DURATION, EASE_OUT } from "@/lib/motion";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Base modal: backdrop click and Esc close it (Esc is handled by the global
 * keyboard hook), focus moves in and is trapped, then returns on close.
 */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus?.();
  }, []);

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DURATION.fast } }}
      exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={trapTab}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.base, ease: EASE_OUT } }}
        exit={{ opacity: 0, y: 6, transition: { duration: DURATION.fast } }}
        className={`flex max-h-[86vh] w-full flex-col overflow-hidden rounded-[var(--radius-modal)] border border-line bg-panel shadow-2xl ${
          wide ? "max-w-[880px]" : "max-w-[620px]"
        }`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button aria-label="ปิด" onClick={onClose} className="text-muted hover:text-text">
            <X size={18} />
          </button>
        </header>
        <div className="overflow-auto px-5 py-4 text-[14px] [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:font-semibold">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Small print at the bottom of a modal */
export function SourceNotice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-[var(--radius-button)] border border-line bg-panel-2 px-3 py-2 text-[13px] text-muted">
      {children}
    </p>
  );
}
