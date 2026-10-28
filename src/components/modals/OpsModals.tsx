"use client";

// CCTV feed (prototype feedModal L407) and asset detail (prototype assetDetail L393)
import { CAMERAS, CctvFeed } from "@/components/cctv/CctvFeed";
import { AssetCard } from "@/components/panels/DetailsPanel";
import { SourceNotice } from "@/components/ui/Modal";

export function CctvModal({ camera }: { camera: number }) {
  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line bg-bg">
        <CctvFeed camera={camera} />
        <span className="absolute bottom-2 left-2 rounded bg-bg/80 px-2 py-0.5 font-mono text-[11px] tracking-wider text-[#b2e4cf]">
          {CAMERAS[camera].id} · SAMPLE FOOTAGE · NOT LIVE CCTV
        </span>
      </div>
      <SourceNotice>
        ภาพตัวอย่างการตรวจจับคน (People detection) เพื่อสาธิตหน้าจอ CCTV analytics ไม่ใช่ภาพสดจากกล้องของอาคารนี้
        ระบบจริงจะนับคนแบบไม่ระบุตัวตนจากกล้องที่ได้รับอนุญาต
      </SourceNotice>
      <p className="mt-3 text-[13px] text-muted">
        ตัวอย่าง Workflow: Detection → Operator verification → Locate in Digital Twin → Dispatch → Close incident
      </p>
    </>
  );
}

const LINKS = ["Building", "Floor / space", "System / asset", "Data points", "Incident / work order"];

export function AssetModal() {
  return (
    <>
      <AssetCard showDetails={false} />
      <h3>ความสัมพันธ์เชิงข้อมูล</h3>
      <div className="flex flex-wrap items-center gap-2">
        {LINKS.map((n, i) => (
          <span key={n} className="flex items-center gap-2">
            <span className="rounded-[4px] border border-line bg-panel-2 px-2.5 py-1 font-mono text-[12px] text-accent/90">
              {n}
            </span>
            {i < LINKS.length - 1 && <span className="text-muted">→</span>}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">
        แต่ละ Asset ใช้รหัสเดียวกันระหว่าง 3D, Sensor, เอกสาร และใบงาน
        เพื่อให้ทีมปฏิบัติการเข้าถึงบริบทของอุปกรณ์ได้จากจุดเดียว
      </p>
      <SourceNotice>
        ข้อมูลอุปกรณ์และรหัสในหน้านี้เป็นตัวอย่างการออกแบบ ต้องจัดทำ Asset register และ Interface matrix
        ของจริงก่อนเชื่อมต่อ
      </SourceNotice>
    </>
  );
}
