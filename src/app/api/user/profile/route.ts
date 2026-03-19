import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_LENGTHS: Record<string, number> = {
  firstName: 100,
  lastName: 100,
  organization: 200,
  jobTitle: 200,
  referralSource: 500,
};

const ALLOWED_FIELDS = Object.keys(MAX_LENGTHS);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      organization: true,
      jobTitle: true,
      referralSource: true,
    },
  });

  return NextResponse.json(user ?? {});
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate and build update data
  const data: Record<string, string> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      const val = body[key];
      if (typeof val !== "string") {
        return NextResponse.json({ error: `${key} must be a string` }, { status: 400 });
      }
      const trimmed = val.trim();
      if (trimmed.length > MAX_LENGTHS[key]) {
        return NextResponse.json(
          { error: `${key} must be ${MAX_LENGTHS[key]} characters or less` },
          { status: 400 }
        );
      }
      data[key] = trimmed;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
