import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserTier } from "@/lib/billing";
import { hasProAccess } from "@/lib/billing-shared";
import { createApiKey, listApiKeys } from "@/lib/api/keys";

export const dynamic = "force-dynamic";

/** List active API keys for the current user */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const keys = await listApiKeys(session.user.id);
  return NextResponse.json({ data: keys });
}

/** Create a new API key */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!hasProAccess(tier)) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  let name = "Default";
  try {
    const body = await req.json();
    if (body.name && typeof body.name === "string") {
      name = body.name.slice(0, 50);
    }
  } catch {
    // use default name
  }

  const { rawKey, record } = await createApiKey(session.user.id, name, tier);

  return NextResponse.json({
    data: {
      id: record.id,
      name: record.name,
      key: rawKey,
      keyPrefix: record.keyPrefix,
      tier: record.tier,
      createdAt: record.createdAt,
    },
    warning: "Store this key securely — it will not be shown again.",
  }, { status: 201 });
}
