import { describe, it, expect } from 'vitest';
import { OpportunityEngine } from '../src/engine/opportunityEngine';
import { StockMetricsSnapshot, StockAnalysis, OpportunityItem } from '../src/domain/types';
import { StockScoringEngine } from '../src/engine/stockScoringEngine';

describe('OpportunityEngine - Deterministic Valuation, Scoring & Classification', () => {
  const sampleMetrics: StockMetricsSnapshot = {
    id: 'STK-TEST',
    symbol: 'TESTCO',
    name: 'Test Enterprise Ltd',
    sector: 'Information Technology',
    industry: 'Software Consulting',
    marketCapCategory: 'LARGE_CAP',
    snapshotDate: new Date().toISOString(),
    sourceUrl: 'https://test.com',
    price: 2000,
    marketCapCr: 75000,
    pe: 18.0,
    industryPe: 25.0,
    pb: 3.5,
    peg: 1.1,
    evEbitda: 14.0,
    roe: 25.0,
    roce: 28.0,
    roceConsistencyYears: 5,
    opm: 24.0,
    salesCagr5Y: 15.0,
    profitCagr5Y: 18.0,
    epsCagr5Y: 18.0,
    quarterlySalesGrowth: 14.0,
    quarterlyProfitGrowth: 17.0,
    debtEquity: 0.05,
    interestCoverage: 40.0,
    fcfCr: 3500,
    fcfPositiveYears: 5,
    cfoCr: 4200,
    patCr: 3800,
    promoterHolding: 70.0,
    promoterPledge: 0.0,
    dma200: 1850,
    priceAboveDma200: true,
    relativeStrengthRank: 80,
    volume20DayAvg: 1000000,
    dividendYield: 2.0,
    dividendPayout: 35.0,
    dividendPerShare: 40.0,
    return5Y: 20.0,
    return3Y: 22.0,
    return1Y: 18.0
  };

  it('correctly categorizes market caps according to Indian market thresholds', () => {
    expect(OpportunityEngine.determineMarketCapCategory(80000)).toBe('LARGE_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(50000)).toBe('LARGE_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(30000)).toBe('MID_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(15000)).toBe('MID_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(5000)).toBe('SMALL_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(1000)).toBe('SMALL_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(500)).toBe('MICRO_CAP');
    expect(OpportunityEngine.determineMarketCapCategory(0)).toBe('UNCLASSIFIED');
  });

  it('calculates deterministic Fair Value and Margin of Safety', () => {
    const analysis = StockScoringEngine.analyzeStock(sampleMetrics);
    const valuation = OpportunityEngine.calculateFairValueAndMarginOfSafety(sampleMetrics, analysis.priceTargetRange);

    expect(valuation.estimatedFairValue).toBeGreaterThan(0);
    expect(typeof valuation.marginOfSafety).toBe('number');
    // For price 2000 and strong metrics (P/E 18 vs Ind 25, ROCE 28%), Fair value should be above 2000
    expect(valuation.estimatedFairValue!).toBeGreaterThan(2000);
    expect(valuation.marginOfSafety!).toBeGreaterThan(0);
    expect(['DEEPLY_UNDERVALUED', 'UNDERVALUED', 'FAIR_VALUE']).toContain(valuation.valuationStatus);
  });

  it('does not estimate fair value when industry-relative valuation data is missing', () => {
    const metricsWithoutIndustryValuation = { ...sampleMetrics, industryPe: undefined };
    const analysis = StockScoringEngine.analyzeStock(metricsWithoutIndustryValuation);
    const valuation = OpportunityEngine.calculateFairValueAndMarginOfSafety(metricsWithoutIndustryValuation, analysis.priceTargetRange);

    expect(valuation.estimatedFairValue).toBeNull();
    expect(valuation.marginOfSafety).toBeNull();
    expect(valuation.valuationStatus).toBe('NOT_AVAILABLE');
  });

  it('classifies high-quality undervalued stock as a BUY candidate', () => {
    const analysis = StockScoringEngine.analyzeStock(sampleMetrics);
    const classification = OpportunityEngine.classifyOpportunity(sampleMetrics, analysis, 'LARGE_CAP', false);

    expect(classification.classification).toBe('BUY');
    expect(classification.riskLevel).toBe('LOW');
    expect(classification.classificationReason).toContain('80-point quality hurdle');
  });

  it('classifies high-quality but expensive stock as HOLD_WATCH candidate', () => {
    // Modify metrics to have an expensive price relative to earnings
    const expensiveMetrics = { ...sampleMetrics, price: 4500, pe: 55.0 };
    const analysis = StockScoringEngine.analyzeStock(expensiveMetrics);
    const classification = OpportunityEngine.classifyOpportunity(expensiveMetrics, analysis, 'LARGE_CAP', false);

    expect(classification.classification).toBe('HOLD_WATCH');
    expect(classification.classificationReason).toContain('attractive supported valuation');
  });

  it('triggers SELL_REDUCE signal for mid/small-cap holding reaching 10-15% profit milestone', () => {
    const midCapMetrics = { ...sampleMetrics, marketCapCategory: 'MID_CAP' as const, marketCapCr: 25000 };
    const analysis = StockScoringEngine.analyzeStock(midCapMetrics);
    const classification = OpportunityEngine.classifyOpportunity(midCapMetrics, analysis, 'MID_CAP', true, 13.5);

    expect(classification.classification).toBe('SELL_REDUCE');
    expect(classification.sellSignal).toContain('Profit Booking Trigger');
    expect(classification.classificationReason).toContain('10–15%');
  });

  it('triggers SELL_REDUCE on severe fundamental deterioration and extreme leverage', () => {
    const deterioratedMetrics: StockMetricsSnapshot = {
      ...sampleMetrics,
      roce: 4.5,
      roe: 3.2,
      debtEquity: 2.2,
      interestCoverage: 1.2,
      promoterPledge: 35.0,
      fcfCr: -800,
      price: 2500,
      pe: 60.0
    };
    const analysis = StockScoringEngine.analyzeStock(deterioratedMetrics);
    const classification = OpportunityEngine.classifyOpportunity(deterioratedMetrics, analysis, 'SMALL_CAP', false);

    expect(classification.classification).toBe('SELL_REDUCE');
    expect(classification.deteriorationIndicators).toBeDefined();
    expect(classification.deteriorationIndicators!.length).toBeGreaterThanOrEqual(2);
  });

  it('sorts by Cheapest Relative to Estimated Fair Value (highest margin of safety first) by default', () => {
    const mockItems: Partial<OpportunityItem>[] = [
      { symbol: 'STK_A', marginOfSafety: 12.5, score: 85, pe: 20 },
      { symbol: 'STK_B', marginOfSafety: 28.0, score: 88, pe: 16 },
      { symbol: 'STK_C', marginOfSafety: -5.0, score: 92, pe: 35 }
    ];

    const sorted = OpportunityEngine.filterAndSort(mockItems as OpportunityItem[], {}, 'cheapest_fair_value');
    expect(sorted[0].symbol).toBe('STK_B'); // 28.0% margin of safety
    expect(sorted[1].symbol).toBe('STK_A'); // 12.5%
    expect(sorted[2].symbol).toBe('STK_C'); // -5.0%
  });

  it('filters combinably by Market-Cap and Minimum Quality Score', () => {
    const mockItems: Partial<OpportunityItem>[] = [
      { symbol: 'L_A', marketCapCategory: 'LARGE_CAP', score: 92, exchange: 'NSE/BSE', sector: 'IT' },
      { symbol: 'L_B', marketCapCategory: 'LARGE_CAP', score: 78, exchange: 'NSE/BSE', sector: 'IT' },
      { symbol: 'M_A', marketCapCategory: 'MID_CAP', score: 88, exchange: 'NSE/BSE', sector: 'Auto' },
      { symbol: 'S_A', marketCapCategory: 'SMALL_CAP', score: 84, exchange: 'NSE/BSE', sector: 'Pharma' },
      { symbol: 'MC_A', marketCapCategory: 'MICRO_CAP', score: 82, exchange: 'NSE/BSE', sector: 'Metals' }
    ];

    const filtered = OpportunityEngine.filterAndSort(mockItems as OpportunityItem[], {
      marketCap: 'LARGE_CAP',
      minScore: 80
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].symbol).toBe('L_A');
  });

  it('does not treat unavailable imported metrics as passing score checks', () => {
    const result = OpportunityEngine.analyzeWatchlist([{
      symbol: 'UNKNOWNCO',
      name: 'Unknown Company',
      qualityTier: undefined,
      score: undefined,
      marketCapCategory: 'LARGE_CAP',
      price: undefined,
      roce: undefined,
      roe: undefined,
      pe: undefined,
      debtEquity: undefined,
      addedAt: '2026-10-21T00:00:00.000Z'
    }], [], true);

    expect(result.summary.analyzedCount).toBe(0);
    expect(result.summary.incompleteCount).toBe(1);
    expect(result.buyCandidates).toHaveLength(0);
    expect(result.holdCandidates).toHaveLength(1);
    expect(result.holdCandidates[0].score).toBe(0);
    expect(result.holdCandidates[0].marginOfSafety).toBeNull();
    expect(result.holdCandidates[0].missingData).toContain('Live Market Price');
    expect(result.holdCandidates[0].classificationReason).toContain('Analysis incomplete');
  });

  it('uses each freshly fetched stock snapshot instead of stale or shared watchlist values', () => {
    const freshFirstSnapshot = {
      ...sampleMetrics,
      symbol: 'FIRSTCO',
      name: 'First Company',
      price: 1234,
      pe: 17,
      roce: 21,
      roe: 19,
      salesCagr5Y: 11,
      profitCagr5Y: 13,
      marketCapCr: 80000
    };
    const freshSecondSnapshot = {
      ...sampleMetrics,
      symbol: 'SECONDCO',
      name: 'Second Company',
      price: 2789,
      pe: 34,
      roce: 26,
      roe: 23,
      salesCagr5Y: 24,
      profitCagr5Y: 31,
      marketCapCr: 30000
    };
    const watchlist = [freshFirstSnapshot, freshSecondSnapshot].map(snapshot => ({
      symbol: snapshot.symbol,
      name: snapshot.name,
      qualityTier: undefined,
      score: undefined,
      marketCapCategory: 'LARGE_CAP',
      price: 1000,
      roce: 18,
      roe: 16,
      pe: 22,
      debtEquity: 0.15,
      addedAt: '2026-10-21T00:00:00.000Z'
    }));

    const result = OpportunityEngine.analyzeWatchlist(
      watchlist,
      [],
      true,
      new Map([
        ['FIRSTCO', freshFirstSnapshot],
        ['SECONDCO', freshSecondSnapshot]
      ])
    );

    const first = result.allOpportunities.find(item => item.symbol === 'FIRSTCO');
    const second = result.allOpportunities.find(item => item.symbol === 'SECONDCO');
    expect(first?.price).toBe(1234);
    expect(first?.pe).toBe(17);
    expect(first?.roce).toBe(21);
    expect(second?.price).toBe(2789);
    expect(second?.pe).toBe(34);
    expect(second?.roce).toBe(26);
    expect(first?.salesCagr5Y).toBe(11);
    expect(second?.salesCagr5Y).toBe(24);
    expect(first?.score).toBe(StockScoringEngine.analyzeStock(freshFirstSnapshot).totalScore);
    expect(second?.score).toBe(StockScoringEngine.analyzeStock(freshSecondSnapshot).totalScore);
  });

  it('keeps the stock-analysis score when data is incomplete but blocks a buy signal', () => {
    const partialSnapshot: StockMetricsSnapshot = {
      ...sampleMetrics,
      industryPe: 0,
      fcfCr: 0,
      unavailableMetrics: ['Industry P/E', 'Free Cash Flow']
    };
    const standaloneAnalysis = StockScoringEngine.analyzeStock(partialSnapshot);
    const result = OpportunityEngine.analyzeWatchlist([{
      symbol: partialSnapshot.symbol,
      name: partialSnapshot.name,
      qualityTier: undefined,
      score: undefined,
      marketCapCategory: partialSnapshot.marketCapCategory,
      price: undefined,
      roce: undefined,
      roe: undefined,
      pe: undefined,
      debtEquity: undefined,
      addedAt: partialSnapshot.snapshotDate
    }], [], true, new Map([[partialSnapshot.symbol, partialSnapshot]]));

    const opportunity = result.allOpportunities[0];
    expect(opportunity.score).toBe(standaloneAnalysis.totalScore);
    expect(opportunity.missingData).toContain('Industry P/E');
    expect(opportunity.missingData).toContain('Free Cash Flow');
    expect(opportunity.classification).toBe('HOLD_WATCH');
    expect(result.buyCandidates).toHaveLength(0);
  });

  it('does not use the stock price target range as a fabricated fair-value input', () => {
    const metrics = { ...sampleMetrics, price: 2000, pe: 20, industryPe: 30 };
    const valuation = OpportunityEngine.calculateFairValueAndMarginOfSafety(metrics, {
      buyRangeMin: 1900,
      buyRangeMax: 1950,
      sellRangeMin: 5000,
      sellRangeMax: 6000,
      buyStatus: 'IN_BUY_ZONE',
      buyStatusLabel: '',
      buyStrategy: '',
      sellStatus: 'UPSIDE_AHEAD',
      sellStatusLabel: '',
      sellStrategy: '',
      target1: 0,
      target2: 0,
      stopLoss: 0,
      supportLevel: 0,
      resistanceLevel: 0,
      upsidePercentMin: 0,
      upsidePercentMax: 0
    });

    expect(valuation.estimatedFairValue).toBe(3000);
    expect(valuation.valuationMethod).toContain('not an intrinsic-value estimate');
  });

  it('uses configured mid/small-cap sell triggers only for an identified holding', () => {
    const midCapMetrics = { ...sampleMetrics, marketCapCategory: 'MID_CAP' as const, marketCapCr: 25000 };
    const analysis = StockScoringEngine.analyzeStock(midCapMetrics);

    const notHeld = OpportunityEngine.classifyOpportunity(midCapMetrics, analysis, 'MID_CAP', false, 12);
    const held = OpportunityEngine.classifyOpportunity(midCapMetrics, analysis, 'MID_CAP', true, 12);

    expect(notHeld.classification).not.toBe('SELL_REDUCE');
    expect(held.classification).toBe('SELL_REDUCE');
    expect(held.classificationReason).toContain('configured trigger 10–15%');
  });

  it('does not mark a current watchlist result as cached after the watchlist changes', () => {
    const first = OpportunityEngine.analyzeWatchlist([{
      symbol: 'FIRSTCO',
      name: 'First Company',
      marketCapCategory: 'LARGE_CAP',
      addedAt: new Date().toISOString()
    }], [], false);
    const second = OpportunityEngine.analyzeWatchlist([{
      symbol: 'SECONDCO',
      name: 'Second Company',
      marketCapCategory: 'LARGE_CAP',
      addedAt: new Date().toISOString()
    }], [], false);

    expect(first.allOpportunities.map(item => item.symbol)).toEqual(['FIRSTCO']);
    expect(second.allOpportunities.map(item => item.symbol)).toEqual(['SECONDCO']);
  });

  it('marks stale snapshots and does not classify them as buy candidates', () => {
    const staleSnapshot = {
      ...sampleMetrics,
      snapshotDate: '2020-01-01T00:00:00.000Z'
    };
    const result = OpportunityEngine.analyzeWatchlist([{
      symbol: staleSnapshot.symbol,
      name: staleSnapshot.name,
      marketCapCategory: staleSnapshot.marketCapCategory,
      addedAt: staleSnapshot.snapshotDate
    }], [], true, new Map([[staleSnapshot.symbol, staleSnapshot]]));

    expect(result.allOpportunities[0].dataFreshness).toBe('STALE');
    expect(result.allOpportunities[0].classification).not.toBe('BUY');
    expect(result.allOpportunities[0].missingData).toContain('Stale market data');
  });

  it('does not expose an estimated entry range without supporting technical data', () => {
    const snapshotWithoutTechnicalData: StockMetricsSnapshot = {
      ...sampleMetrics,
      dma200: undefined,
      priceAboveDma200: undefined,
      unavailableMetrics: ['200-DMA', '200-DMA trend']
    };
    const result = OpportunityEngine.analyzeWatchlist([{
      symbol: snapshotWithoutTechnicalData.symbol,
      name: snapshotWithoutTechnicalData.name,
      marketCapCategory: snapshotWithoutTechnicalData.marketCapCategory,
      addedAt: snapshotWithoutTechnicalData.snapshotDate
    }], [], true, new Map([[snapshotWithoutTechnicalData.symbol, snapshotWithoutTechnicalData]]));

    expect(result.allOpportunities[0].entryPriceMin).toBe(0);
    expect(result.allOpportunities[0].entryPriceMax).toBe(0);
    expect(result.allOpportunities[0].buyStatusLabel).toContain('Not available');
  });
});
