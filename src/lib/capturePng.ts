// "Capture PNG" (prototype capture L410): save the current 3D frame. The
// canvas keeps its drawing buffer (Viewport), so the last frame is readable.
import { timeStr } from "./format";

export function capturePng(canvas: HTMLCanvasElement | null, time: number) {
  if (!canvas) return false;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRMHospitality_3D_${timeStr(time).replace(":", "")}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
  return true;
}
