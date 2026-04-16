/**
 * One-shot: inject the Factor Movements ledger into a specific Pulse HTML file.
 * Finds the "<!-- Editorial Body" marker and inserts the rendered ledger
 * immediately before it. Idempotent — removes any prior injection.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getFactorMovements, renderFactorMovementsHtml } from "@/lib/editorial/factor-movements";
import { prisma } from "@/lib/prisma";

async function main() {
  const issue = process.argv[2] ?? "6";
  const windowDays = parseInt(process.argv[3] ?? "7");
  const path = join(__dirname, `../public/docs/UAM_Market_Pulse_Issue${issue}.html`);

  let html = readFileSync(path, "utf-8");

  // Strip previous injection if present (marked by BEGIN/END comments)
  const beginMarker = "<!-- BEGIN_FACTOR_LEDGER -->";
  const endMarker = "<!-- END_FACTOR_LEDGER -->";
  const priorStart = html.indexOf(beginMarker);
  if (priorStart >= 0) {
    const priorEnd = html.indexOf(endMarker, priorStart);
    if (priorEnd >= 0) {
      html = html.slice(0, priorStart) + html.slice(priorEnd + endMarker.length);
    }
  }

  const movements = await getFactorMovements({ windowDays });
  const ledgerHtml = renderFactorMovementsHtml(movements, {
    windowLabel: `${windowDays}-day window`,
  });

  const injection = `\n${beginMarker}${ledgerHtml}${endMarker}\n`;

  // Insert immediately before the Editorial Body comment
  const target = "<!-- Editorial Body -->";
  const idx = html.indexOf(target);
  if (idx < 0) {
    throw new Error(`Could not find injection target '${target}' in ${path}`);
  }
  html = html.slice(0, idx) + injection + html.slice(idx);

  writeFileSync(path, html);
  console.log(`Injected ${movements.length} factor movement${movements.length === 1 ? "" : "s"} into ${path}`);

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
