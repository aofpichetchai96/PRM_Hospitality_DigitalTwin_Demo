"use client";

import { AnimatePresence } from "motion/react";
import { CAMERAS } from "@/components/cctv/SyntheticFeed";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/store/useAppStore";
import type { ModalState } from "@/store/twinSlice";
import { EventModal } from "./EventModal";
import { AllRoomsModal, MethodologyModal } from "./HotelEnergyModals";
import { AssetModal, CctvModal } from "./OpsModals";
import { RoomModal } from "./RoomModal";
import { AboutModal, HelpModal, ReferenceModal } from "./InfoModals";
import { RoadmapModal, ValueModal } from "./ProposalModals";

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
    case "room":
      return m.id ? { title: `Hotel room ${m.id} · Simulated`, body: <RoomModal id={m.id} /> } : null;
    case "allRooms":
      return { title: "Hotel inventory · 600 simulated rooms", body: <AllRoomsModal />, wide: true };
    case "methodology":
      return { title: "Energy Lab · Illustrative calculation", body: <MethodologyModal /> };
    case "cctv":
      return {
        title: `Synthetic CCTV · ${CAMERAS[Number(m.id ?? 0)].name}`,
        body: <CctvModal camera={Number(m.id ?? 0)} />,
        wide: true,
      };
    case "asset":
      return { title: "Asset information · Digital Twin link", body: <AssetModal /> };
    case "value":
      return { title: "Value / ROI · ผลลัพธ์ที่คาดหวัง (ค่าสมมติ)", body: <ValueModal />, wide: true };
    case "roadmap":
      return { title: "Roadmap 3 เฟส · เริ่มเล็ก ขยายได้", body: <RoadmapModal />, wide: true };
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
