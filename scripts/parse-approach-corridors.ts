/**
 * Parse approach corridor directions from FAA NASR APT_RMK.csv
 *
 * Extracts INGRESS/EGRESS and APCH/DEP directions from heliport remarks.
 * Outputs JSON to data/approach-corridors.json
 *
 * Usage: npx tsx scripts/parse-approach-corridors.ts [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const RMK_FILE = path.join(process.cwd(), "data", "nasr", "APT_RMK.csv");
const OUT_FILE = path.join(process.cwd(), "data", "approach-corridors.json");

interface ApproachCorridor {
  facilityId: string;
  facilityName?: string;
  state: string;
  rawText: string;
  corridors: Array<{
    type: "ingress_egress" | "apch_dep" | "general";
    fromDeg: number;
    toDeg: number;
    label: string;
  }>;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function main() {
  if (!existsSync(RMK_FILE)) {
    console.error("APT_RMK.csv not found at", RMK_FILE);
    process.exit(1);
  }

  const content = readFileSync(RMK_FILE, "utf-8");
  const lines = content.split("\n");
  const header = parseCSVLine(lines[0]);
  const col = (name: string) => header.indexOf(name);

  const iSiteType = col("SITE_TYPE_CODE");
  const iArptId = col("ARPT_ID");
  const iState = col("STATE_CODE");
  const iRemark = col("REMARK");

  const results: ApproachCorridor[] = [];
  let scanned = 0;
  let matched = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (fields[iSiteType] !== "H") continue;
    scanned++;

    const remark = fields[iRemark] || "";
    const upper = remark.toUpperCase();

    // Pattern 1: INGRESS/EGRESS 360/180 or INGRESS/EGRESS 081/261-236/056
    const ieMatch = upper.match(/INGRESS\/EGRESS\s+([\d\/\-]+)/);
    // Pattern 2: APCH/DEP OPNS COND 330 CLOCKWISE TO 110
    const adMatch = upper.match(/APCH\/DEP\s+OPNS\s+COND\s+(\d+)\s+(?:CLOCKWISE|CW)\s+TO\s+(\d+)/);
    // Pattern 3: ALL APCH/DEP ON HDG 090
    const hdgMatch = upper.match(/APCH\/DEP\s+.*?HDG\s+(\d+)/);
    // Pattern 4: TKOF/LDG directions
    const tkofMatch = upper.match(/(?:TKOF|TAKEOFF).*?(\d{3})\s.*?(?:LDG|LANDING).*?(\d{3})/);

    if (!ieMatch && !adMatch && !hdgMatch && !tkofMatch) continue;

    const entry: ApproachCorridor = {
      facilityId: fields[iArptId],
      state: fields[iState],
      rawText: remark,
      corridors: [],
    };

    if (adMatch) {
      const from = parseInt(adMatch[1]);
      const to = parseInt(adMatch[2]);
      entry.corridors.push({
        type: "apch_dep",
        fromDeg: from,
        toDeg: to,
        label: `${from}° CW to ${to}°`,
      });
    }

    if (ieMatch) {
      const raw = ieMatch[1];
      // Handle formats: 360/180, 081/261-236/056, 360
      const pairs = raw.split("-");
      for (const pair of pairs) {
        const parts = pair.split("/").map(p => parseInt(p.trim())).filter(n => !isNaN(n));
        if (parts.length === 2) {
          entry.corridors.push({
            type: "ingress_egress",
            fromDeg: parts[0],
            toDeg: parts[1],
            label: `Ingress ${parts[0]}° / Egress ${parts[1]}°`,
          });
        } else if (parts.length === 1) {
          entry.corridors.push({
            type: "ingress_egress",
            fromDeg: parts[0],
            toDeg: (parts[0] + 180) % 360,
            label: `Heading ${parts[0]}°`,
          });
        }
      }
    }

    if (hdgMatch && entry.corridors.length === 0) {
      const hdg = parseInt(hdgMatch[1]);
      entry.corridors.push({
        type: "general",
        fromDeg: hdg,
        toDeg: (hdg + 180) % 360,
        label: `Recommended heading ${hdg}°`,
      });
    }

    if (tkofMatch && entry.corridors.length === 0) {
      entry.corridors.push({
        type: "general",
        fromDeg: parseInt(tkofMatch[1]),
        toDeg: parseInt(tkofMatch[2]),
        label: `Takeoff ${tkofMatch[1]}° / Landing ${tkofMatch[2]}°`,
      });
    }

    if (entry.corridors.length > 0) {
      results.push(entry);
      matched++;
    }
  }

  console.log(`Scanned ${scanned} heliport remarks`);
  console.log(`Found ${matched} facilities with approach corridor data`);
  console.log(`Total corridor entries: ${results.reduce((s, r) => s + r.corridors.length, 0)}`);

  // State breakdown
  const byState: Record<string, number> = {};
  for (const r of results) byState[r.state] = (byState[r.state] ?? 0) + 1;
  const sorted = Object.entries(byState).sort((a, b) => b[1] - a[1]);
  console.log("\nTop states:");
  sorted.slice(0, 10).forEach(([st, ct]) => console.log(`  ${st}: ${ct}`));

  // Sample
  console.log("\nSample entries:");
  results.slice(0, 5).forEach(r => {
    console.log(`  ${r.facilityId} (${r.state}): ${r.corridors.map(c => c.label).join(" | ")}`);
  });

  if (!DRY_RUN) {
    writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\nWritten to ${OUT_FILE}`);
  } else {
    console.log("\n(Dry run — no file written)");
  }
}

main();
