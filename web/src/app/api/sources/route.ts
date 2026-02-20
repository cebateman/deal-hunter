import { NextRequest, NextResponse } from "next/server";
import { getDb, Source } from "@/lib/db";
import { seedSources } from "@/lib/seed";

export function GET() {
  const db = getDb();
  seedSources();
  const sources = db.prepare("SELECT * FROM sources ORDER BY priority, name").all() as Source[];
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, type, priority, region, notes, requires_js, requires_login } = body;

  if (!name || !url || !type) {
    return NextResponse.json({ error: "name, url, and type are required" }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO sources (name, url, type, priority, region, notes, requires_js, requires_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      url,
      type,
      priority || "P1",
      region || "",
      notes || "",
      requires_js ? 1 : 0,
      requires_login ? 1 : 0
    );

  const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(result.lastInsertRowid) as Source;
  return NextResponse.json(source, { status: 201 });
}
