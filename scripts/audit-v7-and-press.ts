/**
 * Two-part audit (Apr 28 deferred → Apr 29):
 *
 *   1. Classifier v7 named-operator guard — verify no
 *      activeOperatorPresence=true overrides were emitted by classifier v7
 *      from records that don't actually name a tracked eVTOL operator.
 *
 *   2. operator_press source — verify Joby's NY/JFK announcement was
 *      ingested directly (the trigger that motivated commit 18a1ff0).
 *
 * Usage: npx tsx scripts/audit-v7-and-press.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Exact deploy moment of c0e47ef ("Classifier v7 — named-operator guard")
// — author timestamp 2026-04-27T08:46:21-04:00 = 12:46:21 UTC.
const V7_DEPLOY = new Date("2026-04-27T12:46:21Z");

const NAMED_OPERATORS = [
  "joby",
  "archer",
  "beta",
  "volocopter",
  "eve",
  "lilium",
  "wisk",
  "vertical aerospace",
  "blade",
  "skydrive",
  "ehang",
  "overair",
  "supernal",
];

function namesAnOperator(text: string): string | null {
  const lower = text.toLowerCase();
  for (const op of NAMED_OPERATORS) {
    if (lower.includes(op)) return op;
  }
  return null;
}

async function auditV7Guard() {
  console.log("=".repeat(72));
  console.log("PART 1 — Classifier v7 named-operator guard audit");
  console.log("=".repeat(72));
  console.log(`Window: overrides created >= ${V7_DEPLOY.toISOString()}`);
  console.log();

  const overrides = await prisma.scoringOverride.findMany({
    where: {
      field: "activeOperatorPresence",
      origin: "classifier",
      createdAt: { gte: V7_DEPLOY },
    },
    orderBy: { createdAt: "asc" },
  });

  const trueOverrides = overrides.filter((o) => o.value === true);

  console.log(
    `activeOperatorPresence overrides since v7 deploy: ${overrides.length} ` +
      `(${trueOverrides.length} with value=true)`,
  );
  console.log();

  if (trueOverrides.length === 0) {
    return { total: overrides.length, trueCount: 0, failures: [] };
  }

  type Failure = {
    cityId: string;
    confidence: string;
    title: string;
    classifierInput: string;
    classifierReason: string;
    url: string;
    overrideId: string;
  };

  const failures: Failure[] = [];
  let v7Confirmed = 0;
  let pre = 0;

  for (const o of trueOverrides) {
    const record = o.sourceRecordId
      ? await prisma.ingestedRecord.findUnique({
          where: { id: o.sourceRecordId },
          select: { title: true, summary: true, url: true, source: true, raw: true },
        })
      : null;

    const classification = o.sourceRecordId
      ? await prisma.classificationResult.findFirst({
          where: { recordId: o.sourceRecordId },
          orderBy: { createdAt: "desc" },
          select: { promptVersion: true, factorsJson: true, rawResponse: true },
        })
      : null;

    if (classification?.promptVersion === "v7") v7Confirmed++;
    else pre++;

    // The classifier sees ONLY title + summary (see classifier.ts:210-211).
    const classifierInput = `${record?.title ?? ""} ${record?.summary ?? ""}`;
    const named = namesAnOperator(classifierInput);

    if (!named) {
      // Pull the classifier's own one-line reason for the activeOperatorPresence
      // factor from rawResponse to see how it justified it.
      let reason = "(no rationale)";
      try {
        const raw = classification?.rawResponse as
          | { content?: Array<{ text?: string }> }
          | null;
        const text = raw?.content?.[0]?.text ?? "";
        const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
        if (summaryMatch) reason = summaryMatch[1];
      } catch {
        /* ignore */
      }

      failures.push({
        cityId: o.cityId,
        confidence: o.confidence,
        title: record?.title ?? "(no record)",
        classifierInput: classifierInput.slice(0, 220),
        classifierReason: reason,
        url: record?.url ?? "",
        overrideId: o.id,
      });
    }
  }

  console.log(
    `v7=${v7Confirmed}, pre-v7=${pre} | ` +
      `flagged (no named operator in classifier input): ${failures.length}`,
  );
  console.log();

  if (failures.length > 0) {
    console.log("--- GUARD FAILURES (classifier had no operator name in input) ---");
    for (const f of failures) {
      console.log();
      console.log(`override: ${f.overrideId}`);
      console.log(`city    : ${f.cityId}  conf=${f.confidence}`);
      console.log(`title   : ${f.title}`);
      console.log(`input   : ${f.classifierInput}`);
      console.log(`reason  : ${f.classifierReason}`);
      console.log(`url     : ${f.url}`);
    }
  }

  return {
    total: overrides.length,
    trueCount: trueOverrides.length,
    failures,
  };
}

async function auditOperatorPress() {
  console.log("=".repeat(72));
  console.log("PART 2 — operator_press Joby NY/JFK ingestion check");
  console.log("=".repeat(72));

  const all = await prisma.ingestedRecord.findMany({
    where: { source: "operator_press" },
    orderBy: { ingestedAt: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      url: true,
      date: true,
      ingestedAt: true,
    },
  });

  console.log(`Total operator_press records in DB: ${all.length}`);
  console.log();

  if (all.length === 0) {
    console.log("No operator_press records — source may not be persisting.");
    return { total: 0, jfkMatches: 0 };
  }

  console.log("Most recent 10:");
  for (const r of all.slice(0, 10)) {
    console.log(`  ${r.date}  ${r.title.slice(0, 100)}`);
    console.log(`     ${r.url}`);
  }
  console.log();

  const needles = ["jfk", "new york", "kennedy", " ny "];
  const matches = all.filter((r) => {
    const hay = `${r.title} ${r.summary} ${r.url}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });

  console.log(`Records mentioning JFK / New York / Kennedy / NY: ${matches.length}`);
  for (const m of matches) {
    console.log();
    console.log(`  date     : ${m.date}`);
    console.log(`  title    : ${m.title}`);
    console.log(`  url      : ${m.url}`);
    console.log(`  ingested : ${m.ingestedAt.toISOString()}`);
  }

  return { total: all.length, jfkMatches: matches.length };
}

async function main() {
  const dbHost = process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? "(unknown)";
  console.log(`DB host: ${dbHost}`);
  console.log();

  const v7 = await auditV7Guard();
  const press = await auditOperatorPress();

  console.log("=".repeat(72));
  console.log("VERDICT");
  console.log("=".repeat(72));
  console.log(
    `v7 guard: ${v7.failures.length === 0 ? "PASS" : "FAIL"} ` +
      `(${v7.failures.length} failures / ${v7.trueCount} true overrides since deploy)`,
  );
  console.log(
    `operator_press JFK: ${press.jfkMatches > 0 ? "PASS" : "MISSING"} ` +
      `(${press.jfkMatches} matches in ${press.total} records)`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
