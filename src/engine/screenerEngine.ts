import { 
  MarketCapCategory, 
  IndexTag, 
  QualityTier, 
  ScreenerStockItem, 
  ScreenerSummary,
  StockMetricsSnapshot 
} from '../domain/types';
import { STOCK_UNIVERSE, UniverseStockDefinition } from './stockUniverse';
import { StockScoringEngine } from './stockScoringEngine';

export class ScreenerEngine {
  private static cachedItems: ScreenerStockItem[] | null = null;
  private static lastEvaluated: number = 0;

  /**
   * Evaluate all stocks in the universe and assign Quality Tiers:
   * Category A: Score >= 90
   * Category B: 85 <= Score < 90
   * Category C: 80 <= Score < 85
   * Below 80: Score < 80
   */
  public static evaluateUniverse(forceRefresh: boolean = false): ScreenerStockItem[] {
    const now = Date.now();
    // Cache for 10 minutes unless forced
    if (!forceRefresh && this.cachedItems && (now - this.lastEvaluated < 600000)) {
      return this.cachedItems;
    }

    const items: ScreenerStockItem[] = [];

    for (const def of STOCK_UNIVERSE) {
      const metrics: StockMetricsSnapshot = {
        id: `STK-${def.symbol}`,
        symbol: def.symbol,
        name: def.name,
        sector: def.sector,
        industry: def.industry,
        marketCapCategory: def.marketCapCategory,
        snapshotDate: new Date().toISOString(),
        sourceUrl: `https://www.screener.in/company/${def.symbol}/consolidated/`,
        price: def.baseMetrics.price ?? 1000,
        marketCapCr: def.baseMetrics.marketCapCr ?? 50000,
        pe: def.baseMetrics.pe ?? 25.0,
        industryPe: 26.0,
        pb: 4.5,
        peg: def.baseMetrics.profitCagr5Y && def.baseMetrics.pe ? Math.round((def.baseMetrics.pe / def.baseMetrics.profitCagr5Y) * 100) / 100 : 1.4,
        evEbitda: def.baseMetrics.pe ? Math.round(def.baseMetrics.pe * 0.75 * 10) / 10 : 18.0,
        roe: def.baseMetrics.roe ?? 18.0,
        roce: def.baseMetrics.roce ?? 20.0,
        roceConsistencyYears: 5,
        opm: def.baseMetrics.opm ?? 20.0,
        salesCagr5Y: def.baseMetrics.salesCagr5Y ?? 15.0,
        profitCagr5Y: def.baseMetrics.profitCagr5Y ?? 18.0,
        epsCagr5Y: def.baseMetrics.profitCagr5Y ?? 18.0,
        quarterlySalesGrowth: def.baseMetrics.salesCagr5Y ? def.baseMetrics.salesCagr5Y * 0.95 : 14.0,
        quarterlyProfitGrowth: def.baseMetrics.profitCagr5Y ? def.baseMetrics.profitCagr5Y * 0.95 : 17.0,
        debtEquity: def.baseMetrics.debtEquity ?? 0.1,
        interestCoverage: def.baseMetrics.interestCoverage ?? 25.0,
        fcfCr: def.baseMetrics.fcfCr ?? 1500,
        fcfPositiveYears: 5,
        cfoCr: def.baseMetrics.cfoCr ?? 2000,
        patCr: def.baseMetrics.patCr ?? 1800,
        promoterHolding: def.baseMetrics.promoterHolding ?? 52.0,
        promoterPledge: def.baseMetrics.promoterPledge ?? 0.0,
        dma200: def.baseMetrics.price ? Math.round(def.baseMetrics.price * 0.92) : 920,
        priceAboveDma200: true,
        relativeStrengthRank: 78,
        volume20DayAvg: 1000000,
        dividendYield: def.baseMetrics.dividendYield ?? (def.baseMetrics.roce && def.baseMetrics.roce > 30 ? 2.4 : 1.5),
        dividendPayout: def.baseMetrics.dividendPayout ?? 35.0,
        dividendPerShare: Math.round(((def.baseMetrics.price ?? 1000) * ((def.baseMetrics.dividendYield ?? 1.5) / 100)) * 10) / 10,
        return5Y: def.baseMetrics.return5Y ?? Math.round((def.baseMetrics.profitCagr5Y ?? 15.0) * 1.05 * 10) / 10,
        return3Y: def.baseMetrics.return3Y ?? Math.round(((def.baseMetrics.return5Y ?? (def.baseMetrics.profitCagr5Y ?? 15.0) * 1.05) * 1.15) * 10) / 10,
        return1Y: def.baseMetrics.return1Y ?? Math.round(((def.baseMetrics.return5Y ?? (def.baseMetrics.profitCagr5Y ?? 15.0) * 1.05) * 0.95) * 10) / 10
      };

      const analysis = StockScoringEngine.analyzeStock(metrics);
      const score = analysis.totalScore;

      let qualityTier: QualityTier;
      if (score >= 90) {
        qualityTier = 'CATEGORY_A';
      } else if (score >= 85) {
        qualityTier = 'CATEGORY_B';
      } else if (score >= 80) {
        qualityTier = 'CATEGORY_C';
      } else {
        qualityTier = 'BELOW_80';
      }

      items.push({
        symbol: def.symbol,
        name: def.name,
        marketCapCategory: def.marketCapCategory,
        indices: def.indices,
        score,
        qualityTier,
        price: metrics.price,
        pe: metrics.pe,
        roce: metrics.roce,
        roe: metrics.roe,
        salesCagr5Y: metrics.salesCagr5Y,
        profitCagr5Y: metrics.profitCagr5Y,
        debtEquity: metrics.debtEquity,
        aiRisk: analysis.aiRisk,
        suitability: analysis.suitability,
        passedChecksCount: analysis.passedChecks.length,
        failedChecksCount: analysis.failedChecks.length,
        analysis
      });
    }

    // Sort descending by score
    items.sort((a, b) => b.score - a.score);

    this.cachedItems = items;
    this.lastEvaluated = now;
    return items;
  }

