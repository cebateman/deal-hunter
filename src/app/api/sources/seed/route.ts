import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SOURCES = [
  { name: "BizBuySell", url: "https://www.bizbuysell.com", priority: "P0", sourceType: "marketplace", requiresJs: true },
  { name: "BizQuest", url: "https://www.bizquest.com", priority: "P1", sourceType: "marketplace", requiresJs: true },
  { name: "DealStream", url: "https://www.dealstream.com", priority: "P1", sourceType: "marketplace", requiresJs: true, requiresLogin: true },
  { name: "BusinessesForSale", url: "https://www.businessesforsale.com", priority: "P2", sourceType: "marketplace" },
  { name: "LoopNet", url: "https://www.loopnet.com", priority: "P2", sourceType: "marketplace", requiresJs: true },
  { name: "The Transition Group", url: "https://thetransitiongroup.biz/businesses-for-sale/", priority: "P1", sourceType: "broker", region: "Oregon/PNW" },
  { name: "PBS Brokers", url: "https://pbsbrokers.com/businesses/?_sft_status=for-sale,escrow,in-contract", priority: "P1", sourceType: "broker", region: "West Coast" },
  { name: "Bristol Group", url: "https://bristolgrouponline.com/buy-a-business/", priority: "P1", sourceType: "broker", region: "Southeast" },
  { name: "FCBB", url: "https://fcbb.com/businesses-for-sale", priority: "P1", sourceType: "broker", region: "National", requiresJs: true },
  { name: "BizEx", url: "https://bizex.net/business-for-sale", priority: "P1", sourceType: "broker", region: "Southern CA" },
  { name: "DealForce", url: "https://dealforce.com/opportunities/", priority: "P1", sourceType: "broker", region: "National", requiresJs: true },
  { name: "Discount Businesses", url: "https://discountbusinesses.com/", priority: "P1", sourceType: "broker", region: "Varies" },
  { name: "VR Dallas", url: "https://vrdallas.com/businesses-for-sale/", priority: "P1", sourceType: "broker", region: "Texas/DFW" },
  { name: "Gill Agency", url: "https://gillagency.co/business-acquisitions/", priority: "P1", sourceType: "broker", region: "Varies" },
  { name: "Calder Group", url: "https://caldergr.com/businesses-for-sale/", priority: "P1", sourceType: "broker", region: "National" },
  { name: "Exit Equity", url: "https://exitequity.com/listing_status/current/", priority: "P1", sourceType: "broker", region: "Varies" },
  { name: "Inbar Group", url: "https://inbargroup.com/businesses-for-sale/", priority: "P1", sourceType: "broker", region: "Varies" },
  { name: "Lisiten Associates", url: "https://lisitenassociates.com/exclusive-listings/businesses-and-corporations/", priority: "P1", sourceType: "broker", region: "Varies" },
  { name: "KC Apex", url: "https://kcapex.com/listings/?status=active", priority: "P1", sourceType: "broker", region: "Kansas City" },
  { name: "Results Business Advisors", url: "https://resultsba.com/omaha-business-listings/?statuses=ACTIVE", priority: "P1", sourceType: "broker", region: "Omaha/Midwest" },
  { name: "First Street Business Brokers", url: "https://firststreetbusinessbrokers.com/opportunities/", priority: "P1", sourceType: "broker", region: "Varies" },
];

/** POST /api/sources/seed — Populate ScraperSource table (skips existing URLs) */
export async function POST() {
  let created = 0;
  let skipped = 0;

  for (const src of SOURCES) {
    const existing = await prisma.scraperSource.findFirst({
      where: { url: src.url },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.scraperSource.create({
      data: {
        name: src.name,
        url: src.url,
        priority: src.priority,
        sourceType: src.sourceType,
        requiresJs: src.requiresJs ?? false,
        requiresLogin: src.requiresLogin ?? false,
        region: src.region ?? "",
        enabled: true,
      },
    });
    created++;
  }

  return NextResponse.json({ created, skipped, total: SOURCES.length });
}
