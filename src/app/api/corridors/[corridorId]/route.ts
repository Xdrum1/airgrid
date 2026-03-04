import { NextRequest, NextResponse } from "next/server";
import { getCorridorById, getCorridorStatusHistory } from "@/lib/corridors";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-helpers";

interface Props {
  params: Promise<{ corridorId: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`corridor-detail:${ip}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { corridorId } = await params;
    const corridor = await getCorridorById(corridorId);

    if (!corridor) {
      return NextResponse.json(
        { error: "Corridor not found" },
        { status: 404 }
      );
    }

    const statusHistory = await getCorridorStatusHistory(corridorId);

    return NextResponse.json({
      data: { ...corridor, statusHistory },
    });
  } catch (err) {
    console.error("[API /corridors/:id] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch corridor" },
      { status: 500 }
    );
  }
}
