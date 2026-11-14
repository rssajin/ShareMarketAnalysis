import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;
let activeDbPath: string | null = null;

export function getDb(): Database.Database {
  const dbPath = process.env.SMA_DB_PATH
    ? path.resolve(process.env.SMA_DB_PATH)
    : path.join(__dirname, '../../data', 'sma.db');

  if (!dbInstance || activeDbPath !== dbPath) {
    if (dbInstance) dbInstance.close();
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    activeDbPath = dbPath;
  }
  return dbInstance;
}

export function closeDatabase(): void {
  dbInstance?.close();
  dbInstance = null;
  activeDbPath = null;
}

export function initDatabase(): void {
  const db = getDb();

  // Create watchlist table if it does not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      score REAL,
      quality_tier TEXT,
      market_cap TEXT,
      price REAL,
      roce REAL,
      roe REAL,
      pe REAL,
      debt_equity REAL,
      added_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);
  `);
}
