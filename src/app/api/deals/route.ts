import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  classifyIndustry,
  detectTraits,
  computeMultiple,
  scoreDeal,
  passesFinancialFilters,
} from "@/lib/scoring";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const industry = searchParams.get("industry");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "100");

  const where: Record<string, unknown> = {};
  if (industry) where.industry = industry;
  if (status) where.status = status;

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { score: "desc" },
    take: Math.min(limit, 500),
    include: {
      feedback: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Support both single deal and batch
  const dealInputs = Array.isArray(body) ? body : [body];
  const results = [];

  for (const input of dealInputs) {
    const title = input.title || "";
    const description = input.description || "";
    const askingPrice = input.askingPrice ?? input.asking_price ?? null;
    const revenue = input.revenue ?? null;
    const ebitda = input.ebitda ?? null;
    const cashFlowSde = input.cashFlowSde ?? input.cash_flow_sde ?? null;

    const industry = classifyIndustry(title, description);
    const { positive: traits, negative: avoidTraits } = detectTraits(title, description);
    const multiple = computeMultiple(askingPrice, ebitda, cashFlowSde);

    const dealData = {
      title,
      description,
      askingPrice,
      revenue,
      ebitda,
      cashFlowSde,
      multiple,
      industry,
      traits,
      avoidTraits,
    };

    const score = scoreDeal(dealData);

    if (!passesFinancialFilters(dealData)) {
      results.push({ title, skipped: true, reason: "Failed financial filters" });
      continue;
    }

    // Dedup hash
    const dedupKey = `${title.toLowerCase().trim()}|${(input.location || "").toLowerCase().trim()}|${Math.round(askingPrice || 0)}`;
    const dedupHash = crypto.createHash("md5").update(dedupKey).digest("hex");

    // Check for existing
    const existing = await prisma.deal.findFirst({ where: { dedupHash } });
    if (existing) {
      results.push({ title, skipped: true, reason: "Duplicate", existingId: existing.id });
      continue;
    }

    const deal = await prisma.deal.create({
      data: {
        title,
        url: input.url || "",
        source: input.source || "BizBuySell",
        listingId: input.listingId ?? input.listing_id ?? "",
        industry,
        location: input.location || "",
        askingPrice,
        revenue,
        ebitda,
        cashFlowSde,
        multiple,
        yearEstablished: input.yearEstablished ?? input.year_established ?? null,
        employees: input.employees ?? null,
        description,
        traits: JSON.stringify(traits),
        avoidTraits: JSON.stringify(avoidTraits),
        score,
        brokerName: input.brokerName ?? input.broker_name ?? "",
        brokerContact: input.brokerContact ?? input.broker_contact ?? "",
        category: input.category || "",
        rawHtml: input.rawHtml ?? input.raw_html ?? "",
        dedupHash,
      },
    });

    results.push({ id: deal.id, title, score, industry, skipped: false });
  }

  return NextResponse.json(
    Array.isArray(body) ? results : results[0],
    { status: 201 }
  );
}
