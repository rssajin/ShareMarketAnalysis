import { describe, it, expect } from 'vitest';
import { StockScoringEngine } from '../src/engine/stockScoringEngine';
import { StockMetricsSnapshot } from '../src/domain/types';

describe('StockScoringEngine - 100 Point Evaluation & Priority 10 Checks', () => {
  const baseFixture: StockMetricsSnapshot = {
    id: 'STK-TEST',
    symbol: 'TESTCO',
    name: 'Test Enterprise Ltd',
    sector: 'Information Technology',
    industry: 'Software Consulting',
    marketCapCategory: 'LARGE_CAP',
    snapshotDate: '2026-09-04T00:00:00Z',
    sourceUrl: 'https://test.com',
    price: 3200,
    marketCapCr: 250000,
    pe: 22.0,
    industryPe: 26.0,
    pb: 4.5,
    peg: 1.1,
    evEbitda: 16.0,
    roe: 24.5,
    roce: 28.0,
    roceConsistencyYears: 5,
    opm: 25.0,
    salesCagr5Y: 14.5,
    profitCagr5Y: 18.2,
    epsCagr5Y: 18.0,
    quarterlySalesGrowth: 15.0,
    quarterlyProfitGrowth: 17.5,
    debtEquity: 0.05,
    interestCoverage: 35.0,
    fcfCr: 4500,
    fcfPositiveYears: 5,
    cfoCr: 5200,
    patCr: 4800,
    promoterHolding: 72.0,
    promoterPledge: 0.0,
    dma200: 2950,
    priceAboveDma200: true,
    relativeStrengthRank: 85,
    volume20DayAvg: 1500000,
    dividendYield: 2.2,
    dividendPayout: 38.0,
    dividendPerShare: 70.4,
    return5Y: 18.5,
    return3Y: 22.0,
    return1Y: 16.0
  };

  it('should preserve dividend and 5-year return metrics in stock analysis snapshot', () => {
    const analysis = StockScoringEngine.analyzeStock(baseFixture);
    expect(analysis.metrics.dividendYield).toBe(2.2);
    expect(analysis.metrics.dividendPayout).toBe(38.0);
    expect(analysis.metrics.return5Y).toBe(18.5);
  });

  it('should award a top-tier score (>=80) and EXCELLENT suitability for high-quality candidate', () => {
    const analysis = StockScoringEngine.analyzeStock(baseFixture);

    expect(analysis.totalScore).toBeGreaterThanOrEqual(80);
    expect(analysis.suitability).toBe('EXCELLENT');
    expect(analysis.priority10Checks.length).toBe(10);
    expect(analysis.failedChecks.length).toBe(0);
    expect(analysis.aiRisk).toBe('BENEFICIARY');
    expect(analysis.businessQualityScore.score).toBeGreaterThan(15);
    expect(analysis.financialStrengthScore.score).toBeGreaterThan(12);
  });

  it('should penalize debt and promoter pledge > 0', () => {
    const highRiskFixture: StockMetricsSnapshot = {
      ...baseFixture,
      debtEquity: 1.8,
      interestCoverage: 1.5,
      promoterPledge: 45.0
    };

    const analysis = StockScoringEngine.analyzeStock(highRiskFixture);

    expect(analysis.financialStrengthScore.score).toBeLessThan(5);
    expect(analysis.managementScore.score).toBeLessThan(3);
    expect(analysis.failedChecks.some(f => f.includes('Debt / Equity'))).toBe(true);
    expect(analysis.failedChecks.some(f => f.includes('Promoter Pledge'))).toBe(true);
    expect(analysis.warnings.some(w => w.includes('Promoter shares pledged'))).toBe(true);
  });

  it('should penalize negative free cash flow and CFO trailing PAT', () => {
    const cashBurnFixture: StockMetricsSnapshot = {
      ...baseFixture,
      fcfCr: -1200,
      fcfPositiveYears: 1,
      cfoCr: 800,
      patCr: 3500 // CFO << PAT (low earnings quality)
    };

    const analysis = StockScoringEngine.analyzeStock(cashBurnFixture);

    expect(analysis.cashFlowScore.score).toBeLessThan(4);
    expect(analysis.failedChecks.some(f => f.includes('Positive Free Cash Flow'))).toBe(true);
    expect(analysis.warnings.some(w => w.includes('Negative free cash flow'))).toBe(true);
  });

  it('should correctly classify AI Vulnerable companies', () => {
    const bpoFixture: StockMetricsSnapshot = {
      ...baseFixture,
      sector: 'Services',
      industry: 'BPO and Call Center Operations'
    };

    const analysis = StockScoringEngine.analyzeStock(bpoFixture);

    expect(analysis.aiRisk).toBe('VULNERABLE');
    expect(analysis.warnings.some(w => w.includes('AI Disruption Vulnerability'))).toBe(true);
    // Vulnerable companies should not be EXCELLENT even with good financials
    expect(analysis.suitability).not.toBe('EXCELLENT');
  });

  it('should handle extreme or loss-making valuation', () => {
    const expensiveFixture: StockMetricsSnapshot = {
      ...baseFixture,
      pe: 140.0,
      peg: 4.5
    };

    const analysis = StockScoringEngine.analyzeStock(expensiveFixture);

    expect(analysis.valuationScore.score).toBeLessThan(4);
    expect(analysis.failedChecks.some(f => f.includes('Valuation'))).toBe(true);
  });

  it('should award full 100-point framework scoring to Priority 10 Investment Checks', () => {
    const analysis = StockScoringEngine.analyzeStock(baseFixture);

    // Verify 10 checks exist
    expect(analysis.priority10Checks.length).toBe(10);

    // Verify each check has required scoring fields totaling 100 points
    let totalMaxScore = 0;
    for (const check of analysis.priority10Checks) {
      expect(check.maxScore).toBe(10);
      expect(check.weight).toBe(10);
      expect(check.dimension).toBeDefined();
      expect(typeof check.score).toBe('number');
      expect(check.score).toBeGreaterThanOrEqual(0);
      expect(check.score).toBeLessThanOrEqual(10);
      totalMaxScore += check.maxScore!;
    }
    expect(totalMaxScore).toBe(100);

    // Verify priority10Score exists and equals sum of scores
    const calculatedSum = Math.round(analysis.priority10Checks.reduce((acc, c) => acc + (c.score || 0), 0) * 10) / 10;
    expect(analysis.priority10Score).toBe(calculatedSum);
    expect(analysis.priority10Score).toBeGreaterThanOrEqual(85);
  });

  it('should penalize priority 10 check scores when metrics fail hurdles', () => {
    const poorMetricsFixture: StockMetricsSnapshot = {
      ...baseFixture,
      salesCagr5Y: 3.2,
      profitCagr5Y: 2.1,
      epsCagr5Y: -1.5,
      roce: 8.5,
      roe: 7.2,
      debtEquity: 1.6,
      fcfCr: -500,
      fcfPositiveYears: 0,
      promoterPledge: 25.0,
      pe: 55.0,
      industryPe: 22.0,
      peg: 3.8,
      priceAboveDma200: false
    };

    const analysis = StockScoringEngine.analyzeStock(poorMetricsFixture);

    expect(analysis.priority10Checks.length).toBe(10);
    // Almost all checks should fail
    expect(analysis.failedChecks.length).toBeGreaterThanOrEqual(8);
    // Priority 10 score should be heavily penalized
    expect(analysis.priority10Score).toBeLessThan(40);

    // Specific check score deductions
    const debtCheck = analysis.priority10Checks.find(c => c.name.includes('Debt'));
    expect(debtCheck?.passed).toBe(false);
    expect(debtCheck?.score).toBe(0);

    const fcfCheck = analysis.priority10Checks.find(c => c.name.includes('Cash Flow'));
    expect(fcfCheck?.passed).toBe(false);
    expect(fcfCheck?.score).toBe(0);

    const pledgeCheck = analysis.priority10Checks.find(c => c.name.includes('Pledge'));
    expect(pledgeCheck?.passed).toBe(false);
    expect(pledgeCheck?.score).toBe(0);
  });

  it('must not award passing points for unavailable financial and valuation inputs', () => {
    const incompleteFixture: StockMetricsSnapshot = {
      ...baseFixture,
      unavailableMetrics: [
        'ROE',
        'ROCE',
        'ROCE Consistency',
        'Operating Margin',
        '5Y Sales Growth',
        '5Y Profit Growth',
        'EPS Growth',
        'Debt-to-Equity',
        'Interest Coverage',
        'Free Cash Flow',
        'FCF History',
        'Operating Cash Flow',
        'Profit After Tax',
        'Promoter Pledge',
        'Promoter Holding',
        'Industry P/E'
      ]
    };

    const analysis = StockScoringEngine.analyzeStock(incompleteFixture);

    for (const name of [
      'ROE > 15%',
      'ROCE > 15%',
      'Debt / Equity < 0.5',
      'Positive Free Cash Flow',
      'Promoter Pledge = 0%',
      'Competitive Moat & Technical Trend'
    ]) {
      const check = analysis.priority10Checks.find(item => item.name === name);
      expect(check?.passed).toBe(false);
      expect(check?.score).toBe(0);
    }
    expect(analysis.priority10Checks.find(item => item.name === 'Debt / Equity < 0.5')?.value).toBe('N/A');
    expect(analysis.priority10Checks.find(item =>
      item.name === 'Reasonable Valuation (PEG <= 1.8)'
    )?.passed).toBe(true);
  });

  it('evaluates the Priority 10 PEG check when industry P/E is unavailable', () => {
    const analysis = StockScoringEngine.analyzeStock({
      ...baseFixture,
      unavailableMetrics: ['Industry P/E']
    });

    const valuationCheck = analysis.priority10Checks.find(item =>
      item.name === 'Reasonable Valuation (PEG <= 1.8)'
    );
    expect(valuationCheck?.passed).toBe(true);
    expect(valuationCheck?.value).toContain('PEG 1.10');
  });

  it('should calculate valid buy and sell price ranges adhering to portfolio rules', () => {
    // 1. Large-cap test
    const largeCapAnalysis = StockScoringEngine.analyzeStock(baseFixture);
    expect(largeCapAnalysis.priceTargetRange).toBeDefined();
    const ptr = largeCapAnalysis.priceTargetRange!;

    expect(ptr.buyRangeMin).toBeLessThan(ptr.buyRangeMax);
    expect(ptr.buyRangeMin).toBeGreaterThan(0);
    expect(ptr.sellRangeMin).toBeLessThan(ptr.sellRangeMax);
    expect(ptr.sellRangeMin).toBeGreaterThan(baseFixture.price);
    expect(ptr.stopLoss).toBeLessThan(baseFixture.price);
    expect(ptr.buyStrategy).toContain('Large-cap');

    // 2. Mid/Small-cap test (10-15% profit rule)
    const midCapFixture: StockMetricsSnapshot = {
      ...baseFixture,
      marketCapCategory: 'MID_CAP',
      price: 1000
    };
    const midCapAnalysis = StockScoringEngine.analyzeStock(midCapFixture);
    const midPtr = midCapAnalysis.priceTargetRange!;
    expect(midPtr.sellRangeMin).toBe(1100); // +10% target
    expect(midPtr.sellRangeMax).toBe(1150); // +15% target
    expect(midPtr.sellStrategy).toContain('10–15% profit rule');
  });
});
