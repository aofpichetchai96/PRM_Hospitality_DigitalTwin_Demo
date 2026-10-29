// Demo smoke test (PLAN 11): the workspace pages and seven scenes at the three demo screen sizes and
// by keyboard, Reset Demo, the alarm workflow with its SOP, room check-in, the
// lobby counts, the assistant's three-part answers, the main modals and the
// floor plan — with no console errors and no request leaving localhost (the
// demo runs offline).
import { expect, type Page, test } from "@playwright/test";

const SCENES = [
  ["overview", "Overview"],
  ["rooms", "Guest Room"],
  ["public", "Public Area"],
  ["event", "Event Hall"],
  ["boh", "Back of House"],
  ["ict", "ICT"],
  ["ai", "AI Assistant"],
] as const;

const WORKSPACE = [
  ["executive", "Executive overview"],
  ["twin", "Digital Twin"],
  ["ioc", "IOC operations"],
  ["energy", "Energy Lab"],
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
  test(`the workspace pages and seven scenes at ${w}×${h} keep the 3D viewport ≥ 60 %`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize({ width: w, height: h });
    await open(page);
    // The scenes only show with the menu open (it starts folded under 1440px)
    const unfold = page.getByRole("button", { name: "กางเมนู" });
    if (await unfold.isVisible()) await unfold.click();
    for (const [menu, items] of [
      ["Workspace", WORKSPACE],
      ["Property explorer", SCENES],
    ] as const) {
      const nav = page.getByRole("navigation", { name: menu }).getByRole("button");
      for (const [i, [id, title]] of items.entries()) {
        await nav.nth(i).click();
        await expect(page.locator("h1")).toHaveText(title);
        await expect(page).toHaveURL(new RegExp(`scene=${id}`));
        // Poll: the canvas resizes a moment after panels animate in (slow on software WebGL)
        await expect.poll(() => viewportShare(page)).toBeGreaterThanOrEqual(0.6);
      }
    }
    expect(problems).toEqual([]);
  });
}

test("keys 1–7 open the scenes and ← / → step through them", async ({ page }) => {
  const problems = watch(page);
  await open(page);
  for (const [i, [id, title]] of SCENES.entries()) {
    await page.keyboard.press(String(i + 1));
    await expect(page.locator("h1")).toHaveText(title);
    await expect(page).toHaveURL(new RegExp(`scene=${id}`));
  }
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("h1")).toHaveText("Overview");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("h1")).toHaveText("AI Assistant");
  expect(problems).toEqual([]);
});

test("KPIs start at the prototype's t0 values and Reset restores them", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=energy");
  for (const v of T0_KPIS) await expect(kpiStrip(page)).toContainText(v);
  await expect(kpiStrip(page)).toContainText("Open 3 · Pending 0");
  await page.getByRole("tab", { name: "Energy" }).click();
  await page.getByRole("button", { name: "จำลอง Setpoint 25°C →" }).click();
  await expect(kpiStrip(page)).toContainText("2,55");
  await page.keyboard.press("r");
  await expect(page).toHaveURL(/scene=overview/);
  for (const v of T0_KPIS) await expect(kpiStrip(page)).toContainText(v);
  expect(problems).toEqual([]);
});

