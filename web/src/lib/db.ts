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
  await sql`
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
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
