// Extracts the base64 images embedded in the prototype (`const ASSETS = {...}`)
// and writes them to public/images as WebP. Run: npm run extract-assets
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "reference", "PRM_Hospitality_DigitalTwin_example.html");
const outDir = path.join(root, "public", "images");

// Prototype key → published file name
const FILES = {
  reference: "reference.webp",
  hero: "hero.webp",
  residencePlan: "residence-plan.webp",
  socialPlan: "social-plan.webp",
};

const html = await readFile(source, "utf8");
const match = html.match(/const ASSETS=(\{.*?\});/s);
if (!match) throw new Error("ASSETS block not found in prototype");
const assets = JSON.parse(match[1]);

await mkdir(outDir, { recursive: true });
for (const [key, dataUri] of Object.entries(assets)) {
  const file = FILES[key];
  if (!file) throw new Error(`Unknown asset key: ${key}`);
  const input = Buffer.from(dataUri.split(",", 2)[1], "base64");
  const output = await sharp(input).webp({ quality: 82 }).toBuffer();
  const { width, height } = await sharp(output).metadata();
  await writeFile(path.join(outDir, file), output);
  console.log(
    `${file.padEnd(22)} ${width}×${height}  ${(input.length / 1024).toFixed(0)} KB jpeg → ${(output.length / 1024).toFixed(0)} KB webp`,
  );
}