  /**
   * Filter screened stocks by market cap, quality tier, and index membership
   */
  public static filterStocks(options: {
    marketCapCategory?: MarketCapCategory;
    qualityTier?: QualityTier;
    index?: IndexTag;
    searchQuery?: string;
  }): ScreenerStockItem[] {
    const all = this.evaluateUniverse();
    return all.filter(item => {
      if (options.marketCapCategory && item.marketCapCategory !== options.marketCapCategory) {
        return false;
      }
      if (options.qualityTier && item.qualityTier !== options.qualityTier) {
        return false;
      }
      if (options.index && !item.indices.includes(options.index)) {
        return false;
      }
      if (options.searchQuery && options.searchQuery.trim()) {
        const q = options.searchQuery.toLowerCase().trim();
        const matchSymbol = item.symbol.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        if (!matchSymbol && !matchName) return false;
      }
      return true;
    });
  }

  /**
   * Generate aggregated summary counts across tiers & market caps
   */
  public static getSummary(): ScreenerSummary {
    const all = this.evaluateUniverse();

    const summary: ScreenerSummary = {
      totalScreened: all.length,
      categoryA: 0,
      categoryB: 0,
      categoryC: 0,
      below80: 0,
      byMarketCap: {
        largeCap: { total: 0, categoryA: 0, categoryB: 0, categoryC: 0 },
        midCap: { total: 0, categoryA: 0, categoryB: 0, categoryC: 0 },
        smallCap: { total: 0, categoryA: 0, categoryB: 0, categoryC: 0 }
      }
    };

    for (const item of all) {
      if (item.qualityTier === 'CATEGORY_A') summary.categoryA++;
      else if (item.qualityTier === 'CATEGORY_B') summary.categoryB++;
      else if (item.qualityTier === 'CATEGORY_C') summary.categoryC++;
      else summary.below80++;

      let targetCap: { total: number; categoryA: number; categoryB: number; categoryC: number };
      if (item.marketCapCategory === 'LARGE_CAP') targetCap = summary.byMarketCap.largeCap;
      else if (item.marketCapCategory === 'MID_CAP') targetCap = summary.byMarketCap.midCap;
      else targetCap = summary.byMarketCap.smallCap;

      targetCap.total++;
      if (item.qualityTier === 'CATEGORY_A') targetCap.categoryA++;
      else if (item.qualityTier === 'CATEGORY_B') targetCap.categoryB++;
      else if (item.qualityTier === 'CATEGORY_C') targetCap.categoryC++;
    }

    return summary;
  }
}
