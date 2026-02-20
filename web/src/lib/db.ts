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
}

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
