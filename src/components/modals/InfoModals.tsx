// Static info modals ported from the prototype: help (L383), model notes
// (L384) and facade references (L385).
import { Play } from "lucide-react";
import { SourceNotice } from "@/components/ui/Modal";
import { useAppStore } from "@/store/useAppStore";

const HELP_KEYS: [string, string][] = [
  ["หมุน / ซูมอาคาร", "ลากเมาส์หรือนิ้วเพื่อหมุน · เลื่อนล้อเมาส์หรือจีบนิ้วเพื่อซูม · คลิกขวาลากเพื่อ Pan"],
  ["สำรวจภายใน", "กด X-ray / Explode หรือเลือกชั้น G, L1–L4, H01–H30 จากเมนูใต้ภาพ"],
  ["Incident workflow", "IOC operations → เลือกเหตุการณ์ → Verify → Dispatch → Resolve"],
  ["จำลองพลังงาน", "Energy Lab → ปรับ Setpoint / Occupancy / Outdoor temperature → ดูผลเปรียบเทียบ"],
  ["Hotel / AI Assistant", "ดูห้องทั้งหมด 600 ห้อง หรือลองถามคำถามภาษาไทยเกี่ยวกับข้อมูลจำลอง"],
  ["Presentation / Snapshot", "ปุ่มขยายซ่อนแผงข้อมูล · Export ส่งออกข้อมูล JSON"],
];

const SHORTCUTS: [string, string][] = [
  ["← / →", "ขั้นก่อนหน้า / ถัดไปของ Guided Demo (รองรับ clicker)"],
  ["P", "Presentation mode"],
  ["R", "Reset Demo กลับค่าเริ่มต้น"],
  ["Esc", "ปิดหน้าต่าง / จบ Demo / ออกจาก Presentation"],
];

