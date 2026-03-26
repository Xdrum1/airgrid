import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = status ? { status } : {};

  const inquiries = await prisma.contactInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Stats
  const counts = await prisma.contactInquiry.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const stats = {
    total: counts.reduce((sum, c) => sum + c._count.id, 0),
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    closed: 0,
  };
  for (const c of counts) {
    if (c.status in stats) {
      stats[c.status as keyof typeof stats] = c._count.id;
    }
  }

  return NextResponse.json({ data: inquiries, stats });
}

export async function PATCH(request: NextRequest) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { id, status, notes } = body as {
      id: string;
      status?: string;
      notes?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const validStatuses = ["new", "contacted", "qualified", "converted", "closed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const data: Record<string, string> = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.contactInquiry.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[admin/inquiries] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}
