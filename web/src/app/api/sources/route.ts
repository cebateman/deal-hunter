import { NextRequest, NextResponse } from "next/server";
import { getDb, Source } from "@/lib/db";
import { seedSources } from "@/lib/seed";

export async function GET() {
  await seedSources();
  const sql = getDb();
  const sources = await sql`SELECT * FROM sources ORDER BY priority, name` as Source[];
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, type, priority, region, notes, requires_js, requires_login } = body;

  if (!name || !url || !type) {
    return NextResponse.json({ error: "name, url, and type are required" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    INSERT INTO sources (name, url, type, priority, region, notes, requires_js, requires_login)
    VALUES (${name}, ${url}, ${type}, ${priority || "P1"}, ${region || ""}, ${notes || ""}, ${!!requires_js}, ${!!requires_login})
    RETURNING *
  `;

  return NextResponse.json(rows[0] as Source, { status: 201 });
}
