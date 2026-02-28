import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  addSubscription,
  getSubscriptionsForUser,
  validateCityIds,
  validateCorridorIds,
  validateChangeTypes,
} from "@/lib/subscriptions";
import { sendSesEmail } from "@/lib/ses";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cityIds, changeTypes, corridorIds } = body;

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

    const corridorIdList = Array.isArray(corridorIds) ? corridorIds : [];
    if (corridorIdList.length > 0 && !(await validateCorridorIds(corridorIdList))) {
      return NextResponse.json(
        { error: "Invalid corridorIds" },
        { status: 400 }
      );
    }

    const sub = await addSubscription(session.user.id, cityIds, changeTypes, corridorIdList);

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail && process.env.SES_ACCESS_KEY_ID) {
      const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
      const cities = cityIds.length === 0 ? "All cities" : cityIds.join(", ");
      sendSesEmail({
        to: adminEmail,
        from,
        subject: `[AirIndex] New subscription: ${session.user.email}`,
        html: `
          <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
            <div style="margin-bottom:32px;">
              <span style="font-weight:800;font-size:20px;color:#1a1a1a;letter-spacing:-0.5px;">AIRINDEX</span>
              <span style="color:#999;font-size:11px;margin-left:8px;">ADMIN</span>
            </div>
            <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 8px;">New alert subscription:</p>
            <p style="color:#7c3aed;font-size:16px;font-weight:700;margin:0 0 12px;">${session.user.email}</p>
            <p style="color:#555;font-size:13px;margin:0 0 4px;">Markets: ${cities}</p>
            <p style="color:#555;font-size:13px;margin:0 0 8px;">Types: ${changeTypes.join(", ")}</p>
            <p style="color:#999;font-size:12px;margin:0;">${new Date().toUTCString()}</p>
          </div>
        `.trim(),
      }).catch((err) => console.error("[subscribe] Admin notify failed:", err));
    }

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required", data: [], count: 0 },
        { status: 401 }
      );
    }

    const subs = await getSubscriptionsForUser(session.user.id);
    return NextResponse.json({ data: subs, count: subs.length });
  } catch (err) {
    console.error("[API /subscribe GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions", data: [], count: 0 },
      { status: 500 }
    );
  }
}
