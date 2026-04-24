/**
 * Renders an AirIndex Market Snapshot to a pixel-perfect PNG.
 *
 * Usage:
 *   npx tsx scripts/render-snapshot.ts miami                # single city
 *   npx tsx scripts/render-snapshot.ts miami phoenix dallas # multiple
 *   npx tsx scripts/render-snapshot.ts --all                # all tracked markets
 *
 * Requires:
 *   - Dev server running at localhost:3000
 *   - playwright (already installed for the video render)
 *
 * Output: public/snapshots/output/<cityId>.png (1080×1350 @ DPR 2 → 2160×2700 physical)
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const VIEWPORT = { width: 1080, height: 1350 };
const DPR = 2;

async function renderCity(cityId: string, outDir: string): Promise<boolean> {
  const url = `http://localhost:3000/snapshots/${cityId}`;
  const outPath = path.join(outDir, `${cityId}.png`);

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DPR,
    });
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: "networkidle" });
    if (!resp || resp.status() !== 200) {
      console.error(`  ✗ ${cityId} — HTTP ${resp?.status() ?? "no response"}`);
      return false;
    }
    await page.evaluate(() => (document as Document).fonts.ready);
    await page.waitForTimeout(250);

    // Screenshot the full card frame — we want the stage-wrapper element itself.
    // But since the card has fixed 1080×1350 layout scaled via transform, we need
    // the underlying .card element at native size. The stage-wrapper scales to the
    // viewport, which we set to exactly 1080×1350 — so a full-viewport screenshot
    // captures the card at 1:1 (minus tiny letterboxing). Use clip to guarantee dims.
    await page.screenshot({
      path: outPath,
      type: "png",
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });

    const size = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`  ✓ ${cityId.padEnd(16)} → ${outPath}  (${size} KB)`);
    return true;
  } finally {
    await browser.close();
  }
}

async function getAllCityIds(): Promise<string[]> {
  const { getCitiesWithOverrides } = await import("../src/data/seed");
  const cities = await getCitiesWithOverrides();
  return cities
    .filter((c: { country: string }) => c.country === "US")
    .map((c: { id: string }) => c.id);
}

async function main() {
  const args = process.argv.slice(2);
  const outDir = path.resolve("public/snapshots/output");
  fs.mkdirSync(outDir, { recursive: true });

  let cityIds: string[];
  if (args.includes("--all")) {
    cityIds = await getAllCityIds();
    console.log(`Rendering all ${cityIds.length} US markets…\n`);
  } else if (args.length === 0) {
    console.error("Usage: render-snapshot.ts <cityId> [<cityId>...] | --all");
    process.exit(1);
  } else {
    cityIds = args;
    console.log(`Rendering ${cityIds.length} snapshot(s)…\n`);
  }

  const results = [];
  for (const id of cityIds) {
    const ok = await renderCity(id, outDir);
    results.push({ id, ok });
  }

  const success = results.filter((r) => r.ok).length;
  console.log(
    `\n✓ ${success}/${results.length} rendered · output dir: ${outDir}`,
  );
  if (success < results.length) {
    console.log("\nFailed:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.id}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("✗ Render failed:", err);
  process.exit(1);
});