export function HelpModal() {
  const startTour = useAppStore((s) => s.startTour);
  const quality = useAppStore((s) => s.quality);
  const setQuality = useAppStore((s) => s.setQuality);
  return (
    <>
      <p>สำรวจโครงการ Mixed-use ผ่านโมเดล 3D อ้างอิงภาพที่ให้มา พร้อมทดลองกระบวนการ IOC และข้อมูลจำลอง</p>
      <dl className="mt-3 grid gap-2">
        {HELP_KEYS.map(([k, v]) => (
          <div key={k} className="rounded-[var(--radius-button)] border border-line px-3 py-2">
            <dt className="font-semibold">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <h3>คีย์ลัด</h3>
      <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>
              <kbd className="rounded border border-line bg-panel-2 px-1.5 font-mono text-[12px]">{k}</kbd>
            </dt>
            <dd className="text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <h3>คุณภาพภาพ 3D</h3>
      <div className="flex gap-2">
        {(["high", "medium", "low"] as const).map((q) => (
          <button
            key={q}
            aria-pressed={q === quality}
            onClick={() => setQuality(q)}
            className={`rounded-[var(--radius-button)] border px-3 py-1 text-[13px] ${
              q === quality ? "border-accent text-accent" : "border-line text-muted"
            }`}
          >
            {{ high: "สูง", medium: "กลาง", low: "ต่ำ (เครื่องช้า)" }[q]}
          </button>
        ))}
      </div>
      <SourceNotice>ทำงานบนเครื่องนี้ทั้งหมด ไม่ต้องใช้อินเทอร์เน็ต / API key และไม่ส่งข้อมูลออกภายนอก</SourceNotice>
      <button
        onClick={() => startTour()}
        className="mt-4 flex items-center gap-2 rounded-[var(--radius-button)] bg-accent px-4 py-2 font-semibold text-bg"
      >
        <Play size={16} fill="currentColor" /> เริ่ม Guided Demo
      </button>
    </>
  );
}

const BOUNDARIES: [string, string][] = [
  ["Mall + Hotel 600 keys", "สมมติฐานเดิมที่เก็บไว้เพื่อสาธิต"],
  ["Hotel 23 ชั้นห้องพัก (19 × 28 + 4 × 17)", "จัดตามรูปอาคารอ้างอิง ไม่ใช่จำนวนชั้นจริง"],
  ["Retail G + L1–L4", "ผังชั้นจำลอง ต้องยืนยันด้วยแบบล่าสุด"],
  ["พื้นที่ภายใน / Plant / Asset locations", "แสดงเชิงแนวคิด ไม่ยืนยันตำแหน่งติดตั้งจริง"],
  ["ถนน / อาคารข้างเคียง / ทิศเหนือ", "บริบทจำลอง ไม่ใช่แผนที่สำรวจโครงการ"],
  ["PMS, BMS, CCTV, Meter, Work order", "ข้อมูลสมมติที่ทำงานภายในเบราว์เซอร์"],
  ["AI Assistant", "Rule-based scripted demo ไม่ใช่ LLM จริง"],
  ["Energy saving / tariff / COP", "สมมติเพื่ออธิบาย ไม่รับประกันผลประหยัด"],
];

export function AboutModal() {
  const openModal = useAppStore((s) => s.openModal);
  return (
    <>
      <p>
        <strong className="text-accent">Purpose:</strong> แบบจำลองเชิงแนวคิดสำหรับ Piramid Solutions ในบทบาท Consultant
        & Designer เพื่อสาธิต IOC + Digital Twin + AI สำหรับ PRM Hospitality
      </p>
      <h3>ข้อมูลอ้างอิงและความแม่นยำ</h3>
      <p className="text-muted">
        รูปทรงอาคารและลายฟาซาดอ้างอิงภาพโครงการที่ผู้ใช้ให้: หอสูงมุมโค้งเหนือฐานอาคาร ครีบฟาซาดสีขาว กระจก โครงสีอิฐ
        และสวนลอยฟ้าเป็นช่วงชั้น โมเดลนี้สร้างขึ้นใหม่ด้วยเรขาคณิต 3D ไม่ใช่ไฟล์ BIM หรือ As-built
      </p>
      <table className="mt-3 w-full text-[13px]">
        <thead>
          <tr className="text-left text-muted">
            <th className="py-1 font-normal">องค์ประกอบ</th>
            <th className="py-1 font-normal">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {BOUNDARIES.map(([k, v]) => (
            <tr key={k} className="border-t border-line">
              <td className="py-1.5 pr-3">{k}</td>
              <td className="py-1.5 text-muted">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>ก่อนเชื่อมกับโครงการจริง</h3>
      <p className="text-muted">
        ต้องรับ BIM / IFC / GLB และแบบสถาปัตย์ล่าสุด, Asset register, Index code, System interface matrix, Data point
        list, API credentials ที่ได้รับอนุญาต, ขอบเขตสิทธิ์ Mall / Hotel, Cybersecurity review และ SOP
        ที่เจ้าของโครงการอนุมัติ
      </p>
      <SourceNotice>
        ไม่เชื่อมต่อระบบอาคาร ไม่ส่งข้อมูลออกภายนอก ไม่เก็บข้อมูลแขก และไม่บันทึกสถานะถาวร เมื่อรีเฟรชหน้า
        ข้อมูลจำลองจะกลับเป็นค่าเริ่มต้น
      </SourceNotice>
      <button onClick={() => openModal({ kind: "reference" })} className="mt-3 text-[13px] text-accent">
        ดูภาพโครงการต้นทาง →
      </button>
    </>
  );
}

export function ReferenceModal() {
  return (
    <>
      <p>
        รูปแบบฟาซาดตามภาพอ้างอิง: ครีบแนวตั้งสีขาว กระจกมุมโค้ง โครงสร้างสีอิฐ และสวนลอยฟ้า โมเดล PRM Hospitality
        ใช้หอสูงเดี่ยวเป็นรูปทรงหลัก พร้อมฐานอาคารและสวนต่างระดับ
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          [
            "/images/reference.webp",
            "01 · ฟาซาดและสวนลอยฟ้า",
            "Reference 1: rounded white facade and planted sky courts",
          ],
          [
            "/images/hero.webp",
            "02 · ครีบแนวตั้งและฐานอาคาร",
            "Reference 2: white fins and terracotta garden terraces",
          ],
        ].map(([src, caption, alt]) => (
          <figure key={src} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element -- local reference images */}
            <img src={src} alt={alt} className="h-[340px] w-full object-contain" />
            <figcaption className="px-3 py-1.5 text-[13px] text-muted">{caption}</figcaption>
          </figure>
        ))}
      </div>
      <SourceNotice>
        ภาพต้นทางใช้เป็นแนวทางด้านรูปแบบ ไม่ใช่ภาพของโครงการ PRM Hospitality ที่สร้างจริง ผังภายใน จำนวนห้อง
        และข้อมูลปฏิบัติการยังเป็นข้อมูลจำลอง
      </SourceNotice>
    </>
  );
}
