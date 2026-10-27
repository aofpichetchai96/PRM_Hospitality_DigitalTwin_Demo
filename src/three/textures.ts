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

/**
 * Facade tile for the surrounding city: 4 bays × 3 floors per repeat (about
 * 12 × 12 m), kept low-contrast so the hotel tower stays the focus. `lights`
 * is the emissive mask with a scatter of lit windows for dusk.
 */
export function createFacadeTextures() {
  const S = 512;
  const [c, x] = canvas(S, S);
  const [lc, lx] = canvas(S, S);
  const rand = createRng(31337);
  x.fillStyle = "#d6d9da";
  x.fillRect(0, 0, S, S);
  lx.fillStyle = "#000";
  lx.fillRect(0, 0, S, S);
  const floor = S / 3,
    bay = S / 4;
  for (let f = 0; f < 3; f++)
    for (let b = 0; b < 4; b++) {
      // Window band in the upper ~75 % of each floor; spandrel (solid wall) below
      const wx = b * bay + 7,
        wy = f * floor + 10,
        ww = bay - 14,
        wh = floor * 0.72;
      const v = 112 + Math.floor(rand() * 22);
      const g = x.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, `rgb(${v + 18},${v + 30},${v + 40})`);
      g.addColorStop(1, `rgb(${v},${v + 12},${v + 22})`);
      x.fillStyle = g;
      x.fillRect(wx, wy, ww, wh);
      x.fillStyle = "rgba(214,217,218,.55)";
      x.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
      if (rand() < 0.15) {
        lx.fillStyle = `rgba(255,${200 + Math.floor(rand() * 40)},150,${0.55 + rand() * 0.4})`;
        lx.fillRect(wx, wy, ww, wh);
      }
    }
  const make = (cv: HTMLCanvasElement) => {
    const t = new CanvasTexture(cv);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { map: make(c), lights: make(lc) };
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
