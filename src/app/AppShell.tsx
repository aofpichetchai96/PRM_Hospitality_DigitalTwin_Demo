"use client";

// Header + Sidebar + KPI + [Viewport | Right panel] + Bottom panel + Footer
// (PLAN 8). The Canvas mounts once; switching views only changes store state.
import { MotionConfig } from "motion/react";
import { FooterBar } from "@/components/layout/FooterBar";
import { Header } from "@/components/layout/Header";
import { KpiStrip } from "@/components/layout/KpiStrip";
import { Sidebar } from "@/components/layout/Sidebar";
import { ModalHost } from "@/components/modals/ModalHost";
import { BottomPanel } from "@/components/panels/BottomPanel";
import { RightPanel } from "@/components/panels/RightPanel";
import { Toast } from "@/components/ui/Toast";
import { ViewportPanel } from "@/components/viewport/ViewportPanel";
import { useAppStore } from "@/store/useAppStore";
import { useSimTicker } from "@/store/useSimTicker";
import { useAttractMode, useKeyboard, useProjectorTokens, useUrlSync } from "./useShellEffects";

export default function AppShell() {
  const presentation = useAppStore((s) => s.presentation);
  useSimTicker();
  useUrlSync();
  useKeyboard();
  useAttractMode();
  useProjectorTokens(presentation);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-screen flex-col overflow-hidden">
        {!presentation && <Header />}
        <div className="flex min-h-0 flex-1">
          {!presentation && <Sidebar />}
          <main className={`flex min-w-0 flex-1 flex-col gap-2 ${presentation ? "p-0" : "p-2"}`}>
            {!presentation && (
              <div className="hidden tall:block">
                <KpiStrip />
              </div>
            )}
            <div className="flex min-h-0 flex-1 gap-2">
              <ViewportPanel />
              {!presentation && <RightPanel />}
            </div>
            {!presentation && <BottomPanel />}
          </main>
        </div>
        {!presentation && <FooterBar />}
      </div>
      <ModalHost />
      <Toast />
    </MotionConfig>
  );
}
