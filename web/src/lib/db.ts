import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL env var is not set. Add your Neon Postgres connection string.");
  }
  return neon(url);
}

export async function initSchema() {
  const sql = getDb();

  // Users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('marketplace', 'broker')),
      priority TEXT NOT NULL DEFAULT 'P1' CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
      region TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      requires_js BOOLEAN NOT NULL DEFAULT false,
      requires_login BOOLEAN NOT NULL DEFAULT false,
      enabled BOOLEAN NOT NULL DEFAULT true,
      selectors_json TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      asking_price DOUBLE PRECISION,
      revenue DOUBLE PRECISION,
      ebitda DOUBLE PRECISION,
      cash_flow_sde DOUBLE PRECISION,
      year_established INTEGER,
      employees INTEGER,
      description TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT 'Unknown',
      date_found DATE NOT NULL DEFAULT CURRENT_DATE,
      traits TEXT[] NOT NULL DEFAULT '{}',
      avoid_traits TEXT[] NOT NULL DEFAULT '{}',
      score INTEGER NOT NULL DEFAULT 0,
      multiple DOUBLE PRECISION,
      broker TEXT NOT NULL DEFAULT '',
      listing_id TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_deals_score ON deals (score DESC);`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_url ON deals (url) WHERE url != '';`;
  await sql`
    CREATE TABLE IF NOT EXISTS criteria (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ev_min DOUBLE PRECISION NOT NULL DEFAULT 1000000,
      ev_max DOUBLE PRECISION NOT NULL DEFAULT 5000000,
      revenue_min DOUBLE PRECISION NOT NULL DEFAULT 2000000,
      revenue_max DOUBLE PRECISION NOT NULL DEFAULT 15000000,
      ebitda_min DOUBLE PRECISION NOT NULL DEFAULT 300000,
      max_multiple DOUBLE PRECISION NOT NULL DEFAULT 4.0,
      geography TEXT NOT NULL DEFAULT 'United States',
      preferred_traits TEXT[] NOT NULL DEFAULT '{recurring_revenue,regulatory_moat,labor_accessible,high_switching_costs,non_cyclical,unglamorous,essential_service}',
      avoid_traits TEXT[] NOT NULL DEFAULT '{commodity_exposure,cyclical_demand,specialized_labor_required,asset_light_digital,construction_tied}',
      target_industries TEXT[] NOT NULL DEFAULT '{Water Treatment,Fire Protection,Elevator Maintenance,Environmental Remediation,Commercial Laundry,Meat Processing,Produce Packing,Fresh-Cut Vegetables,Hide/Leather Tanning,Pallet Recycling,Textile Recycling,Seafood Processing,Contract Packaging,Industrial Parts Cleaning,Janitorial Services,Industrial Refrigeration,Demolition & Salvage}',
      search_keywords TEXT[] NOT NULL DEFAULT '{laundry,fire sprinkler,fire protection,elevator,remediation,abatement,water treatment,meat processing,produce,fresh cut,seafood,fish processing,pallet,textile,recycling,packaging,co-packing,industrial cleaning,parts cleaning,degreasing,janitorial,commercial cleaning,refrigeration,tanning,hide,leather processing,demolition,environmental services}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Deal ratings — per-user interest level on each deal
  await sql`
    CREATE TABLE IF NOT EXISTS deal_ratings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      deal_id INTEGER NOT NULL,
      interest TEXT NOT NULL CHECK(interest IN ('very_interested', 'interested', 'not_interesting', 'pass')),
      reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, deal_id)
    );
  `;
}

export type Deal = {
  id: number;
  title: string;
  url: string;
  location: string;
  asking_price: number | null;
  revenue: number | null;
  ebitda: number | null;
  cash_flow_sde: number | null;
  year_established: number | null;
  employees: number | null;
  description: string;
  source: string;
  industry: string;
  date_found: string;
  traits: string[];
  avoid_traits: string[];
  score: number;
  multiple: number | null;
  broker: string;
  listing_id: string;
  category: string;
  created_at: string;
};

export type User = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
};

export type DealRating = {
  id: number;
  user_id: number;
  deal_id: number;
  interest: "very_interested" | "interested" | "not_interesting" | "pass";
  reason: string;
  created_at: string;
  updated_at: string;
};

export type Criteria = {
  id: number;
  ev_min: number;
  ev_max: number;
  revenue_min: number;
  revenue_max: number;
  ebitda_min: number;
  max_multiple: number;
  geography: string;
  preferred_traits: string[];
  avoid_traits: string[];
  target_industries: string[];
  search_keywords: string[];
  updated_at: string;
};

export type Source = {
  id: number;
  name: string;
  url: string;
  type: "marketplace" | "broker";
  priority: "P0" | "P1" | "P2" | "P3";
  region: string;
  notes: string;
  requires_js: boolean;
  requires_login: boolean;
  enabled: boolean;
  selectors_json: string | null;
  created_at: string;
  updated_at: string;
};
