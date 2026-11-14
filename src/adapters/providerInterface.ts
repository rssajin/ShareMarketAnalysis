import { StockMetricsSnapshot, MutualFund } from '../domain/types';

export interface IMarketDataProvider {
  getStockMetrics(symbol: string): Promise<StockMetricsSnapshot>;
  searchStocks(query: string): Promise<{ symbol: string; name: string; url?: string }[]>;
  getMutualFund(schemeCode: string): Promise<MutualFund>;
  searchMutualFunds(query: string): Promise<{ schemeCode: string; schemeName: string }[]>;
  getNseQuote?(symbol: string): Promise<any>;
  getBseQuote?(symbol: string): Promise<any>;
}
