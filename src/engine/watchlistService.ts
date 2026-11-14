import { getDb } from './database';

export interface WatchlistRecord {
  id?: number;
  symbol: string;
  name: string;
  qualityTier?: string;
  score?: number;
  marketCapCategory?: string;
  price?: number;
  roce?: number;
  roe?: number;
  pe?: number;
  debtEquity?: number;
  addedAt: string;
}

interface DbRow {
  id: number;
  symbol: string;
  name: string;
  score: number | null;
  quality_tier: string | null;
  market_cap: string | null;
  price: number | null;
  roce: number | null;
  roe: number | null;
  pe: number | null;
  debt_equity: number | null;
  added_at: string;
  updated_at: string;
}

export class WatchlistService {
  public static getAll(): WatchlistRecord[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM watchlist ORDER BY added_at DESC').all() as DbRow[];
    return rows.map(r => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      qualityTier: r.quality_tier ?? undefined,
      score: r.score ?? undefined,
      marketCapCategory: r.market_cap ?? undefined,
      price: r.price ?? undefined,
      roce: r.roce ?? undefined,
      roe: r.roe ?? undefined,
      pe: r.pe ?? undefined,
      debtEquity: r.debt_equity ?? undefined,
      addedAt: r.added_at
    }));
  }

  public static add(item: Omit<WatchlistRecord, 'id'>): WatchlistRecord {
    const db = getDb();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO watchlist (
        symbol, name, score, quality_tier, market_cap,
        price, roce, roe, pe, debt_equity, added_at, updated_at
      ) VALUES (
        @symbol, @name, @score, @quality_tier, @market_cap,
        @price, @roce, @roe, @pe, @debt_equity, @added_at, @updated_at
      )
      ON CONFLICT(symbol) DO UPDATE SET
        name = excluded.name,
        score = excluded.score,
        quality_tier = excluded.quality_tier,
        market_cap = excluded.market_cap,
        price = excluded.price,
        roce = excluded.roce,
        roe = excluded.roe,
        pe = excluded.pe,
        debt_equity = excluded.debt_equity,
        updated_at = excluded.updated_at
    `);

    stmt.run({
      symbol: item.symbol.toUpperCase().trim(),
      name: item.name,
      score: item.score ?? null,
      quality_tier: item.qualityTier ?? null,
      market_cap: item.marketCapCategory ?? null,
      price: item.price ?? null,
      roce: item.roce ?? null,
      roe: item.roe ?? null,
      pe: item.pe ?? null,
      debt_equity: item.debtEquity ?? null,
      added_at: item.addedAt || now,
      updated_at: now
    });

    const inserted = db.prepare('SELECT * FROM watchlist WHERE symbol = ?').get(item.symbol.toUpperCase().trim()) as DbRow;
    return {
      id: inserted.id,
      symbol: inserted.symbol,
      name: inserted.name,
      qualityTier: inserted.quality_tier ?? undefined,
      score: inserted.score ?? undefined,
      marketCapCategory: inserted.market_cap ?? undefined,
      price: inserted.price ?? undefined,
      roce: inserted.roce ?? undefined,
      roe: inserted.roe ?? undefined,
      pe: inserted.pe ?? undefined,
      debtEquity: inserted.debt_equity ?? undefined,
      addedAt: inserted.added_at
    };
  }

  public static importBatch(items: Array<{ symbol: string; company_name?: string; name?: string; market_cap_type?: string; marketCapCategory?: string }>): { imported: number; updated: number; count: number; items: WatchlistRecord[] } {
    const db = getDb();
    const now = new Date().toISOString();
    let imported = 0;
    let updated = 0;

    const insertTx = db.transaction((rows: typeof items) => {
      for (const row of rows) {
        const cleanSymbol = (row.symbol || '').toUpperCase().trim();
        if (!cleanSymbol) continue;

        const exists = db.prepare('SELECT 1 FROM watchlist WHERE symbol = ?').get(cleanSymbol);
        if (exists) updated++;
        else imported++;

        const name = row.company_name || row.name || cleanSymbol;
        const rawCap = (row.market_cap_type || row.marketCapCategory || '').toUpperCase().replace(/[\s-]/g, '_');
        const marketCapCategory = ['LARGE_CAP', 'MID_CAP', 'SMALL_CAP', 'MICRO_CAP'].find(category =>
          rawCap === category || rawCap === category.replace('_CAP', '')
        ) || null;

        const stmt = db.prepare(`
          INSERT INTO watchlist (
            symbol, name, score, quality_tier, market_cap,
            price, roce, roe, pe, debt_equity, added_at, updated_at
          ) VALUES (
            @symbol, @name, @score, @quality_tier, @market_cap,
            @price, @roce, @roe, @pe, @debt_equity, @added_at, @updated_at
          )
          ON CONFLICT(symbol) DO UPDATE SET
            name = excluded.name,
            score = COALESCE(excluded.score, watchlist.score),
            quality_tier = COALESCE(excluded.quality_tier, watchlist.quality_tier),
            market_cap = COALESCE(excluded.market_cap, watchlist.market_cap),
            price = COALESCE(excluded.price, watchlist.price),
            roce = COALESCE(excluded.roce, watchlist.roce),
            roe = COALESCE(excluded.roe, watchlist.roe),
            pe = COALESCE(excluded.pe, watchlist.pe),
            debt_equity = COALESCE(excluded.debt_equity, watchlist.debt_equity),
            updated_at = excluded.updated_at
        `);

        stmt.run({
          symbol: cleanSymbol,
          name,
          score: null,
          quality_tier: null,
          market_cap: marketCapCategory,
          price: null,
          roce: null,
          roe: null,
          pe: null,
          debt_equity: null,
          added_at: now,
          updated_at: now
        });
      }
    });

    insertTx(items);
    const all = WatchlistService.getAll();
    return { imported, updated, count: all.length, items: all };
  }

  public static remove(symbol: string): boolean {
    const db = getDb();
    const info = db.prepare('DELETE FROM watchlist WHERE symbol = ?').run(symbol.toUpperCase().trim());
    return info.changes > 0;
  }

  public static clearAll(): void {
    const db = getDb();
    db.prepare('DELETE FROM watchlist').run();
  }

  public static exists(symbol: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM watchlist WHERE symbol = ?').get(symbol.toUpperCase().trim());
    return !!row;
  }
}
