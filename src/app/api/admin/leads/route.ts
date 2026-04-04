import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";
import { recordLeadOutcome, getAiAccuracyStats } from "@/lib/lead-evaluator";

const VALID_STATUSES = ["new", "researching", "verified", "added", "dismissed"];
const VALID_PRIORITIES = ["low", "normal", "high"];

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const [leads, aiAccuracy] = await Promise.all([
      prisma.marketLead.findMany({
        where: status ? { status } : undefined,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      }),
      getAiAccuracyStats(30).catch(() => null),
    ]);
    return NextResponse.json({ data: leads, count: leads.length, aiAccuracy });
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { city, state, country, source, signal, priority } = body;

    if (!city?.trim() || !state?.trim() || !source?.trim() || !signal?.trim()) {
      return NextResponse.json({ error: "city, state, source, and signal are required" }, { status: 400 });
    }

    if (city.length > 100 || state.length > 10 || source.length > 200 || signal.length > 2000) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }

    const lead = await prisma.marketLead.create({
      data: {
        city: city.trim(),
        state: state.trim(),
        country: country?.trim() || "US",
        source: source.trim(),
        signal: signal.trim(),
        priority: VALID_PRIORITIES.includes(priority) ? priority : "normal",
      },
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { id, status, priority, researchNotes, factorSnapshot, addedAsCityId, dismissedReason } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Invalid priority: ${priority}` }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (researchNotes !== undefined) data.researchNotes = researchNotes;
    if (factorSnapshot !== undefined) data.factorSnapshot = factorSnapshot;
    if (addedAsCityId !== undefined) data.addedAsCityId = addedAsCityId;
    if (dismissedReason !== undefined) data.dismissedReason = dismissedReason;

    const lead = await prisma.marketLead.update({
      where: { id },
      data,
    });

    // Record AI outcome when a lead is resolved (added or dismissed)
    if (status === "dismissed" || status === "added") {
      await recordLeadOutcome(id, status).catch(() => {});
    }

    return NextResponse.json({ data: lead });
  } catch {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.marketLead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
