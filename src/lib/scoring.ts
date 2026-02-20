/**
 * Deal Hunter — Scoring Engine (TypeScript port)
 * Scores deals against acquisition criteria using trait detection,
 * financial multiple analysis, and industry classification.
 */

export const CRITERIA = {
  ev_min: 1_000_000,
  ev_max: 5_000_000,
  revenue_min: 2_000_000,
  revenue_max: 15_000_000,
  ebitda_min: 300_000,
  max_multiple: 4.0,
  geography: "United States",
  preferred_traits: [
    "recurring_revenue",
    "regulatory_moat",
    "labor_accessible",
    "high_switching_costs",
    "non_cyclical",
    "unglamorous",
    "essential_service",
  ],
  avoid_traits: [
    "commodity_exposure",
    "cyclical_demand",
    "specialized_labor_required",
    "asset_light_digital",
    "construction_tied",
  ],
  target_industries: [
    "Water Treatment",
    "Fire Protection",
    "Elevator Maintenance",
    "Environmental Remediation",
    "Commercial Laundry",
    "Meat Processing",
    "Produce Packing",
    "Fresh-Cut Vegetables",
    "Hide/Leather Tanning",
    "Pallet Recycling",
    "Textile Recycling",
    "Seafood Processing",
    "Contract Packaging",
    "Industrial Parts Cleaning",
    "Janitorial Services",
    "Industrial Refrigeration",
    "Demolition & Salvage",
  ],
} as const;

export const TRAIT_KEYWORDS: Record<string, string[]> = {
  recurring_revenue: [
    "contract",
    "recurring",
    "subscription",
    "auto-renew",
    "monthly",
    "annual contract",
    "repeat",
    "retainer",
  ],
  regulatory_moat: [
    "licensed",
    "permit",
    "certified",
    "epa",
    "fda",
    "usda",
    "osha",
    "regulated",
    "compliance",
    "inspection",
    "certification",
  ],
  labor_accessible: [
    "train",
    "no experience",
    "entry level",
    "on-the-job",
    "manual",
    "production line",
    "floor worker",
    "trainable",
    "unskilled",
  ],
  high_switching_costs: [
    "switching cost",
    "long-term contract",
    "auto-renew",
    "embedded",
    "sole provider",
    "exclusive",
  ],
  non_cyclical: [
    "essential",
    "recession",
    "steady",
    "consistent",
    "stable demand",
    "non-discretionary",
    "maintenance",
    "required by law",
    "mandatory",
  ],
  unglamorous: [
    "niche",
    "overlooked",
    "few competitors",
    "no one wants",
    "unglamorous",
  ],
  essential_service: [
    "essential",
    "critical",
    "life safety",
    "health",
    "food",
    "water",
    "maintenance",
    "compliance",
    "required",
  ],
  commodity_exposure: [
    "commodity",
    "spot price",
    "market price",
    "lumber",
    "steel price",
    "oil price",
  ],
  cyclical_demand: [
    "cyclical",
    "seasonal",
    "construction cycle",
    "housing market",
    "real estate dependent",
  ],
  specialized_labor_required: [
    "engineer required",
    "degree required",
    "specialized certification",
    "hard to hire",
  ],
  construction_tied: [
    "construction",
    "new build",
    "housing",
    "real estate development",
  ],
};

export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "Commercial Laundry": [
    "laundry",
    "linen",
    "uniform service",
    "textile cleaning",
  ],
  "Fire Protection": [
    "fire sprinkler",
    "fire protection",
    "fire suppression",
    "fire alarm",
  ],
  "Elevator Maintenance": ["elevator", "escalator", "lift maintenance"],
  "Environmental Remediation": [
    "remediation",
    "abatement",
    "asbestos",
    "mold removal",
    "lead abatement",
    "environmental clean",
  ],
  "Water Treatment": [
    "water treatment",
    "water purification",
    "water service",
  ],
  "Meat Processing": [
    "meat processing",
    "butcher",
    "slaughter",
    "meat packing",
  ],
  "Produce Packing": [
    "produce",
    "fresh cut",
    "vegetable processing",
    "fruit packing",
  ],
  "Seafood Processing": [
    "seafood",
    "fish processing",
    "fish packing",
    "shrimp",
  ],
  "Pallet Recycling": ["pallet", "pallet recycl", "pallet repair"],
  "Textile Recycling": ["textile recycl", "rag processing", "fiber recycl"],
  "Contract Packaging": ["co-pack", "contract pack", "packaging service"],
  "Industrial Parts Cleaning": [
    "parts cleaning",
    "degreasing",
    "industrial cleaning",
  ],
  "Janitorial Services": [
    "janitorial",
    "commercial cleaning",
    "building maintenance",
    "custodial",
  ],
  "Industrial Refrigeration": [
    "refrigeration",
    "cold storage",
    "hvac service",
    "cooling",
  ],
  "Hide/Leather Tanning": [
    "tanning",
    "hide",
    "leather processing",
    "fur dressing",
  ],
  "Demolition & Salvage": ["demolition", "salvage", "deconstruction"],
};

