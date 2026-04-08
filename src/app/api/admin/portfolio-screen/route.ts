import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // Admin auth required
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { input, mode } = body as { input: string; mode: "id" | "state" | "name" };

  if (!input?.trim()) {
    return NextResponse.json({ error: "No input provided" }, { status: 400 });
  }

  // Parse input into search terms
  const terms = mode === "state"
    ? [input.trim().toUpperCase()]
    : input.split(/[\n,;]+/).map((s: string) => s.trim()).filter(Boolean);

  if (terms.length === 0) {
    return NextResponse.json({ error: "No valid terms found" }, { status: 400 });
  }

  // Build the compliance query based on mode
  let compliance;
  if (mode === "state") {
    compliance = await prisma.heliportCompliance.findMany({
      where: { state: terms[0] },
      orderBy: { facilityName: "asc" },
    });
  } else if (mode === "id") {
    compliance = await prisma.heliportCompliance.findMany({
      where: { facilityId: { in: terms.map((t) => t.toUpperCase()) } },
    });
  } else {
    // Name search — case-insensitive contains match
    compliance = await prisma.heliportCompliance.findMany({
      where: {
        OR: terms.map((t) => ({
          facilityName: { contains: t, mode: "insensitive" as const },
        })),
      },
    });
  }

  // Get determination counts for matched facilities
  const facilityIds = compliance.map((c) => c.facilityId);
  const detCounts = await prisma.oeaaaDetermination.groupBy({
    by: ["linkedHeliportId"],
    where: { linkedHeliportId: { in: facilityIds } },
    _count: { _all: true },
  });
  const detCountMap = new Map(
    detCounts.map((d) => [d.linkedHeliportId, d._count._all])
  );

  // Map results
  const matched = compliance.map((c) => ({
    facilityId: c.facilityId,
    facilityName: c.facilityName,
    city: c.city,
    state: c.state,
    lat: Number(c.lat),
    lng: Number(c.lng),
    siteType: c.siteType,
    ownershipType: c.ownershipType,
    complianceStatus: c.complianceStatus,
    complianceScore: c.complianceScore,
    flagCount: c.flagCount,
    q1: c.q1FaaRegistration,
    q2: c.q2AirspaceDetermination,
    q3: c.q3StateEnforcement,
    q4: c.q4Nfpa418,
    q5: c.q5EvtolViability,
    q1Note: c.q1Note,
    q2Note: c.q2Note,
    q3Note: c.q3Note,
    q4Note: c.q4Note,
    q5Note: c.q5Note,
    determinationCount: detCountMap.get(c.facilityId) ?? 0,
    marketId: c.marketId,
  }));

  // Find unmatched terms (for ID and name modes)
  const matchedIds = new Set(compliance.map((c) => c.facilityId.toUpperCase()));
  const matchedNames = new Set(compliance.map((c) => c.facilityName.toLowerCase()));
  const unmatched = mode === "state" ? [] : terms.filter((t) => {
    if (mode === "id") return !matchedIds.has(t.toUpperCase());
    return !matchedNames.has(t.toLowerCase()) &&
      !compliance.some((c) => c.facilityName.toLowerCase().includes(t.toLowerCase()));
  });

  // Summary
  const summary = {
    total: terms.length,
    matched: matched.length,
    unmatched: unmatched.length,
    compliant: matched.filter((r) => r.complianceStatus === "compliant").length,
    conditional: matched.filter((r) => r.complianceStatus === "conditional").length,
    objectionable: matched.filter((r) => r.complianceStatus === "objectionable").length,
    unknown: matched.filter((r) => r.complianceStatus === "unknown").length,
  };

  return NextResponse.json({ matched, unmatched, summary });
}
