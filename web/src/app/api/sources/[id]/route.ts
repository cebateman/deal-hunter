import { NextRequest, NextResponse } from "next/server";
import { getDb, Source } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const existing = db.prepare("SELECT * FROM sources WHERE id = ?").get(id) as Source | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const fields = {
    name: body.name ?? existing.name,
    url: body.url ?? existing.url,
    type: body.type ?? existing.type,
    priority: body.priority ?? existing.priority,
    region: body.region ?? existing.region,
    notes: body.notes ?? existing.notes,
    requires_js: body.requires_js !== undefined ? (body.requires_js ? 1 : 0) : existing.requires_js,
    requires_login: body.requires_login !== undefined ? (body.requires_login ? 1 : 0) : existing.requires_login,
    enabled: body.enabled !== undefined ? (body.enabled ? 1 : 0) : existing.enabled,
  };

  db.prepare(
    `UPDATE sources SET
       name = ?, url = ?, type = ?, priority = ?, region = ?, notes = ?,
       requires_js = ?, requires_login = ?, enabled = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    fields.name, fields.url, fields.type, fields.priority, fields.region, fields.notes,
    fields.requires_js, fields.requires_login, fields.enabled, id
  );

  const updated = db.prepare("SELECT * FROM sources WHERE id = ?").get(id) as Source;
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare("SELECT * FROM sources WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM sources WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
