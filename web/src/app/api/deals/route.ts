import { NextResponse } from "next/server";
import { getDb, initSchema, DealRating } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    const sql = getDb();
    await initSchema();

    const rows = await sql`
      SELECT
        id, title, url, location, asking_price, revenue, ebitda,
        cash_flow_sde, year_established, employees, description,
        source, industry, date_found, traits, avoid_traits,
        score, multiple, broker, listing_id, category, created_at
      FROM deals
      ORDER BY score DESC
      LIMIT 200
    `;

    // If logged in, also fetch this user's ratings
    let ratings: Record<number, { interest: string; reason: string }> = {};
    if (session) {
      const ratingRows = (await sql`
        SELECT deal_id, interest, reason FROM deal_ratings WHERE user_id = ${session.userId}
      `) as DealRating[];
      for (const r of ratingRows) {
        ratings[r.deal_id] = { interest: r.interest, reason: r.reason };
      }
    }

    return NextResponse.json({ deals: rows, ratings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/deals error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
