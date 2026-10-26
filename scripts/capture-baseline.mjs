// Captures screenshot baselines of the prototype (every view, scene mode and
// camera preset) into reference/screens. Uses the installed Microsoft Edge.
// Run: npm run capture-baseline
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const prototype = pathToFileURL(path.join(root, "reference", "PRM_Hospitality_DigitalTwin_example.html")).href;
const outDir = path.join(root, "reference", "screens");
const SETTLE_MS = 2500; // camera easing in the prototype needs ~2 s to come to rest

// Each shot starts from a fresh page load so shots do not depend on each other.
// `run` executes inside the prototype page, where its globals (setNav, setFloor, prmScene, ...) live.
const SHOTS = [
  ...["overview", "twin", "ioc", "energy", "hotel", "ai"].map((nav) => ({
    name: `view-${nav}`,
    run: (n) => setNav(n),
    arg: nav,
  })),
  { name: "mode-exterior", run: () => setNav("twin") },
  {
    name: "mode-xray",
    run: () => {
      setNav("twin");
      document.querySelector('[data-action="mode"][data-mode="xray"]').click();
    },
  },
  {
    name: "mode-slice-H12",
    run: () => {
      setNav("twin");
      setFloor("H12");
    },
  },
  {
    name: "mode-slice-L2",
    run: () => {
      setNav("twin");
      setFloor("L2");
    },
  },
  {
    name: "mode-explode",
    run: () => {
      setNav("twin");
      document.querySelector('[data-action="explode"]').click();
    },
  },
  {
    name: "mode-dusk",
    run: () => {
      setNav("twin");
      document.querySelector('[data-action="day"]').click();
    },
  },
  ...["all", "hotel", "mall", "plant", "arrival", "roof"].map((preset) => ({
    name: `camera-${preset}`,
    run: (p) => {
      setNav("twin");
      prmScene.focus(p);
    },
    arg: preset,
  })),
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

for (const shot of SHOTS) {
  await page.goto(prototype);
  await page.waitForSelector("#loading.hidden", { state: "attached", timeout: 15000 });
  await page.evaluate(shot.run, shot.arg);
  await page.waitForTimeout(SETTLE_MS);
  const file = path.join(outDir, `${shot.name}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 85 });
  console.log(`saved ${path.relative(root, file)}`);
}

await browser.close();
