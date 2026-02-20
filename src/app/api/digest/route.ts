import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWeeklyDigestHtml, generateIntroEmailHtml, sendEmail } from "@/lib/email";

/**
 * POST /api/digest
 * Manually trigger a digest email or send the intro email.
 * Body: { type: "weekly" | "intro", api_secret?: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const secret = process.env.SCRAPE_API_SECRET;
  if (secret && body.api_secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailTo = process.env.EMAIL_TO || "christianellisbateman@gmail.com";

  if (body.type === "intro") {
    const html = generateIntroEmailHtml();
    const result = await sendEmail(emailTo, "Welcome to Deal Hunter", html);
    return NextResponse.json(result);
  }

  // Weekly digest
  const deals = await prisma.deal.findMany({
    orderBy: { score: "desc" },
    take: 25,
  });

  if (deals.length === 0) {
    return NextResponse.json({ success: false, error: "No deals to send" });
  }

  const weekDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = generateWeeklyDigestHtml(deals, weekDate);
  const result = await sendEmail(
    emailTo,
    `Deal Hunter — Weekly Digest (${weekDate})`,
    html
  );

  if (result.success) {
    await prisma.weeklyDigest.create({
      data: {
        weekDate: new Date(),
        dealCount: deals.length,
        avgScore: deals.reduce((s, d) => s + d.score, 0) / deals.length,
        topScore: deals[0]?.score || 0,
        sentAt: new Date(),
        emailHtml: html,
      },
    });
  }

  return NextResponse.json(result);
}
