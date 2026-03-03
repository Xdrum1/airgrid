import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { revokeApiKey } from "@/lib/api/keys";

export const dynamic = "force-dynamic";

/** Revoke an API key */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { keyId } = await params;
  const revoked = await revokeApiKey(keyId, session.user.id);

  if (!revoked) {
    return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
  }

  return NextResponse.json({ data: { id: revoked.id, revokedAt: revoked.revokedAt } });
}
