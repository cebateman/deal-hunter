import { NextRequest, NextResponse } from "next/server";
import { getDb, Source } from "@/lib/db";
import { seedSources } from "@/lib/seed";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await seedSources(session.userId);
  const sql = getDb();
  const sources = (await sql`
    SELECT * FROM sources WHERE user_id = ${session.userId} ORDER BY priority, name
  `) as Source[];
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, url, type, priority, region, notes, requires_js, requires_login } = body;

  if (!name || !url || !type) {
    return NextResponse.json({ error: "name, url, and type are required" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    INSERT INTO sources (user_id, name, url, type, priority, region, notes, requires_js, requires_login)
    VALUES (${session.userId}, ${name}, ${url}, ${type}, ${priority || "P1"}, ${region || ""}, ${notes || ""}, ${!!requires_js}, ${!!requires_login})
    RETURNING *
  `;

  return NextResponse.json(rows[0] as Source, { status: 201 });
}
