import { NextRequest, NextResponse } from "next/server";
import { getDb, initSchema } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate API secret
    const expected = process.env.SCRAPE_API_SECRET;
    if (expected && body.api_secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deals: Record<string, unknown>[] = body.deals;
    if (!Array.isArray(deals) || deals.length === 0) {
      return NextResponse.json({ error: "No deals provided" }, { status: 400 });
    }

    const sql = getDb();
    await initSchema();

    let inserted = 0;
    let skipped = 0;
    let filtered = 0;

    for (const d of deals) {
      try {
        // Filter out deals without revenue data — no revenue means not actionable.
        // Accept revenue directly, or common proxies the scraper may provide
        // (gross_sales, annual_sales, net_sales). All get mapped into the revenue column.
        const rev = d.revenue ?? d.gross_sales ?? d.annual_sales ?? d.net_sales ?? null;
        if (rev == null || Number(rev) <= 0) {
          filtered++;
          continue;
        }
        // Normalise: if the scraper sent a proxy field, store it as revenue
        if (d.revenue == null) d.revenue = rev;

        const traits = Array.isArray(d.traits) ? d.traits : [];
        const avoidTraits = Array.isArray(d.avoid_traits) ? d.avoid_traits : [];

        await sql`
          INSERT INTO deals (
            title, url, location, asking_price, revenue, ebitda,
            cash_flow_sde, year_established, employees, description,
            source, industry, date_found, traits, avoid_traits,
            score, multiple, broker, listing_id, category
          ) VALUES (
            ${String(d.title || "")},
            ${String(d.url || "")},
            ${String(d.location || "")},
            ${d.asking_price != null ? Number(d.asking_price) : null},
            ${d.revenue != null ? Number(d.revenue) : null},
            ${d.ebitda != null ? Number(d.ebitda) : null},
            ${d.cash_flow_sde != null ? Number(d.cash_flow_sde) : null},
            ${d.year_established != null ? Number(d.year_established) : null},
            ${d.employees != null ? Number(d.employees) : null},
            ${String(d.description || "")},
            ${String(d.source || "")},
            ${String(d.industry || "Unknown")},
            ${d.date_found ? String(d.date_found) : new Date().toISOString().slice(0, 10)},
            ${traits},
            ${avoidTraits},
            ${d.score != null ? Number(d.score) : 0},
            ${d.multiple != null ? Number(d.multiple) : null},
            ${String(d.broker || "")},
            ${String(d.listing_id || "")},
            ${String(d.category || "")}
          )
          ON CONFLICT (url) WHERE url != '' DO UPDATE SET
            score = EXCLUDED.score,
            asking_price = EXCLUDED.asking_price,
            revenue = EXCLUDED.revenue,
            ebitda = EXCLUDED.ebitda,
            cash_flow_sde = EXCLUDED.cash_flow_sde,
            multiple = EXCLUDED.multiple,
            traits = EXCLUDED.traits,
            avoid_traits = EXCLUDED.avoid_traits,
            industry = EXCLUDED.industry,
            description = EXCLUDED.description
        `;
        inserted++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Skipped deal "${d.title}": ${msg}`);
        skipped++;
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      filtered,
      total: deals.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/scrape error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