test("an injected alarm opens Back of House with its SOP and moves through the workflow", async ({ page }) => {
  const problems = watch(page);
  await open(page);
  await page.keyboard.press("Shift+Digit1");
  await expect(page).toHaveURL(/scene=boh/);
  const alert = page.getByRole("alert", { name: /แจ้งเตือนใหม่ INC-004/ });
  await expect(alert).toContainText("CRITICAL");
  await expect(alert).toContainText("Fan current");
  await alert.getByRole("button", { name: "เปิด Alarm · Acknowledge" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("SOP · COOLING TOWER FAN TRIP");
  await dialog.getByText("ตรวจสถานะ Breaker").click();
  await expect(dialog).toContainText("1/5");
  await dialog.getByRole("button", { name: "รับทราบ (Acknowledge)" }).click();
  await page.keyboard.press("Escape");
  await expect(alert).toHaveCount(0);

  const list = page.getByRole("complementary", { name: "Operations and asset details" });
  await expect(list).toContainText("Acknowledged");
  await page.getByRole("button", { name: "Start work →" }).click();
  await expect(page.getByText("WO-001")).toBeVisible();
  await expect(kpiStrip(page)).toContainText("Open 3 · Pending 1");
  expect(problems).toEqual([]);
});

test("a reserved room checks in from its detail card", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=rooms");
  await expect(kpiStrip(page)).toContainText("504 / 34 / 62");
  const reserved = page.locator("aside button[aria-label$='Reserved']").first();
  const room = (await reserved.getAttribute("aria-label"))!.split(" ")[1];
  await reserved.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Check-in (คาดว่ามาถึง)");
  await expect(dialog).toContainText("kW");
  await dialog.getByRole("button", { name: "Check-in" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(`aside button[aria-label="ห้อง ${room} · Occupied"]`)).toBeVisible();
  await expect(kpiStrip(page)).toContainText("505 / 33 / 62");
  expect(problems).toEqual([]);
});

test("the lobby shows people counting, zones, AQI and the camera feeds", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=public");
  const panel = page.getByRole("complementary", { name: "Operations and asset details" });
  await expect(panel).toContainText("People counting");
  for (const zone of ["Entrance", "Lobby lounge", "Reception", "Lift hall", "Retail link"])
    await expect(panel).toContainText(zone);
  await expect(page.getByText(/^LOBBY LOUNGE · \d+ · AQI/)).toBeVisible();
  await page.keyboard.press("Shift+Digit5");
  await expect(kpiStrip(page)).toContainText("Lobby lounge");
  await expect(kpiStrip(page)).toContainText("Crowded");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /CAM LOBBY-01/ }).click();
  await expect(page.getByRole("dialog")).toContainText("SAMPLE FOOTAGE");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("the assistant answers in three parts with chips for the open scene", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=boh");
  await page.getByRole("tab", { name: "AI Assistant" }).click();
  await page.getByRole("button", { name: "Alarm ค้าง" }).click();
  const answer = page.locator("[aria-live=polite] > div").last();
  for (const part of ["ข้อมูล", "การวิเคราะห์", "ข้อเสนอแนะ AI", "แหล่งข้อมูล:", "ช่วงเวลา:"])
    await expect(answer).toContainText(part);
  await answer.getByRole("button", { name: /เปิด Checklist SOP/ }).click();
  await expect(page.getByRole("dialog")).toContainText("SOP");
  await page.keyboard.press("Escape");

  // The header button opens the assistant too; the header clock shows today's date in Thailand
  await page.getByRole("tab", { name: "Alarm & Events" }).click();
  await page.getByRole("navigation", { name: "คำสั่ง" }).getByRole("button", { name: "AI Assistant" }).click();
  await expect(page.getByRole("tab", { name: "AI Assistant" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("header time")).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.locator("header")).toContainText(/\d{2} [A-Z][a-z]{2} \d{2}/);
  expect(problems).toEqual([]);
});

test("Event Hall lists today's bookings and the AI scene shows the carbon footprint", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=event");
  const panel = page.getByRole("complementary", { name: "Operations and asset details" });
  await expect(panel).toContainText("Hospitality Leaders Summit");
  await expect(panel).toContainText("Grand Ballroom");
  await expect(page.getByText("GRAND BALLROOM · 320/480", { exact: false })).toBeVisible();
  await page.keyboard.press("7");
  await expect(page.locator("h1")).toHaveText("AI Assistant");
  await page.getByRole("tab", { name: "Carbon" }).click();
  await expect(panel).toContainText("Chilled water");
  await expect(panel).toContainText("tCO₂e");
  await page.getByRole("tab", { name: "Year" }).click();
  await expect(page.getByText("Carbon intensity")).toBeVisible();
  expect(problems).toEqual([]);
});

test("ICT shows the server room alone, with each rack's devices and ports", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=ict");
  await expect(page.locator("h1")).toHaveText("ICT");
  await expect(kpiStrip(page)).toContainText("DEVICES ONLINE");
  // No building controls in this scene
  await expect(page.getByRole("button", { name: "เลือกชั้น" })).toHaveCount(0);
  const panel = page.getByRole("complementary", { name: "Operations and asset details" });
  await panel.getByRole("button", { name: /^A03/ }).click();
  await expect(panel).toContainText("Rack A03");
  await expect(panel).toContainText("Access switch · 48×1G");
  await expect(panel.getByLabel(/ports$/).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toContainText("Server room · MDF-01");
  // Presets dropdown: every numbered area of the room
  const areas = page.getByRole("button", { name: "จุดในห้อง Server" });
  await areas.click();
  await page
    .getByRole("listbox", { name: "จุดในห้อง Server" })
    .getByRole("button", { name: /Generator room/ })
    .click();
  await expect(areas).toContainText("Generator room");
  await page.keyboard.press("Escape");
  await expect(areas).toContainText("ทั้งห้อง Server");
  expect(problems).toEqual([]);
});

test("floor plan opens, zooms and returns to 3D", async ({ page }) => {
  const problems = watch(page);
  await open(page, "?scene=ai");
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
  await open(page, "?scene=ai");
  await page.getByRole("button", { name: "เลือกชั้น" }).click();
  await page.getByRole("button", { name: /^H12 ·/ }).click();
  await expect(page.getByRole("button", { name: "เลือกชั้น" })).toContainText("H12");
  await page.getByRole("button", { name: "X-ray" }).click();
  await page.getByRole("button", { name: /Explode/ }).click();
  await page.getByRole("button", { name: "Exterior" }).click();
  await page.waitForTimeout(1000);
  expect(problems).toEqual([]);
});
