import { NextRequest, NextResponse } from "next/server";
import { getDb, initSchema, DealRating, Criteria } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_INTERESTS = ["very_interested", "interested", "not_interesting", "pass"] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { deal_id, interest, reason } = body;

    if (!deal_id || !interest) {
      return NextResponse.json(
        { error: "deal_id and interest are required" },
        { status: 400 }
      );
    }

    if (!VALID_INTERESTS.includes(interest)) {
      return NextResponse.json(
        { error: `interest must be one of: ${VALID_INTERESTS.join(", ")}` },
        { status: 400 }
      );
    }

    const sql = getDb();
    await initSchema();

    // Upsert rating
    const rows = (await sql`
      INSERT INTO deal_ratings (user_id, deal_id, interest, reason)
      VALUES (${session.userId}, ${Number(deal_id)}, ${interest}, ${reason || ""})
      ON CONFLICT (user_id, deal_id) DO UPDATE SET
        interest = ${interest},
        reason = ${reason || ""},
        updated_at = now()
      RETURNING *
    `) as DealRating[];

    // If user gave a reason and it's a negative rating, offer to update criteria
    // We append the feedback to the criteria's avoid_traits or preferred_traits
    if (reason && reason.trim()) {
      await appendFeedbackToCriteria(sql, session.userId, interest, reason.trim(), Number(deal_id));
    }

    return NextResponse.json(rows[0]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/deals/rate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Automatically update criteria based on deal feedback.
 * - "pass" or "not_interesting" with reason: adds the reason as a search note
 *   and if the deal has avoid_traits, ensures they're in the user's criteria avoid list.
 * - "very_interested" with reason: if the deal has preferred traits, ensures they're in criteria.
 */
async function appendFeedbackToCriteria(
  sql: ReturnType<typeof getDb>,
  userId: number,
  interest: string,
  reason: string,
  dealId: number
) {
  // Get the deal's traits to inform criteria updates
  const deals = await sql`SELECT traits, avoid_traits, industry FROM deals WHERE id = ${dealId}`;
  const deal = deals[0] as { traits: string[]; avoid_traits: string[]; industry: string } | undefined;

  // Get user's current criteria
  const criteriaRows = (await sql`
    SELECT * FROM criteria WHERE user_id = ${userId} ORDER BY id LIMIT 1
  `) as Criteria[];

  if (criteriaRows.length === 0) return;
  const criteria = criteriaRows[0];

  if (interest === "pass" || interest === "not_interesting") {
    // If the deal has avoid_traits, make sure they're in the user's avoid list
    if (deal?.avoid_traits?.length) {
      const newAvoid = [...new Set([...criteria.avoid_traits, ...deal.avoid_traits])];
      if (newAvoid.length > criteria.avoid_traits.length) {
        await sql`
          UPDATE criteria SET avoid_traits = ${newAvoid}, updated_at = now()
          WHERE id = ${criteria.id} AND user_id = ${userId}
        `;
      }
    }
  } else if (interest === "very_interested") {
    // If the deal has good traits, make sure they're in preferred list
    if (deal?.traits?.length) {
      const newPreferred = [...new Set([...criteria.preferred_traits, ...deal.traits])];
      if (newPreferred.length > criteria.preferred_traits.length) {
        await sql`
          UPDATE criteria SET preferred_traits = ${newPreferred}, updated_at = now()
          WHERE id = ${criteria.id} AND user_id = ${userId}
        `;
      }
    }
    // If the deal's industry isn't in target list, add it
    if (deal?.industry && !criteria.target_industries.includes(deal.industry)) {
      const newIndustries = [...criteria.target_industries, deal.industry];
      await sql`
        UPDATE criteria SET target_industries = ${newIndustries}, updated_at = now()
        WHERE id = ${criteria.id} AND user_id = ${userId}
      `;
    }
  }
}
