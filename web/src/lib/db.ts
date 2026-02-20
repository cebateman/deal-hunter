import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "deal_hunter.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('marketplace', 'broker')),
      priority TEXT NOT NULL DEFAULT 'P1' CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
      region TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      requires_js INTEGER NOT NULL DEFAULT 0,
      requires_login INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      selectors_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export type Source = {
  id: number;
  name: string;
  url: string;
  type: "marketplace" | "broker";
  priority: "P0" | "P1" | "P2" | "P3";
  region: string;
  notes: string;
  requires_js: number;
  requires_login: number;
  enabled: number;
  selectors_json: string | null;
  created_at: string;
  updated_at: string;
};
