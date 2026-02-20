import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** DELETE /api/sources/:id — Delete a scraper source */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.scraperSource.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
}

/** PATCH /api/sources/:id — Toggle enabled or update fields */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  try {
    const source = await prisma.scraperSource.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(source);
  } catch {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
}
