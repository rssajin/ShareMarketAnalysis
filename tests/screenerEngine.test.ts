import { describe, it, expect } from 'vitest';
import { ScreenerEngine } from '../src/engine/screenerEngine';

describe('ScreenerEngine - Quality Tiers A (90+), B (85-90), C (80-85) across Large, Mid, Small Cap', () => {
  it('should evaluate the universe and classify stocks strictly into Category A, B, C based on score', () => {
    const stocks = ScreenerEngine.evaluateUniverse(true);
    expect(stocks.length).toBeGreaterThan(15);

    for (const s of stocks) {
      if (s.score >= 90) {
        expect(s.qualityTier).toBe('CATEGORY_A');
      } else if (s.score >= 85) {
        expect(s.qualityTier).toBe('CATEGORY_B');
      } else if (s.score >= 80) {
        expect(s.qualityTier).toBe('CATEGORY_C');
      } else {
        expect(s.qualityTier).toBe('BELOW_80');
      }
    }
  });

  it('should accurately filter stocks by market cap category (Large Cap, Mid Cap, Small Cap)', () => {
    const largeCaps = ScreenerEngine.filterStocks({ marketCapCategory: 'LARGE_CAP' });
    const midCaps = ScreenerEngine.filterStocks({ marketCapCategory: 'MID_CAP' });
    const smallCaps = ScreenerEngine.filterStocks({ marketCapCategory: 'SMALL_CAP' });

    expect(largeCaps.length).toBeGreaterThan(5);
    expect(midCaps.length).toBeGreaterThan(5);
    expect(smallCaps.length).toBeGreaterThan(5);

    expect(largeCaps.every(s => s.marketCapCategory === 'LARGE_CAP')).toBe(true);
    expect(midCaps.every(s => s.marketCapCategory === 'MID_CAP')).toBe(true);
    expect(smallCaps.every(s => s.marketCapCategory === 'SMALL_CAP')).toBe(true);
  });

  it('should filter stocks by Quality Tier (Category A: 90+, Category B: 85-90, Category C: 80-85)', () => {
    const catA = ScreenerEngine.filterStocks({ qualityTier: 'CATEGORY_A' });
    const catB = ScreenerEngine.filterStocks({ qualityTier: 'CATEGORY_B' });
    const catC = ScreenerEngine.filterStocks({ qualityTier: 'CATEGORY_C' });

    expect(catA.length).toBeGreaterThan(0);
    expect(catA.every(s => s.score >= 90)).toBe(true);

    if (catB.length > 0) {
      expect(catB.every(s => s.score >= 85 && s.score < 90)).toBe(true);
    }

    if (catC.length > 0) {
      expect(catC.every(s => s.score >= 80 && s.score < 85)).toBe(true);
    }
  });

  it('should filter stocks by index membership (Nifty 50, Nifty 200, BSE 100, Nifty 500)', () => {
    const nifty50Stocks = ScreenerEngine.filterStocks({ index: 'NIFTY50' });
    expect(nifty50Stocks.length).toBeGreaterThan(5);
    expect(nifty50Stocks.every(s => s.indices.includes('NIFTY50'))).toBe(true);

    const bse100Stocks = ScreenerEngine.filterStocks({ index: 'BSE100' });
    expect(bse100Stocks.length).toBeGreaterThan(5);
    expect(bse100Stocks.every(s => s.indices.includes('BSE100'))).toBe(true);
  });

  it('should produce a consistent and valid ScreenerSummary', () => {
    const summary = ScreenerEngine.getSummary();

    expect(summary.totalScreened).toBeGreaterThan(15);
    expect(summary.categoryA + summary.categoryB + summary.categoryC + summary.below80).toBe(summary.totalScreened);

    expect(summary.byMarketCap.largeCap.total).toBeGreaterThan(5);
    expect(summary.byMarketCap.midCap.total).toBeGreaterThan(5);
    expect(summary.byMarketCap.smallCap.total).toBeGreaterThan(5);
  });
});
