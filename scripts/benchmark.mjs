// Performance check for the demo machine (PLAN 11): opens the heaviest shot —
// Overview at dusk, auto-rotating, High quality — in Microsoft Edge and reports
// the GPU in use and the frame rate over 10 s. Target: ≥ 50 fps.
// Run: npm run build && npm run benchmark   (uses port 3125)
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const PORT = 3125;
const SECONDS = 10;
const TARGET_FPS = 50;
const sizes = [
  [1920, 1200],
  [1920, 1080],
];

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  cwd: root,
  stdio: "ignore",
});
const stop = () => server.kill();
process.on("exit", stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

await waitForServer();
const browser = await chromium.launch({ channel: "msedge", args: ["--ignore-gpu-blocklist", "--enable-gpu"] });
let ok = true;
for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`http://localhost:${PORT}/?view=overview`);
  await page.locator("canvas:not([role=img])").waitFor();
  await page.keyboard.press("Space"); // skip the intro sweep
  await page.waitForTimeout(3000); // shader compile and first shadow pass
  const result = await page.evaluate(async (seconds) => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const gpu = gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "WebGL2 unavailable";
    const times = [];
    await new Promise((done) => {
      const t0 = performance.now();
      const frame = (t) => {
        times.push(t);
        if (t - t0 < seconds * 1000) requestAnimationFrame(frame);
        else done();
      };
      requestAnimationFrame(frame);
    });
    // Frame rate per second; the worst second is what the audience notices
    const perSecond = [];
    for (let s = 0; s < seconds; s++)
      perSecond.push(times.filter((t) => t - times[0] >= s * 1000 && t - times[0] < (s + 1) * 1000).length);
    return { gpu, avg: (times.length - 1) / seconds, min: Math.min(...perSecond.slice(1)) };
  }, SECONDS);
  const pass = result.min >= TARGET_FPS;
  ok &&= pass;
  console.log(`${w}×${h} · ${result.gpu}`);
  console.log(
    `  avg ${result.avg.toFixed(1)} fps · worst second ${result.min} fps · ${pass ? "PASS" : "FAIL"} (target ≥ ${TARGET_FPS})`,
  );
  await page.close();
}
await browser.close();
stop();
if (!ok) {
  console.log(
    "\nต่ำกว่าเป้า: ตรวจว่า Windows Graphics ตั้ง browser เป็น High performance (README) หรือลดคุณภาพภาพ 3D ในหน้าช่วยเหลือ",
  );
  process.exitCode = 1;
}
