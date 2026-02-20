import { NextRequest, NextResponse } from "next/server";
import { getDb, initSchema, Criteria } from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();
    await initSchema();

    const rows = (await sql`SELECT * FROM criteria ORDER BY id LIMIT 1`) as Criteria[];

    if (rows.length === 0) {
      // Insert default row and return it
      const inserted = (await sql`
        INSERT INTO criteria DEFAULT VALUES RETURNING *
      `) as Criteria[];
      return NextResponse.json(inserted[0]);
    }

    return NextResponse.json(rows[0]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/criteria error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const sql = getDb();
    await initSchema();

    // Ensure a row exists
    const existing = (await sql`SELECT id FROM criteria ORDER BY id LIMIT 1`) as { id: number }[];
    let id: number;

    if (existing.length === 0) {
      const inserted = (await sql`INSERT INTO criteria DEFAULT VALUES RETURNING id`) as { id: number }[];
      id = inserted[0].id;
    } else {
      id = existing[0].id;
    }

    const updated = (await sql`
      UPDATE criteria SET
        ev_min = ${Number(body.ev_min)},
        ev_max = ${Number(body.ev_max)},
        revenue_min = ${Number(body.revenue_min)},
        revenue_max = ${Number(body.revenue_max)},
        ebitda_min = ${Number(body.ebitda_min)},
        max_multiple = ${Number(body.max_multiple)},
        geography = ${String(body.geography)},
        preferred_traits = ${body.preferred_traits},
        avoid_traits = ${body.avoid_traits},
        target_industries = ${body.target_industries},
        search_keywords = ${body.search_keywords},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `) as Criteria[];

    return NextResponse.json(updated[0]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("PUT /api/criteria error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
