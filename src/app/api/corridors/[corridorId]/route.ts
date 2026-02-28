import { NextResponse } from "next/server";
import { getCorridorById, getCorridorStatusHistory } from "@/lib/corridors";

interface Props {
  params: Promise<{ corridorId: string }>;
}

export async function GET(_request: Request, { params }: Props) {
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
