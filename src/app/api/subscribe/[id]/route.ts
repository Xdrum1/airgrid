import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/subscriptions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Missing email query parameter" },
        { status: 400 }
      );
    }

    const removed = await removeSubscription(id, email);

    if (!removed) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /subscribe/[id] DELETE] Error:", err);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
