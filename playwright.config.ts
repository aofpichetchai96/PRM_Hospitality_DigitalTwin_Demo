// Smoke tests against the production build (PLAN 11). Locally the installed
// Microsoft Edge is used, as on the demo machine; CI uses Playwright's Chromium.
// Run: npm run build && npm run test:e2e
import { defineConfig } from "@playwright/test";

const PORT = 3123;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.CI ? undefined : "msedge",
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      // CI runners have no GPU: allow Chromium's software WebGL (SwiftShader)
      args: process.env.CI
        ? ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"]
        : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
