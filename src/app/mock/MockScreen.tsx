"use client";

// Phase 2 UI mock (PLAN 9): Twin and Overview at 1920 and 1280×720 using the
// real tokens and the real 3D scene. Approved layout becomes AppShell in Phase 4.
import { FooterBar } from "@/components/layout/FooterBar";
import { Header } from "@/components/layout/Header";
import { KpiStrip } from "@/components/layout/KpiStrip";
import { Sidebar } from "@/components/layout/Sidebar";
import { MockViewport } from "./MockViewport";
import { AgentPanel, OverviewBottomPanel, OverviewPanel, RightPanel } from "./panels";

const SCREENS = {
  twin: {
    title: "Digital Twin Command Center",
    subtitle: "อาคารเดียว สองธุรกิจ เชื่อมการมองเห็นและการตัดสินใจ",
  },
  overview: {
    title: "Executive Intelligence",
    subtitle: "ภาพรวมธุรกิจและปฏิบัติการ · ทุกตัวเลขเป็นข้อมูลจำลอง",
  },
} as const;

export function MockScreen({ screen }: { screen: keyof typeof SCREENS }) {
  const overview = screen === "overview";
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header {...SCREENS[screen]} showChartsButton={!overview} />
      <div className="flex min-h-0 flex-1">
        <Sidebar active={screen} openIncidents={3} />
        <main className="flex min-w-0 flex-1 flex-col gap-2 p-2">
          <div className="hidden tall:block">
            <KpiStrip />
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            <MockViewport time={overview ? "dusk" : "day"} showSecurity={overview} />
            <RightPanel>{overview ? <OverviewPanel /> : <AgentPanel />}</RightPanel>
          </div>
          {overview && <OverviewBottomPanel />}
        </main>
      </div>
      <FooterBar />
    </div>
  );
}
