import { IMarketDataProvider } from './providerInterface';
import { StockMetricsSnapshot, MutualFund, ExchangeQuote } from '../domain/types';
import { ScreenerScraper } from './screenerScraper';
import { AmfiMutualFundAdapter } from './amfiMutualFundAdapter';
import { NseAdapter } from './nseAdapter';
import { BseAdapter } from './bseAdapter';

export class MarketDataService implements IMarketDataProvider {
  private readonly stockSnapshotCache = new Map<string, {
    snapshot: StockMetricsSnapshot;
    fetchedAt: number;
  }>();
  private readonly stockSnapshotRequests = new Map<string, Promise<StockMetricsSnapshot>>();
  private readonly stockSnapshotCacheTtlMs = 120_000;

  public async getStockMetrics(symbol: string): Promise<StockMetricsSnapshot> {
    const cacheKey = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
    const now = Date.now();
    const cached = this.stockSnapshotCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < this.stockSnapshotCacheTtlMs) {
      return cached.snapshot;
    }

    const pendingRequest = this.stockSnapshotRequests.get(cacheKey);
    if (pendingRequest) return pendingRequest;

    const request = ScreenerScraper.getStockSnapshot(cacheKey);
    this.stockSnapshotRequests.set(cacheKey, request);
    try {
      const snapshot = await request;
      this.stockSnapshotCache.set(cacheKey, { snapshot, fetchedAt: Date.now() });
      return snapshot;
    } finally {
      if (this.stockSnapshotRequests.get(cacheKey) === request) {
        this.stockSnapshotRequests.delete(cacheKey);
      }
    }
  }

  public async searchStocks(query: string): Promise<{ symbol: string; name: string; url?: string }[]> {
    return await ScreenerScraper.search(query);
  }

  public async getMutualFund(schemeCode: string): Promise<MutualFund> {
    return await AmfiMutualFundAdapter.getSchemeDetails(schemeCode);
  }

  public async searchMutualFunds(query: string): Promise<{ schemeCode: string; schemeName: string }[]> {
    return await AmfiMutualFundAdapter.searchSchemes(query);
  }

  public async getNseQuote(symbol: string): Promise<ExchangeQuote | null> {
    return await NseAdapter.getQuote(symbol);
  }

  public async getBseQuote(symbol: string): Promise<ExchangeQuote | null> {
    return await BseAdapter.getQuote(symbol);
  }

  public async getExchangeQuotes(symbol: string): Promise<{ nse: ExchangeQuote | null; bse: ExchangeQuote | null }> {
    const [nse, bse] = await Promise.all([
      NseAdapter.getQuote(symbol),
      BseAdapter.getQuote(symbol)
    ]);
    return { nse, bse };
  }
}

export const marketDataService = new MarketDataService();
