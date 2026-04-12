/**
 * Platform Forecast Digest
 *
 * Print the platform's forward-looking signals across all 25 markets,
 * ranked by predictive significance. Use as input when writing Pulse,
 * One Market Monday, or any forward-looking content.
 *
 * Usage:
 *   npx tsx scripts/forecast-digest.ts          # ranked digest
 *   npx tsx scripts/forecast-digest.ts --top 5  # top 5 only
 *   npx tsx scripts/forecast-digest.ts --markdown  # markdown output for paste
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getPlatformForecastDigest, renderSignalNarrative } from "../src/lib/forward-signals";

async function main() {
  const args = process.argv.slice(2);
  const topIdx = args.indexOf("--top");
  const top = topIdx >= 0 ? parseInt(args[topIdx + 1]) : undefined;
  const markdown = args.includes("--markdown");

  const digest = await getPlatformForecastDigest();
  const list = top ? digest.slice(0, top) : digest;

  if (markdown) {
    console.log(`# Platform Forecast Digest`);
    console.log(`*Generated ${new Date().toISOString().slice(0, 10)} · AirIndex Forward Signals*\n`);
    console.log(`Markets ranked by predictive significance (forward signals + watch trajectory + velocity).\n`);

    for (const m of list) {
      console.log(`## ${m.cityName}, ${m.state} (Score: ${m.currentScore})`);
      const watchStr = m.marketWatch
        ? ` · MarketWatch: **${m.marketWatch.status.replace("_", " ")} / ${m.marketWatch.outlook}**`
        : "";
      const velocityStr = m.accelerating ? " · accelerating" : "";
      const forecastStr = m.expectedScoreChange30d
        ? ` · 30d forecast: **${m.expectedScoreChange30d > 0 ? "+" : ""}${m.expectedScoreChange30d}**`
        : "";
      console.log(`*${m.signalsLast30d} signals last 30d (rank #${m.rankNational ?? "—"})${watchStr}${velocityStr}${forecastStr}*\n`);
      if (m.topSignals.length > 0) {
        console.log("Top signals:");
        for (const s of m.topSignals) {
          console.log(`- ${renderSignalNarrative(s)}`);
        }
        console.log("");
      }
    }
    return;
  }

  // Plain text output
  console.log(`\n=== PLATFORM FORECAST DIGEST ===`);
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Markets: ${digest.length}\n`);

  for (const m of list) {
    const watchStr = m.marketWatch
      ? `${m.marketWatch.status}/${m.marketWatch.outlook}`
      : "no watch";
    const accelStr = m.accelerating ? " ⚡" : "";
    const forecastStr = m.expectedScoreChange30d
      ? ` | 30d: ${m.expectedScoreChange30d > 0 ? "+" : ""}${m.expectedScoreChange30d}`
      : "";

    console.log(
      `${String(m.significance).padStart(3)} | ${m.cityName.padEnd(20)} ${String(m.currentScore).padStart(3)}/100 | ` +
      `${m.signalsLast30d}@30d (#${m.rankNational ?? "—"})${accelStr} | ${watchStr}${forecastStr} | ` +
      `near:${m.nearTermSignalCount}, high-conf:${m.highConfidenceSignalCount}`,
    );

    if (m.topSignals.length > 0) {
      for (const s of m.topSignals) {
        console.log(`     • ${renderSignalNarrative(s).slice(0, 130)}`);
      }
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
