import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { closeDatabase, initDatabase } from '../src/engine/database';
import { WatchlistService } from '../src/engine/watchlistService';

describe('WatchlistService SQLite Database Persistence (Step 3)', () => {
  const testDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sma-watchlist-test-'));
  const testDatabasePath = path.join(testDataDirectory, 'sma.db');

  beforeEach(() => {
    vi.stubEnv('SMA_DB_PATH', testDatabasePath);
    initDatabase();
    WatchlistService.clearAll();
  });

  afterAll(() => {
    closeDatabase();
    vi.unstubAllEnvs();
    for (const filePath of [testDatabasePath, `${testDatabasePath}-wal`, `${testDatabasePath}-shm`]) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    fs.rmdirSync(testDataDirectory);
  });

  it('initializes database and starts with empty watchlist', () => {
    const all = WatchlistService.getAll();
    expect(all).toEqual([]);
  });

  it('adds and retrieves a stock from the database', () => {
    const saved = WatchlistService.add({
      symbol: 'TCS',
      name: 'Tata Consultancy Services Ltd',
      qualityTier: 'CATEGORY_A',
      score: 92.5,
      marketCapCategory: 'LARGE_CAP',
      price: 3200,
      roce: 28.0,
      roe: 24.5,
      pe: 22.0,
      debtEquity: 0.05,
      addedAt: new Date().toISOString()
    });

    expect(saved.symbol).toBe('TCS');
    expect(saved.score).toBe(92.5);
    expect(saved.id).toBeDefined();

    const items = WatchlistService.getAll();
    expect(items.length).toBe(1);
    expect(items[0].symbol).toBe('TCS');
    expect(items[0].name).toBe('Tata Consultancy Services Ltd');
  });

  it('updates an existing stock without duplicates (ON CONFLICT REPLACE)', () => {
    WatchlistService.add({
      symbol: 'INFY',
      name: 'Infosys Limited',
      qualityTier: 'CATEGORY_B',
      score: 87.0,
      marketCapCategory: 'LARGE_CAP',
      price: 1800,
      roce: 22.0,
      roe: 20.0,
      pe: 24.0,
      debtEquity: 0.1,
      addedAt: '2026-09-01T00:00:00Z'
    });

    // Re-add with updated score
    WatchlistService.add({
      symbol: 'INFY',
      name: 'Infosys Limited',
      qualityTier: 'CATEGORY_A',
      score: 91.0,
      marketCapCategory: 'LARGE_CAP',
      price: 1900,
      roce: 25.0,
      roe: 22.0,
      pe: 25.0,
      debtEquity: 0.08,
      addedAt: '2026-09-01T00:00:00Z'
    });

    const items = WatchlistService.getAll();
    expect(items.length).toBe(1);
    expect(items[0].score).toBe(91.0);
    expect(items[0].qualityTier).toBe('CATEGORY_A');
  });

  it('checks if a symbol exists', () => {
    WatchlistService.add({
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd',
      qualityTier: 'CATEGORY_B',
      score: 86.5,
      marketCapCategory: 'LARGE_CAP',
      price: 2900,
      roce: 16.0,
      roe: 14.5,
      pe: 26.0,
      debtEquity: 0.38,
      addedAt: new Date().toISOString()
    });

    expect(WatchlistService.exists('RELIANCE')).toBe(true);
    expect(WatchlistService.exists('reliance')).toBe(true); // case-insensitive check
    expect(WatchlistService.exists('UNKNOWN')).toBe(false);
  });

  it('removes a symbol from the watchlist', () => {
    WatchlistService.add({
      symbol: 'POLYCAB',
      name: 'Polycab India Ltd',
      qualityTier: 'CATEGORY_A',
      score: 91.5,
      marketCapCategory: 'MID_CAP',
      price: 6200,
      roce: 28.5,
      roe: 23.0,
      pe: 38.0,
      debtEquity: 0.02,
      addedAt: new Date().toISOString()
    });

    expect(WatchlistService.getAll().length).toBe(1);
    const removed = WatchlistService.remove('POLYCAB');
    expect(removed).toBe(true);
    expect(WatchlistService.getAll().length).toBe(0);
  });

  it('clears all entries from the watchlist', () => {
    WatchlistService.add({
      symbol: 'KAYNES',
      name: 'Kaynes Technology India Ltd',
      qualityTier: 'CATEGORY_C',
      score: 82.0,
      marketCapCategory: 'SMALL_CAP',
      price: 5180,
      roce: 18.0,
      roe: 16.0,
      pe: 65.0,
      debtEquity: 0.25,
      addedAt: new Date().toISOString()
    });
    WatchlistService.add({
      symbol: 'TCS',
      name: 'TCS',
      qualityTier: 'CATEGORY_A',
      score: 93.0,
      marketCapCategory: 'LARGE_CAP',
      price: 3200,
      roce: 28.0,
      roe: 24.5,
      pe: 22.0,
      debtEquity: 0.05,
      addedAt: new Date().toISOString()
    });

    expect(WatchlistService.getAll().length).toBe(2);
    WatchlistService.clearAll();
    expect(WatchlistService.getAll().length).toBe(0);
  });

  it('imports batch of stocks from CSV items and normalizes market cap', () => {
    const res = WatchlistService.importBatch([
      { symbol: 'LUPIN', company_name: 'Lupin', market_cap_type: 'Large Cap' },
      { symbol: 'BAJAJ-AUTO', company_name: 'Bajaj Auto', market_cap_type: 'Large Cap' },
      { symbol: 'POLYCAB', company_name: 'Polycab India', market_cap_type: 'Mid Cap' },
      { symbol: 'KAYNES', company_name: 'Kaynes Tech', market_cap_type: 'Small Cap' }
    ]);

    expect(res.imported).toBe(4);
    expect(res.updated).toBe(0);
    expect(res.count).toBe(4);

    const all = WatchlistService.getAll();
    expect(all.length).toBe(4);

    const lupin = all.find(s => s.symbol === 'LUPIN');
    expect(lupin).toBeDefined();
    expect(lupin?.marketCapCategory).toBe('LARGE_CAP');

    const polycab = all.find(s => s.symbol === 'POLYCAB');
    expect(polycab).toBeDefined();
    expect(polycab?.marketCapCategory).toBe('MID_CAP');
    expect(all.every(stock => stock.score === undefined && stock.price === undefined)).toBe(true);
    expect(all.every(stock => stock.roce === undefined && stock.pe === undefined)).toBe(true);
  });

  it('does not replace existing analysis data when re-importing CSV metadata', () => {
    WatchlistService.add({
      symbol: 'LUPIN',
      name: 'Lupin',
      qualityTier: 'CATEGORY_B',
      score: 88,
      marketCapCategory: 'LARGE_CAP',
      price: 1900,
      roce: 18,
      roe: 17,
      pe: 24,
      debtEquity: 0.2,
      addedAt: new Date().toISOString()
    });

    WatchlistService.importBatch([{ symbol: 'LUPIN', company_name: 'Lupin Limited' }]);

    const lupin = WatchlistService.getAll().find(stock => stock.symbol === 'LUPIN');
    expect(lupin?.name).toBe('Lupin Limited');
    expect(lupin?.score).toBe(88);
    expect(lupin?.price).toBe(1900);
    expect(lupin?.qualityTier).toBe('CATEGORY_B');
    expect(lupin?.marketCapCategory).toBe('LARGE_CAP');
  });

  it('leaves an unknown imported market-cap category unclassified', () => {
    WatchlistService.importBatch([
      { symbol: 'TESTCO', company_name: 'Test Company', market_cap_type: 'Unknown' }
    ]);

    const imported = WatchlistService.getAll().find(stock => stock.symbol === 'TESTCO');
    expect(imported?.marketCapCategory).toBeUndefined();
    expect(imported?.score).toBeUndefined();
  });

  it('handles re-importing in batch by updating existing records', () => {
    WatchlistService.importBatch([
      { symbol: 'LUPIN', company_name: 'Lupin', market_cap_type: 'Large Cap' }
    ]);

    const res2 = WatchlistService.importBatch([
      { symbol: 'LUPIN', company_name: 'Lupin Limited', market_cap_type: 'Large Cap' },
      { symbol: 'BAJAJ-AUTO', company_name: 'Bajaj Auto', market_cap_type: 'Large Cap' }
    ]);

    expect(res2.imported).toBe(1);
    expect(res2.updated).toBe(1);
    expect(res2.count).toBe(2);

    const updated = WatchlistService.getAll().find(s => s.symbol === 'LUPIN');
    expect(updated?.name).toBe('Lupin Limited');
    expect(updated?.score).toBeUndefined();
  });
});
