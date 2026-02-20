import { NextResponse } from "next/server";
import { getDb, initSchema } from "@/lib/db";

export async function GET() {
  try {
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

    return NextResponse.json({ deals: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/deals error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
