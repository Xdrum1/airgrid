/**
 * Check FAA OE/AAA system status
 *
 * Pings the heliport case list endpoint to determine if the
 * system is online and returning data.
 *
 * Usage:
 *   npx tsx scripts/check-oeaaa-status.ts
 */

async function main() {
  const url = "https://oeaaa.faa.gov/oeaaa/services/caseList/heliport/2024";
  console.log(`Checking OE/AAA status: ${url}\n`);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await response.text();
    const isOnline = !text.includes("Maintenance Notification") && !text.includes("Service Unavailable") && response.ok;

    if (isOnline) {
      console.log("✓ OE/AAA is ONLINE — API returning data.");
      console.log(`  Response: ${response.status} ${response.statusText}`);
      console.log(`  Content length: ${text.length} bytes`);
      console.log(`  First 200 chars: ${text.slice(0, 200)}`);
      console.log("\n  Ready to run full heliport airspace determination pull.");
    } else {
      console.log("✗ OE/AAA is DOWN — maintenance notification detected.");
      console.log(`  Response: ${response.status} ${response.statusText}`);
      console.log("  Fallback: use bulk CSV download from Download Case Info tab.");
      console.log("  Check manually: https://oeaaa.faa.gov/oeaaa/services/caseList/heliport/2024");
    }
  } catch (err) {
    console.log("✗ OE/AAA is UNREACHABLE — connection failed.");
    console.log(`  Error: ${err instanceof Error ? err.message : err}`);
    console.log("  The system may be completely offline. Try again later.");
  }
}

main();
