import { NextRequest, NextResponse } from "next/server";
import { getDb, Source } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();
  const numId = Number(id);

  const existing = (await sql`
    SELECT * FROM sources WHERE id = ${numId} AND user_id = ${session.userId}
  `) as Source[];
  if (existing.length === 0) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  const src = existing[0];

  const fields = {
    name: body.name ?? src.name,
    url: body.url ?? src.url,
    type: body.type ?? src.type,
    priority: body.priority ?? src.priority,
    region: body.region ?? src.region,
    notes: body.notes ?? src.notes,
    requires_js: body.requires_js !== undefined ? !!body.requires_js : src.requires_js,
    requires_login: body.requires_login !== undefined ? !!body.requires_login : src.requires_login,
    enabled: body.enabled !== undefined ? !!body.enabled : src.enabled,
  };

  const updated = await sql`
    UPDATE sources SET
      name = ${fields.name}, url = ${fields.url}, type = ${fields.type},
      priority = ${fields.priority}, region = ${fields.region}, notes = ${fields.notes},
      requires_js = ${fields.requires_js}, requires_login = ${fields.requires_login},
      enabled = ${fields.enabled}, updated_at = now()
    WHERE id = ${numId} AND user_id = ${session.userId}
    RETURNING *
  `;

  return NextResponse.json(updated[0] as Source);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sql = getDb();
  const numId = Number(id);

  const existing = await sql`
    SELECT id FROM sources WHERE id = ${numId} AND user_id = ${session.userId}
  `;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  await sql`DELETE FROM sources WHERE id = ${numId} AND user_id = ${session.userId}`;
  return NextResponse.json({ ok: true });
}
