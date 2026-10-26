"use client";

import { AnimatePresence } from "motion/react";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/store/useAppStore";
import type { ModalState } from "@/store/twinSlice";
import { EventModal } from "./EventModal";
import { AboutModal, HelpModal, ReferenceModal } from "./InfoModals";

/** Title and body per modal kind; kinds land here as their views are built */
function content(m: ModalState): { title: string; body: React.ReactNode; wide?: boolean } | null {
  switch (m.kind) {
    case "help":
      return { title: "วิธีใช้ · PRM Hospitality Interactive Demo", body: <HelpModal /> };
    case "about":
      return { title: "Model notes · Assumptions & boundaries", body: <AboutModal /> };
    case "reference":
      return { title: "Facade references · PRM Hospitality", body: <ReferenceModal />, wide: true };
    case "event":
      return m.id ? { title: `เหตุการณ์ ${m.id}`, body: <EventModal id={m.id} /> } : null;
    default:
      return null;
  }
}

export function ModalHost() {
  const modal = useAppStore((s) => s.modal);
  const close = useAppStore((s) => s.closeModal);
  const c = modal && content(modal);
  return (
    <AnimatePresence>
      {c && (
        <Modal key={`${modal.kind}-${modal.id ?? ""}`} title={c.title} onClose={close} wide={c.wide}>
          {c.body}
        </Modal>
      )}
    </AnimatePresence>
  );
}
