import { PrismaClient } from "@prisma/client";
import {
  classifyIndustry,
  detectTraits,
  computeMultiple,
  scoreDeal,
} from "../src/lib/scoring";
import crypto from "crypto";

const prisma = new PrismaClient();

const SAMPLE_DEALS = [
  {
    title: "ABC Commercial Laundry Services",
    location: "Memphis, TN",
    askingPrice: 2_200_000,
    revenue: 3_800_000,
    ebitda: 620_000,
    cashFlowSde: null,
    description:
      "Full-service commercial laundry serving 40+ hotel and restaurant accounts. Industrial washers/dryers, established routes. Owner retiring. 12 floor workers trained on-site. Contracts average 3+ years with auto-renew clauses.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1234",
    yearEstablished: 2008,
    employees: 15,
    source: "BizBuySell",
  },
  {
    title: "Southeastern Fire Sprinkler Co.",
    location: "Atlanta, GA",
    askingPrice: 3_100_000,
    revenue: 5_200_000,
    ebitda: 880_000,
    cashFlowSde: null,
    description:
      "Licensed fire sprinkler installation and mandatory annual inspection services. State licensing creates strong barrier to entry. 20 technicians with training program in place. Recurring maintenance contracts with commercial properties.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1235",
    yearEstablished: 2001,
    employees: 24,
    source: "BizBuySell",
  },
  {
    title: "Pacific Fresh-Cut Produce Processing",
    location: "Salinas, CA",
    askingPrice: 4_500_000,
    revenue: 11_000_000,
    ebitda: 1_200_000,
    cashFlowSde: null,
    description:
      "USDA-inspected fresh-cut vegetable processing for grocery chains. Cold chain infrastructure, automated wash lines. 35 production line workers, minimal experience required for entry level. Long-term contracts with major retailers.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1236",
    yearEstablished: 2005,
    employees: 42,
    source: "BizBuySell",
  },
  {
    title: "Heritage Hide & Leather Tanning",
    location: "Gloversville, NY",
    askingPrice: 1_800_000,
    revenue: 4_100_000,
    ebitda: 520_000,
    cashFlowSde: null,
    description:
      "One of the last remaining domestic hide tanning operations. EPA-permitted facility with compliance record. Processes raw hides for leather goods manufacturers. 18 floor workers trained on-site in this unglamorous niche industry.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1237",
    yearEstablished: 1962,
    employees: 22,
    source: "BizBuySell",
  },
  {
    title: "Midwest Elevator Maintenance Corp",
    location: "Chicago, IL",
    askingPrice: 3_800_000,
    revenue: 7_500_000,
    ebitda: 1_050_000,
    cashFlowSde: null,
    description:
      "Licensed elevator inspection and maintenance company serving 200+ commercial buildings. State certification required. Recurring monthly contracts with embedded long-term agreements. Essential building maintenance service with high switching costs.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1238",
    yearEstablished: 1998,
    employees: 18,
    source: "BizBuySell",
  },
  {
    title: "GreenWave Environmental Remediation",
    location: "Houston, TX",
    askingPrice: 2_800_000,
    revenue: 6_200_000,
    ebitda: 750_000,
    cashFlowSde: null,
    description:
      "EPA-licensed environmental remediation company specializing in asbestos abatement and mold removal. Required by law for commercial renovations. 25 workers, entry level trainable positions. Steady non-discretionary demand from building compliance requirements.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1239",
    yearEstablished: 2010,
    employees: 28,
    source: "BizBuySell",
  },
  {
    title: "AllClean Janitorial Services Inc",
    location: "Phoenix, AZ",
    askingPrice: 1_500_000,
    revenue: 3_200_000,
    ebitda: 480_000,
    cashFlowSde: null,
    description:
      "Commercial cleaning and janitorial services with 60+ recurring monthly contracts. Building maintenance for office parks and medical facilities. 40+ floor workers with no experience required. Essential service with consistent demand.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1240",
    yearEstablished: 2012,
    employees: 45,
    source: "BizBuySell",
  },
  {
    title: "Northeast Seafood Processing LLC",
    location: "New Bedford, MA",
    askingPrice: 3_500_000,
    revenue: 8_800_000,
    ebitda: 920_000,
    cashFlowSde: null,
    description:
      "FDA-inspected seafood processing and fish packing facility. Supplies fresh and frozen products to restaurant distributors. HACCP certified. 30 production line workers. Cold storage capacity of 50,000 sq ft. Commodity exposure to fish market prices.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1241",
    yearEstablished: 1995,
    employees: 35,
    source: "BizBuySell",
  },
  {
    title: "PalletPro Recycling & Repair",
    location: "Dallas, TX",
    askingPrice: 1_200_000,
    revenue: 2_800_000,
    ebitda: 420_000,
    cashFlowSde: null,
    description:
      "Pallet recycling and repair operation serving warehouses and distribution centers. 3 locations. Manual labor workforce trainable on the job. Recurring pickup contracts with auto-renew. Overlooked niche with few competitors.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1242",
    yearEstablished: 2015,
    employees: 20,
    source: "BizBuySell",
  },
  {
    title: "SunCoast Water Treatment Services",
    location: "Tampa, FL",
    askingPrice: 2_600_000,
    revenue: 4_900_000,
    ebitda: 680_000,
    cashFlowSde: null,
    description:
      "Licensed water treatment and purification service for commercial and municipal clients. State-certified operators. Recurring monthly service contracts. Essential water service that is required by health regulations. Stable, recession-proof demand.",
    url: "https://www.bizbuysell.com/business-opportunity/example/1243",
    yearEstablished: 2003,
    employees: 12,
    source: "BizBuySell",
  },
];

