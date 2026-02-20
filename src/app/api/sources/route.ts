import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/sources — List all scraper sources */
export async function GET() {
  const sources = await prisma.scraperSource.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(sources);
}

/** POST /api/sources — Create a new scraper source */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const { name, url, sourceType, priority, region, requiresJs, requiresLogin, notes } = body;

  if (!name || !url) {
    return NextResponse.json({ error: "name and url are required" }, { status: 400 });
  }

  const source = await prisma.scraperSource.create({
    data: {
      name,
      url,
      sourceType: sourceType || "broker",
      priority: priority || "P1",
      region: region || "",
      requiresJs: requiresJs || false,
      requiresLogin: requiresLogin || false,
      notes: notes || "",
      enabled: true,
    },
  });

  return NextResponse.json(source, { status: 201 });
}
