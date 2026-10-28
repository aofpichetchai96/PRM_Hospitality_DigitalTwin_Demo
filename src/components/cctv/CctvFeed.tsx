// CCTV feeds for the Public Area / IOC overlay and the CCTV popup: sample
// people-detection footage (public/gifs). Sample clips, not live cameras — the
// UI labels them so, whatever the clip's own overlay says.
import { asset } from "@/lib/asset";

export const CAMERAS = [
  { id: "CAM LOBBY-01", name: "Lobby arrival", clip: "/gifs/lobby_analytics.gif" },
  { id: "CAM LIFT-02", name: "Lift hall", clip: "/gifs/elevator_analytics.gif" },
] as const;

export function CctvFeed({ camera, className = "" }: { camera: number; className?: string }) {
  const c = CAMERAS[camera];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated GIF from public/, shown as is
    <img
      src={asset(c.clip)}
      alt={`${c.id} · ภาพตัวอย่าง AI people detection ไม่ใช่กล้องจริง`}
      className={`block h-full w-full object-cover ${className}`}
    />
  );
}
