import { NextRequest, NextResponse } from "next/server";
import {
  addSubscription,
  getSubscriptions,
  validateEmail,
  validateCityIds,
  validateChangeTypes,
} from "@/lib/subscriptions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, cityIds, changeTypes } = body;

    if (!email || typeof email !== "string" || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (!Array.isArray(cityIds) || !validateCityIds(cityIds)) {
      return NextResponse.json(
        { error: "Invalid cityIds" },
        { status: 400 }
      );
    }

    if (!Array.isArray(changeTypes) || !validateChangeTypes(changeTypes)) {
      return NextResponse.json(
        { error: "Invalid changeTypes" },
        { status: 400 }
      );
    }

    const sub = await addSubscription(email, cityIds, changeTypes);
    return NextResponse.json({ data: sub }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "DUPLICATE") {
      return NextResponse.json(
        { error: "Subscription already exists" },
        { status: 409 }
      );
    }
    console.error("[API /subscribe] Error:", err);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const subs = await getSubscriptions();
    return NextResponse.json({ data: subs, count: subs.length });
  } catch (err) {
    console.error("[API /subscribe GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions", data: [], count: 0 },
      { status: 500 }
    );
  }
}