export const TRAIT_LABELS: Record<string, string> = {
  recurring_revenue: "Recurring Rev",
  regulatory_moat: "Reg. Moat",
  labor_accessible: "Trainable Labor",
  high_switching_costs: "High Switch Cost",
  non_cyclical: "Non-Cyclical",
  unglamorous: "Unglamorous",
  essential_service: "Essential Svc",
};

export const AVOID_LABELS: Record<string, string> = {
  commodity_exposure: "Commodity",
  cyclical_demand: "Cyclical",
  specialized_labor_required: "Specialized Labor",
  asset_light_digital: "Digital",
  construction_tied: "Construction",
};

export interface DealData {
  title: string;
  description: string;
  askingPrice: number | null;
  revenue: number | null;
  ebitda: number | null;
  cashFlowSde: number | null;
  multiple: number | null;
  industry: string;
  traits: string[];
  avoidTraits: string[];
  score?: number;
}

export function classifyIndustry(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        return industry;
      }
    }
  }
  return "Other";
}

export function detectTraits(
  title: string,
  description: string
): { positive: string[]; negative: string[] } {
  const text = `${title} ${description}`.toLowerCase();
  const positive: string[] = [];
  const negative: string[] = [];

  for (const [trait, keywords] of Object.entries(TRAIT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        if (
          (CRITERIA.preferred_traits as readonly string[]).includes(trait) &&
          !positive.includes(trait)
        ) {
          positive.push(trait);
        } else if (
          (CRITERIA.avoid_traits as readonly string[]).includes(trait) &&
          !negative.includes(trait)
        ) {
          negative.push(trait);
        }
        break;
      }
    }
  }

  return { positive, negative };
}

export function computeMultiple(
  askingPrice: number | null,
  ebitda: number | null,
  cashFlowSde: number | null
): number | null {
  const earnings = ebitda || cashFlowSde;
  if (askingPrice && earnings && earnings > 0) {
    return Math.round((askingPrice / earnings) * 100) / 100;
  }
  return null;
}

export function scoreDeal(deal: DealData): number {
  // Trait scoring (50% weight)
  let traitScore = 0;
  const maxTrait = CRITERIA.preferred_traits.length * 10;
  for (const t of deal.traits) {
    if ((CRITERIA.preferred_traits as readonly string[]).includes(t)) {
      traitScore += 10;
    }
  }
  for (const t of deal.avoidTraits) {
    if ((CRITERIA.avoid_traits as readonly string[]).includes(t)) {
      traitScore -= 15;
    }
  }
  traitScore = Math.max(
    0,
    Math.min(100, maxTrait > 0 ? (traitScore / maxTrait) * 100 : 0)
  );

  // Multiple scoring (30% weight)
  let multipleScore = 0;
  if (deal.multiple !== null) {
    if (deal.multiple <= 2.5) multipleScore = 100;
    else if (deal.multiple <= 3.0) multipleScore = 90;
    else if (deal.multiple <= 3.5) multipleScore = 75;
    else if (deal.multiple <= 4.0) multipleScore = 50;
    else multipleScore = 0;
  } else {
    multipleScore = 40; // neutral when not calculable
  }

  // Industry match (20% weight)
  const industryScore = (CRITERIA.target_industries as readonly string[]).includes(deal.industry) ? 100 : 20;

  const total = traitScore * 0.5 + multipleScore * 0.3 + industryScore * 0.2;
  return Math.min(100, Math.round(total));
}

export function passesFinancialFilters(deal: DealData): boolean {
  if (deal.askingPrice !== null) {
    if (
      deal.askingPrice < CRITERIA.ev_min ||
      deal.askingPrice > CRITERIA.ev_max
    ) {
      return false;
    }
  }

  const earnings = deal.ebitda || deal.cashFlowSde;
  if (earnings !== null && earnings < CRITERIA.ebitda_min) {
    return false;
  }

  if (deal.multiple !== null && deal.multiple > CRITERIA.max_multiple) {
    return false;
  }

  return true;
}

export function processDeal(deal: DealData): DealData {
  deal.industry = classifyIndustry(deal.title, deal.description);
  const { positive, negative } = detectTraits(deal.title, deal.description);
  deal.traits = positive;
  deal.avoidTraits = negative;
  deal.multiple = computeMultiple(
    deal.askingPrice,
    deal.ebitda,
    deal.cashFlowSde
  );
  deal.score = scoreDeal(deal);
  return deal;
}

export function parseMoney(text: string): number | null {
  if (!text || ["not disclosed", "n/a", ""].includes(text.trim().toLowerCase())) {
    return null;
  }
  const cleaned = text.trim().replace(/,/g, "").replace("$", "");
  try {
    if (cleaned.toLowerCase().includes("m")) {
      return parseFloat(cleaned.toLowerCase().replace("m", "")) * 1_000_000;
    } else if (cleaned.toLowerCase().includes("k")) {
      return parseFloat(cleaned.toLowerCase().replace("k", "")) * 1_000;
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "N/A";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  if (score >= 40) return "text-score-low";
  return "text-score-none";
}

export function getScoreHexColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#2563eb";
  if (score >= 40) return "#d97706";
  return "#6b7280";
}
