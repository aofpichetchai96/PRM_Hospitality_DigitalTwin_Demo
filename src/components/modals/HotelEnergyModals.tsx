// "All 600 rooms" (prototype allRooms L392) and the Energy Lab methodology
// (prototype methodology L386).
import { SourceNotice } from "@/components/ui/Modal";
import { RoomCell, StatusLegend } from "@/components/ui/StatusChip";
import { GUEST_FLOORS } from "@/data/property";
import { useAppStore } from "@/store/useAppStore";

export function AllRoomsModal() {
  const rooms = useAppStore((s) => s.rooms);
  const openModal = useAppStore((s) => s.openModal);
  return (
    <>
      <p className="text-muted">23 ชั้นห้องพัก (19 × 28 + 4 × 17 = 600 keys) · คลิกหมายเลขห้องเพื่อดูรายละเอียด</p>
      <StatusLegend className="my-3" />
      <div className="flex flex-col gap-1">
        {[...GUEST_FLOORS].reverse().map((f) => (
          <div key={f.id} className="grid grid-cols-[44px_1fr] items-center gap-2">
            <span className="font-mono text-[12px] text-muted">{f.id}</span>
            <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]">
              {rooms
                .filter((r) => r.floor === f.id)
                .map((r) => (
                  <RoomCell
                    key={r.id}
                    id={r.id}
                    status={r.status}
                    compact
                    onClick={() => openModal({ kind: "room", id: r.id })}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const FORMULAS: [string, string][] = [
  ["Weather factor", "1 + (Outdoor temperature − 32) × 0.025"],
  ["Mall cooling baseline", "720 kW × Footfall factor × Weather factor"],
  ["Hotel cooling baseline", "900 kW × Occupancy fraction × Weather factor"],
  ["Other building loads", "1,140 kW (คงที่ตามสมมติฐาน)"],
  ["Scenario cooling", "Baseline cooling × [1 − (Setpoint − 24) × 0.045]"],
  ["Scenario demand", "Other loads + Scenario cooling"],
  ["Energy difference", "Demand difference × 16 hours / day"],
  ["Illustrative cost difference", "Energy difference × Assumed tariff"],
];

export function MethodologyModal() {
  return (
    <>
      <p>
        ค่าที่แสดงคือการทดลองเปรียบเทียบ <strong className="text-accent">Setpoint ที่เลือก กับฐาน 24°C</strong> โดยใช้
        Occupancy และอุณหภูมิภายนอกเดียวกัน · Footfall factor = จำนวนคนเข้าห้างขณะนั้น ÷ 27,840
      </p>
      <table className="mt-3 w-full text-[13px]">
        <tbody>
          {FORMULAS.map(([k, v]) => (
            <tr key={k} className="border-t border-line">
              <td className="py-1.5 pr-3 text-muted">{k}</td>
              <td className="py-1.5 font-mono text-[12px]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SourceNotice>
        ตัวคูณทั้งหมดเป็นสมมติฐานการสาธิต ไม่ได้สอบเทียบกับอาคารจริง การปรับอุณหภูมิในงานจริงต้องคำนึงถึง Comfort,
        Humidity, Ventilation, Occupancy, Equipment constraints และการอนุมัติของทีมปฏิบัติการ
      </SourceNotice>
      <p className="mt-3 text-[13px] text-muted">
        ค่าไฟเริ่มต้น 4.50 THB/kWh เป็นเพียงค่าป้อนตัวอย่าง ไม่ใช่อัตราค่าไฟปัจจุบัน ไม่รวม Demand charge, Ft แยกรายการ,
        ภาษี หรือเงื่อนไขสัญญา
      </p>
    </>
  );
}
