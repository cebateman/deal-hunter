import { getDb } from "./db";

type SeedSource = {
  name: string;
  url: string;
  type: "marketplace" | "broker";
  priority: "P0" | "P1" | "P2" | "P3";
  region: string;
  notes: string;
  requires_js: boolean;
  requires_login: boolean;
};

const SOURCES: SeedSource[] = [
  // ── Marketplaces ──
  {
    name: "BizBuySell",
    url: "https://www.bizbuysell.com",
    type: "marketplace",
    priority: "P0",
    region: "National",
    notes: "Largest listing site. Price/EBITDA filters in URL params. Category-based search.",
    requires_js: true,
    requires_login: false,
  },
  {
    name: "BizQuest",
    url: "https://www.bizquest.com",
    type: "marketplace",
    priority: "P1",
    region: "National",
    notes: "Second largest marketplace. Similar structure to BizBuySell.",
    requires_js: true,
    requires_login: false,
  },
  {
    name: "DealStream",
    url: "https://www.dealstream.com",
    type: "marketplace",
    priority: "P1",
    region: "National",
    notes: "Mid-market deals. May require free account registration.",
    requires_js: false,
    requires_login: true,
  },
  {
    name: "BusinessesForSale",
    url: "https://www.businessesforsale.com",
    type: "marketplace",
    priority: "P2",
    region: "International",
    notes: "Global site with US filter.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "LoopNet (Industrial)",
    url: "https://www.loopnet.com",
    type: "marketplace",
    priority: "P2",
    region: "National",
    notes: "Primarily real estate but has business sales.",
    requires_js: true,
    requires_login: false,
  },

  // ── Broker Sites ──
  {
    name: "The Transition Group",
    url: "https://thetransitiongroup.biz/businesses-for-sale/",
    type: "broker",
    priority: "P1",
    region: "Oregon/PNW",
    notes: "WordPress site. Listing cards with price, revenue, CF. Jeff: (971) 224-4080",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "BSales Group",
    url: "https://bsalesgroup.com/mergers-and-acquisitions-businesses-for-sale",
    type: "broker",
    priority: "P1",
    region: "National",
    notes: "M&A focused. May require NDA for details.",
    requires_js: false,
    requires_login: true,
  },
  {
    name: "PGP Advisory",
    url: "https://pgpadvisory.com/businesses-for-sale/",
    type: "broker",
    priority: "P1",
    region: "National",
    notes: "Advisory firm. Listings may be limited/gated.",
    requires_js: false,
    requires_login: true,
  },
  {
    name: "PBS Brokers",
    url: "https://pbsbrokers.com/businesses/?_sft_status=for-sale,escrow,in-contract",
    type: "broker",
    priority: "P1",
    region: "West Coast",
    notes: "WordPress with SearchAndFilter plugin. URL params for status filtering.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Bristol Group",
    url: "https://bristolgrouponline.com/buy-a-business/",
    type: "broker",
    priority: "P1",
    region: "Southeast",
    notes: "Standard broker listing page.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "FCBB (First Choice)",
    url: "https://fcbb.com/businesses-for-sale",
    type: "broker",
    priority: "P1",
    region: "National",
    notes: "National franchise of brokers. Large volume.",
    requires_js: true,
    requires_login: false,
  },
  {
    name: "BizEx",
    url: "https://bizex.net/business-for-sale",
    type: "broker",
    priority: "P1",
    region: "Southern CA",
    notes: "Clean HTML structure. Shows asking price, gross sales, cash flow. ~19 active listings.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "DealForce",
    url: "https://dealforce.com/opportunities/",
    type: "broker",
    priority: "P1",
    region: "National",
    notes: "JS-rendered. May need Playwright.",
    requires_js: true,
    requires_login: false,
  },
  {
    name: "Discount Businesses",
    url: "https://discountbusinesses.com/",
    type: "broker",
    priority: "P1",
    region: "Varies",
    notes: "Budget-priced listings. May have below-market multiples.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "VR Dallas",
    url: "https://vrdallas.com/businesses-for-sale/",
    type: "broker",
    priority: "P1",
    region: "Texas/DFW",
    notes: "VR Business Brokers franchise, Dallas office.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Gill Agency",
    url: "https://gillagency.co/business-acquisitions/",
    type: "broker",
    priority: "P1",
    region: "Varies",
    notes: "Acquisitions-focused broker.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Calder Group",
    url: "https://caldergr.com/businesses-for-sale/",
    type: "broker",
    priority: "P1",
    region: "National",
    notes: "Has URL-based revenue and cash flow filters: _sfm_revenue, _sfm_cash_flow params.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Calder Group (Coming Soon)",
    url: "https://caldergr.com/company-profile/coming-soon/",
    type: "broker",
    priority: "P2",
    region: "National",
    notes: "Pre-market listings. Check weekly for new additions.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Exit Equity",
    url: "https://exitequity.com/listing_status/current/",
    type: "broker",
    priority: "P1",
    region: "Varies",
    notes: "WordPress. Status-based URL filtering.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Inbar Group",
    url: "https://inbargroup.com/businesses-for-sale/",
    type: "broker",
    priority: "P1",
    region: "Varies",
    notes: "Standard broker listing page.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Lisiten Associates",
    url: "https://lisitenassociates.com/exclusive-listings/businesses-and-corporations/",
    type: "broker",
    priority: "P1",
    region: "Varies",
    notes: "Exclusive listings. May have less competition.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "KC Apex",
    url: "https://kcapex.com/listings/?status=active",
    type: "broker",
    priority: "P1",
    region: "Kansas City",
    notes: "URL-based status filter. Midwest focus.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "Results Business Advisors",
    url: "https://resultsba.com/omaha-business-listings/?statuses=ACTIVE",
    type: "broker",
    priority: "P1",
    region: "Omaha/Midwest",
    notes: "URL-based status filter. Midwest market.",
    requires_js: false,
    requires_login: false,
  },
  {
    name: "First Street Business Brokers",
    url: "https://firststreetbusinessbrokers.com/opportunities/",
    type: "broker",
    priority: "P1",
    region: "Varies",
    notes: "Standard opportunities listing page.",
    requires_js: false,
    requires_login: false,
  },
];

export function seedSources() {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as n FROM sources").get() as {
    n: number;
  };
  if (count.n > 0) return; // already seeded

  const insert = db.prepare(`
    INSERT INTO sources (name, url, type, priority, region, notes, requires_js, requires_login)
    VALUES (@name, @url, @type, @priority, @region, @notes, @requires_js, @requires_login)
  `);

  const tx = db.transaction(() => {
    for (const s of SOURCES) {
      insert.run({
        name: s.name,
        url: s.url,
        type: s.type,
        priority: s.priority,
        region: s.region,
        notes: s.notes,
        requires_js: s.requires_js ? 1 : 0,
        requires_login: s.requires_login ? 1 : 0,
      });
    }
  });
  tx();
}
