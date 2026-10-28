// Room status in 2D always pairs colour with an icon, so red / green colour
// blindness never hides a status (PLAN 8).
import { CalendarClock, CircleCheck, type LucideIcon, UserRound } from "lucide-react";
import type { RoomStatus } from "@/types";

export const STATUS_META: Record<RoomStatus, { label: string; th: string; color: string; Icon: LucideIcon }> = {
  occupied: { label: "Occupied", th: "มีผู้เข้าพัก", color: "var(--status-occupied)", Icon: UserRound },
  reserved: { label: "Reserved", th: "จองแล้ว ยังไม่เข้าพัก", color: "var(--status-reserved)", Icon: CalendarClock },
  available: { label: "Available", th: "ว่าง พร้อมขาย", color: "var(--status-available)", Icon: CircleCheck },
};

export const STATUS_ORDER: RoomStatus[] = ["occupied", "reserved", "available"];

export function StatusIcon({ status, size = 12 }: { status: RoomStatus; size?: number }) {
  const { Icon, color, label } = STATUS_META[status];
  return <Icon size={size} strokeWidth={2} style={{ color }} aria-label={label} />;
}

/** Legend row: icon + colour + label for every status */
export function StatusLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted ${className}`}>
      {STATUS_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <StatusIcon status={s} /> {STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}

/** One room as a clickable cell: number, status colour and icon */
export function RoomCell({
  id,
  status,
  onClick,
  compact = false,
}: {
  id: string;
  status: RoomStatus;
  onClick: () => void;
  compact?: boolean;
}) {
  const { color, label } = STATUS_META[status];
  return (
    <button
      onClick={onClick}
      title={`${id} · ${label}`}
      aria-label={`ห้อง ${id} · ${label}`}
      className={`flex items-center justify-center gap-0.5 rounded-[4px] border font-mono tabular-nums transition-[filter] hover:brightness-125 ${
        compact ? "h-5 text-[9px]" : "h-8 text-[11px]"
      }`}
      style={{
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}
    >
      {!compact && <StatusIcon status={status} size={10} />}
      {id.slice(-2)}
    </button>
  );
}
