// Demo smoke test (PLAN 11): every view at the three demo screen sizes, the
// feature showcase, Reset Demo, the main modals and the floor plan — with no
// console errors and no request leaving localhost (the demo runs offline).
import { expect, type Page, test } from "@playwright/test";

const VIEWS = [
  ["overview", "Executive overview"],
  ["twin", "Digital Twin"],
  ["ioc", "IOC operations"],
  ["energy", "Energy Lab"],
  ["hotel", "Hotel · 600 keys"],
  ["ai", "AI Assistant"],
] as const;

const SIZES = [
  [1920, 1200],
  [1920, 1080],
  [1280, 720],
] as const;

const T0_KPIS = ["84", "2,616", "27,840"];
/** The WebGL canvas; the CCTV feeds are canvases too but carry role="img" */
const SCENE = "canvas:not([role=img])";

/** Collects console errors, page errors and any request to another host */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol.startsWith("http"))
      problems.push(`external request: ${r.url()}`);
  });
  return problems;
}

async function open(page: Page, query = "") {
  await page.goto(`/${query}`);
  await expect(page.locator(SCENE)).toBeVisible({ timeout: 30_000 });
  // Skip the opening sweep so every test starts from the finished building
  await page.keyboard.press("Space");
  await page.waitForTimeout(1500);
}

const kpiStrip = (page: Page) => page.locator('section[aria-label="Simulated operational metrics"]').first();
const viewportShare = (page: Page) =>
  page.evaluate(() => document.querySelector("canvas:not([role=img])")!.getBoundingClientRect().height / innerHeight);

for (const [w, h] of SIZES) {
  test(`all six views at ${w}×${h} keep the 3D viewport ≥ 60 %`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize({ width: w, height: h });
    await open(page);
    const nav = page.getByRole("navigation", { name: "Workspace" }).getByRole("button");
    for (const [i, [id, title]] of VIEWS.entries()) {
      await nav.nth(i).click();
      await expect(page.locator("h1")).toHaveText(title);
      await expect(page).toHaveURL(new RegExp(`view=${id}`));
      // Poll: the canvas resizes a moment after panels animate in (slow on software WebGL)
      await expect.poll(() => viewportShare(page)).toBeGreaterThanOrEqual(0.6);
    }
    expect(problems).toEqual([]);
  });
}

test("KPIs start at the prototype's t0 values and Reset restores them", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?view=energy");
  for (const v of T0_KPIS) await expect(kpiStrip(page)).toContainText(v);
  await page.getByRole("button", { name: "จำลอง Setpoint 25°C →" }).click();
  await expect(kpiStrip(page)).toContainText("2,55");
  await page.keyboard.press("r");
  await expect(page).toHaveURL(/view=overview/);
  for (const v of T0_KPIS) await expect(kpiStrip(page)).toContainText(v);
  expect(problems).toEqual([]);
});

test("the executive demo shows business outcomes, value and roadmap", async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.getByRole("button", { name: "ชมเดโม" }).click();
  await page.getByRole("menuitem", { name: /Executive/ }).click();
  // .last(): the outgoing chapter's card is still fading out for a moment
  const card = page.locator('section[aria-label="Feature showcase"]').last();
  await expect(card).toContainText("EXECUTIVE · 01 / 06");
  await card.getByRole("button", { name: "หยุดชั่วคราว" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(card).toContainText("MTTR");
  await expect(card).toContainText("ค่าสมมติ");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("EXECUTIVE · 06 / 06").first()).toBeVisible();
  await card.getByRole("button", { name: "เล่นต่อ" }).click();
  await expect(page.getByRole("dialog")).toContainText("ค่าสมมติ");
  expect(problems).toEqual([]);
});

test("the technical showcase plays on its own and steps through every feature with the keyboard", async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.getByRole("button", { name: "ชมเดโม" }).click();
  await page.getByRole("menuitem", { name: /Technical deep-dive/ }).click();
  // .last(): the outgoing chapter's card is still fading out for a moment
  const card = page.locator('section[aria-label="Feature showcase"]').last();
  await expect(card).toContainText("TECHNICAL · 01 / 16");
  // The first beat hands over to the second without any input
  await expect(card).toContainText("Hotel tower · 600 ห้อง", { timeout: 10_000 });
  await card.getByRole("button", { name: "หยุดชั่วคราว" }).click();
  await expect(card.getByRole("button", { name: "เล่นต่อ" })).toBeVisible();

  const views = [
    ...["twin", "twin", "twin", "twin", "twin", "twin", "twin"],
    ...["ioc", "ioc", "ioc", "energy", "overview", "hotel", "ai", "twin", "overview"],
  ];
  for (const [i, view] of views.entries()) {
    await expect(page.getByText(`TECHNICAL · ${String(i + 1).padStart(2, "0")} / 16`).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`view=${view}`));
    await page.keyboard.press("ArrowRight");
  }
  await expect(card).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("incident workflow, room status and the main modals work", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?view=ioc");
  await page.getByRole("button", { name: "Verify →" }).click();
  await page.getByRole("button", { name: "Dispatch →" }).click();
  await expect(page.getByText("WO-001")).toBeVisible();

  await page.getByRole("button", { name: "จำลองเหตุการณ์" }).click();
  const alert = page.getByRole("alert", { name: /แจ้งเตือนใหม่ INC-004/ });
  await expect(alert).toContainText("ผู้ปฏิบัติงานยืนยันก่อนสั่งงาน");
  await alert.getByRole("button", { name: "เปิดเหตุการณ์ · Verify" }).click();
  await expect(page.getByRole("dialog")).toContainText("INC-004");
  await expect(alert).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /CAM LOBBY-01/ }).click();
  await expect(page.getByRole("dialog")).toContainText("SYNTHETIC SCENE");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/?view=hotel");
  await page.keyboard.press("Space");
  const cleaning = page.locator("aside button[aria-label$='Cleaning']").first();
  const room = (await cleaning.getAttribute("aria-label"))!.split(" ")[1];
  await cleaning.click();
  await page.getByRole("button", { name: /ทำความสะอาดเสร็จ/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(`aside button[aria-label="ห้อง ${room} · Ready"]`)).toBeVisible();

  for (const [open, title] of [
    ["ช่วยเหลือ", "วิธีใช้"],
    ["Model notes ↗", "Model notes"],
  ] as const) {
    await page.getByRole("button", { name: open }).click();
    await expect(page.getByRole("dialog")).toContainText(title);
    await page.keyboard.press("Escape");
  }
  expect(problems).toEqual([]);
});

test("floor plan opens, zooms and returns to 3D", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?view=twin");
  await page.getByRole("button", { name: "Floor Plan" }).click();
  const zoom = page.locator('[aria-label="เครื่องมือแปลน"] output');
  await expect(zoom).toHaveText("100%");
  await page.getByRole("button", { name: "ขยายแปลน" }).click();
  await expect(zoom).toHaveText("125%");
  await page.getByRole("button", { name: /Social floor/ }).click();
  await expect(page.locator('[aria-label="สำรวจแปลนอ้างอิง"] h2')).toHaveText("The social floor");
  await page.keyboard.press("Escape");
  await expect(page.locator('[aria-label="สำรวจแปลนอ้างอิง"]')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("slice, x-ray and explode render without errors", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?view=twin");
  await page.getByLabel("เลือกชั้น").selectOption("H12");
  await page.getByRole("button", { name: "X-ray" }).click();
  await page.getByRole("button", { name: /Explode/ }).click();
  await page.getByRole("button", { name: "Exterior" }).click();
  await page.waitForTimeout(1000);
  expect(problems).toEqual([]);
});
