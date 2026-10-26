// Canvas textures (prototype `makeTextures`, L119–123). Browser only.
// The prototype's LED `screen` and fake `shadow` textures are not ported: the
// screen was only used by dead code and shadows are real shadow maps now.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { createRng } from "./geometry/builder";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/**
 * Arrival nameplate in the app font. Call `redraw()` once `document.fonts.ready`
 * resolves — before that the canvas would fall back to a system font.
 */
export function createSignTexture() {
  const [c, x] = canvas(512, 160);
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const redraw = () => {
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-inter").trim() || "sans-serif";
    x.clearRect(0, 0, 512, 160);
    x.fillStyle = "#f4efe4";
    x.font = `500 39px ${font}`;
    x.textAlign = "center";
    x.fillText("PRM Hospitality", 256, 86);
    x.font = `18px ${font}`;
    x.fillStyle = "#ddd7c6";
    x.fillText("H O S P I T A L I T Y", 256, 120);
    texture.needsUpdate = true;
  };
  redraw();
  return { texture, redraw };
}

/** Speckled asphalt */
export function createRoadTexture() {
  const [c, x] = canvas(512, 512);
  const rand = createRng(74021);
  x.fillStyle = "#303c48";
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5500; i++) {
    const v = 35 + Math.floor(rand() * 38);
    x.fillStyle = `rgba(${v},${v + 5},${v + 9},.28)`;
    x.fillRect(rand() * 512, rand() * 512, 2, 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Screen-space radial sky matching the prototype's viewport CSS background */
export function createSkyTexture(stops: readonly [string, string, string], center: readonly [number, number]) {
  const [c, x] = canvas(1024, 512);
  const cx = center[0] * 1024,
    cy = center[1] * 512;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, 760);
  g.addColorStop(0, stops[0]);
  g.addColorStop(0.48, stops[1]);
  g.addColorStop(1, stops[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
