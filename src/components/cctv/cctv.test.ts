import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAMERAS } from "./CctvFeed";

describe("CCTV feeds", () => {
  it("point at clips that exist under public/", () => {
    for (const c of CAMERAS) expect(existsSync(join(process.cwd(), "public", c.clip)), c.clip).toBe(true);
  });
});
