import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { sendSesEmail } from "@/lib/ses";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await req.json();
  const { to, subject } = body as { to: string | string[]; subject?: string };

  if (!to) {
    return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });
  }

  // Read the HTML template
  const htmlPath = path.join(process.cwd(), "public/reports/platform-update-mar30.html");
  const html = await readFile(htmlPath, "utf-8");

  const recipients = Array.isArray(to) ? to : [to];
  const emailSubject = subject || "What's new on AirIndex — Week of March 30";
  const from = "AirIndex <hello@airindex.io>";

  const results: { email: string; status: string }[] = [];

  for (const email of recipients) {
    try {
      await sendSesEmail({ to: email, from, subject: emailSubject, html });
      results.push({ email, status: "sent" });
    } catch (err) {
      results.push({ email, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  return NextResponse.json({ success: true, results });
}
