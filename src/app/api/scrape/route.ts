import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWeeklyDigestHtml, sendEmail } from "@/lib/email";

/**
 * POST /api/scrape
 * Receives scraped deals from the Python scraper (or GitHub Actions)
 * and optionally triggers the weekly email digest.
 *
 * Body: { deals: [...], send_digest?: boolean, api_secret: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verify API secret
  const secret = process.env.SCRAPE_API_SECRET;
  if (secret && body.api_secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deals = body.deals || [];

  // Forward each deal to the deals API for processing
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const results = [];

  for (const deal of deals) {
    try {
      const res = await fetch(`${appUrl}/api/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deal),
      });
      const result = await res.json();
      results.push(result);
    } catch (err) {
      results.push({ title: deal.title, error: String(err) });
    }
  }

  const inserted = results.filter((r) => !r.skipped && !r.error);

  // Send digest email if requested
  let emailResult = null;
  if (body.send_digest) {
    const topDeals = await prisma.deal.findMany({
      where: { status: "new" },
      orderBy: { score: "desc" },
      take: 25,
    });

    if (topDeals.length > 0) {
      const html = generateWeeklyDigestHtml(topDeals);
      const emailTo = process.env.EMAIL_TO || "christianellisbateman@gmail.com";
      const weekDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      emailResult = await sendEmail(
        emailTo,
        `Deal Hunter — Weekly Digest (${weekDate})`,
        html
      );

      // Record digest
      await prisma.weeklyDigest.create({
        data: {
          weekDate: new Date(),
          dealCount: topDeals.length,
          avgScore: topDeals.reduce((s, d) => s + d.score, 0) / topDeals.length,
          topScore: topDeals[0]?.score || 0,
          sentAt: emailResult.success ? new Date() : null,
          emailHtml: html,
        },
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    inserted: inserted.length,
    skipped: results.length - inserted.length,
    email: emailResult,
    results,
  });
}