// Sources from Appendix A
const SCRAPER_SOURCES = [
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
  { name: "Calder Group", url: "https://caldergr.com/businesses-for-sale/", priority: "P1", sourceType: "broker", region: "National" },
  { name: "Exit Equity", url: "https://exitequity.com/listing_status/current/", priority: "P1", sourceType: "broker", region: "Varies" },
  { name: "KC Apex", url: "https://kcapex.com/listings/?status=active", priority: "P1", sourceType: "broker", region: "Kansas City" },
  { name: "Results Business Advisors", url: "https://resultsba.com/omaha-business-listings/?statuses=ACTIVE", priority: "P1", sourceType: "broker", region: "Omaha/Midwest" },
];

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.feedback.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.scraperSource.deleteMany();
  await prisma.weeklyDigest.deleteMany();

  // Seed deals
  for (const input of SAMPLE_DEALS) {
    const industry = classifyIndustry(input.title, input.description);
    const { positive: traits, negative: avoidTraits } = detectTraits(
      input.title,
      input.description
    );
    const multiple = computeMultiple(
      input.askingPrice,
      input.ebitda,
      input.cashFlowSde
    );
    const score = scoreDeal({
      title: input.title,
      description: input.description,
      askingPrice: input.askingPrice,
      revenue: input.revenue,
      ebitda: input.ebitda,
      cashFlowSde: input.cashFlowSde,
      multiple,
      industry,
      traits,
      avoidTraits,
    });

    const dedupKey = `${input.title.toLowerCase().trim()}|${input.location.toLowerCase().trim()}|${Math.round(input.askingPrice || 0)}`;
    const dedupHash = crypto.createHash("md5").update(dedupKey).digest("hex");

    await prisma.deal.create({
      data: {
        title: input.title,
        url: input.url,
        source: input.source,
        industry,
        location: input.location,
        askingPrice: input.askingPrice,
        revenue: input.revenue,
        ebitda: input.ebitda,
        cashFlowSde: input.cashFlowSde,
        multiple,
        yearEstablished: input.yearEstablished,
        employees: input.employees,
        description: input.description,
        traits: JSON.stringify(traits),
        avoidTraits: JSON.stringify(avoidTraits),
        score,
        dedupHash,
      },
    });

    console.log(`  Created: ${input.title} (score: ${score}, industry: ${industry})`);
  }

  // Seed scraper sources
  for (const src of SCRAPER_SOURCES) {
    await prisma.scraperSource.create({
      data: {
        name: src.name,
        url: src.url,
        priority: src.priority,
        sourceType: src.sourceType,
        requiresJs: src.requiresJs ?? false,
        requiresLogin: src.requiresLogin ?? false,
        region: src.region ?? "",
      },
    });
  }
  console.log(`  Created ${SCRAPER_SOURCES.length} scraper sources`);

  console.log("\nSeed complete!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
