import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const validRatings = ["pass", "maybe", "interested", "strong_interest"];
  if (!body.rating || !validRatings.includes(body.rating)) {
    return NextResponse.json(
      { error: "Invalid rating. Must be: pass, maybe, interested, or strong_interest" },
      { status: 400 }
    );
  }

  // Verify deal exists
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Create feedback
  const feedback = await prisma.feedback.create({
    data: {
      dealId: id,
      rating: body.rating,
      notes: body.notes || "",
    },
  });

  // Update deal status to reviewed
  await prisma.deal.update({
    where: { id },
    data: { status: "reviewed" },
  });

  return NextResponse.json(feedback, { status: 201 });
}
