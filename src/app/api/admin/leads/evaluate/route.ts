import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { evaluateAllPendingLeads, evaluateLead } from "@/lib/lead-evaluator";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/leads/evaluate
 *
 * Triggers AI evaluation of MarketLeads using Claude Haiku.
 * - No body: evaluates ALL pending leads (new + researching)
 * - { leadId: "..." }: evaluates a single lead
 *
 * Returns recommendation counts and updates each lead with
 * aiRecommendation, aiReasoning, aiConfidence, aiEvaluatedAt.
 */
export async function POST(request: NextRequest) {
  const rl = await rateLimit("admin-lead-eval", 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    let leadId: string | undefined;
    try {
      const body = await request.json();
      leadId = body?.leadId;
    } catch {
      // Empty body — evaluate all pending
    }

    if (leadId) {
      const evaluation = await evaluateLead(leadId);
      if (!evaluation) {
        return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
      }

      await prisma.marketLead.update({
        where: { id: leadId },
        data: {
          aiRecommendation: evaluation.recommendation,
          aiReasoning: evaluation.reasoning,
          aiConfidence: evaluation.confidence,
          aiEvaluatedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true, evaluation });
    }

    const result = await evaluateAllPendingLeads();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/leads/evaluate] Error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
