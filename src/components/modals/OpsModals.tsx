"use client";

// CCTV feed (prototype feedModal L407) and asset detail (prototype assetDetail L393)
import { CAMERAS, SyntheticFeed } from "@/components/cctv/SyntheticFeed";
import { AssetCard } from "@/components/panels/DetailsPanel";
import { SourceNotice } from "@/components/ui/Modal";

export function CctvModal({ camera }: { camera: number }) {
  return (
    <>
      <div className="relative h-[300px] overflow-hidden rounded-[var(--radius-card)] border border-line">
        <SyntheticFeed camera={camera} />
        <span className="absolute top-2 left-3 font-mono text-[11px] tracking-wider text-[#b2e4cf]">
          {CAMERAS[camera].id} · SYNTHETIC SCENE · NOT LIVE CCTV
        </span>
      </div>
      <SourceNotice>
        ภาพนี้วาดขึ้นเพื่อจำลองหน้าจอ CCTV และกรอบ People detection ไม่มีภาพจากกล้องจริงหรือข้อมูลบุคคลจริง
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
