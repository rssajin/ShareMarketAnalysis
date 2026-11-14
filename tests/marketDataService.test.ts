import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketDataService } from '../src/adapters/marketDataService';
import { ScreenerScraper } from '../src/adapters/screenerScraper';
import { StockMetricsSnapshot } from '../src/domain/types';

describe('MarketDataService stock snapshot cache', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shares one fresh snapshot across screens and refreshes it after the cache expires', async () => {
    let now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const snapshot = { symbol: 'TESTCO' } as StockMetricsSnapshot;
    const fetchSnapshot = vi.spyOn(ScreenerScraper, 'getStockSnapshot')
      .mockResolvedValue(snapshot);
    const service = new MarketDataService();

    const stockAnalysisSnapshot = await service.getStockMetrics('testco.NS');
    const opportunitiesSnapshot = await service.getStockMetrics('TESTCO');
    expect(opportunitiesSnapshot).toBe(stockAnalysisSnapshot);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);

    now += 120_001;
    const refreshedSnapshot = { symbol: 'TESTCO', price: 123 } as StockMetricsSnapshot;
    fetchSnapshot.mockResolvedValueOnce(refreshedSnapshot);
    expect(await service.getStockMetrics('TESTCO')).toBe(refreshedSnapshot);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it('deduplicates simultaneous requests for the same symbol', async () => {
    let resolveSnapshot!: (snapshot: StockMetricsSnapshot) => void;
    const snapshotPromise = new Promise<StockMetricsSnapshot>(resolve => {
      resolveSnapshot = resolve;
    });
    const fetchSnapshot = vi.spyOn(ScreenerScraper, 'getStockSnapshot')
      .mockReturnValue(snapshotPromise);
    const service = new MarketDataService();

    const firstRequest = service.getStockMetrics('TESTCO');
    const secondRequest = service.getStockMetrics('testco');
    const snapshot = { symbol: 'TESTCO' } as StockMetricsSnapshot;
    resolveSnapshot(snapshot);

    expect(await firstRequest).toBe(snapshot);
    expect(await secondRequest).toBe(snapshot);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });
});
