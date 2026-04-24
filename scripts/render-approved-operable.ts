/**
 * Renders public/videos/approved-vs-operable.html to a pixel-perfect MP4.
 *
 * Usage:
 *   npx tsx scripts/render-approved-operable.ts
 *
 * Requires:
 *   - Dev server running at localhost:3000
 *   - playwright (npm install --save-dev playwright; npx playwright install chromium)
 *   - ffmpeg on PATH (brew install ffmpeg)
 */

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const URL = "http://localhost:3000/videos/approved-vs-operable.html?hold&hide-ui";
const OUTPUT_MP4 = path.resolve("public/videos/approved-vs-operable.mp4");
const DURATION_MS = 48_000;
const TAIL_BUFFER_MS = 500;

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "render-aix-"));
  console.log(`→ Temp dir: ${tmpDir}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: tmpDir,
      size: { width: 1080, height: 1350 },
    },
  });

  const page = await context.newPage();
  console.log(`→ Loading ${URL}`);
  await page.goto(URL, { waitUntil: "networkidle" });

  // Ensure Google Fonts Inter is ready before starting animation
  await page.evaluate(() => (document as Document).fonts.ready);
  await page.waitForTimeout(300);

  // Precisely start the animation
  console.log(`→ Starting animation (${DURATION_MS}ms)`);
  const t0 = Date.now();
  await page.evaluate(() => (window as unknown as { __animStart: () => void }).__animStart());

  // Wait for animation to finish + tail buffer
  await page.waitForTimeout(DURATION_MS + TAIL_BUFFER_MS);
  const elapsed = Date.now() - t0;
  console.log(`→ Animation ran ${elapsed}ms`);

  // Close context to flush the video file
  await context.close();
  await browser.close();

  // Find the WebM
  const webmFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".webm"));
  if (webmFiles.length === 0) throw new Error("No WebM was produced");
  const webmPath = path.join(tmpDir, webmFiles[0]);
  const webmSize = (fs.statSync(webmPath).size / 1024 / 1024).toFixed(2);
  console.log(`→ WebM: ${webmPath} (${webmSize} MB)`);

  // Convert WebM → MP4 (H.264, LinkedIn-friendly)
  console.log(`→ Converting to MP4 with ffmpeg`);
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", webmPath,
      "-t", String(DURATION_MS / 1000),
      "-c:v", "libx264",
      "-crf", "18",
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-r", "30",
      OUTPUT_MP4,
    ],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with code ${result.status}`);
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const mp4Size = (fs.statSync(OUTPUT_MP4).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ MP4 saved: ${OUTPUT_MP4}`);
  console.log(`  Size: ${mp4Size} MB`);
  console.log(`  Dimensions: 1080 × 1350 (4:5)`);
  console.log(`  Duration: ${DURATION_MS / 1000}s`);
}

main().catch((err) => {
  console.error("✗ Render failed:", err);
  process.exit(1);
});
