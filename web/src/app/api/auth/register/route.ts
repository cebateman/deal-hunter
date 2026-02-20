import { NextRequest, NextResponse } from "next/server";
import { getDb, initSchema, User } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const sql = getDb();
    await initSchema();

    // Check if user already exists
    const existing = (await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`) as { id: number }[];
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const rows = (await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email.toLowerCase().trim()}, ${passwordHash}, ${name || ""})
      RETURNING *
    `) as User[];

    const user = rows[0];

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/auth/register error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
