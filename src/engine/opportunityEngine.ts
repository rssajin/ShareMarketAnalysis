import { 
  StockMetricsSnapshot, 
  StockAnalysis,
  Holding, 
  OpportunityItem, 
  OpportunitySummary, 
  OpportunitiesAnalysisResult, 
  ExtendedMarketCapCategory, 
  ValuationStatusType, 
  QualityTier,
  OpportunityClassification
} from '../domain/types';
import { WatchlistRecord } from './watchlistService';
import { StockScoringEngine } from './stockScoringEngine';
import { auditTrail } from './auditTrail';
import { getInvestmentConfig } from './config';

export interface OpportunityFilterCriteria {
  marketCap?: ExtendedMarketCapCategory | 'ALL';
  exchange?: 'ALL' | 'NSE' | 'BSE';
  sector?: string;
  minScore?: number;
  maxPe?: number;
  maxPb?: number;
  minRoce?: number;
  minSalesGrowth?: number;
  minProfitGrowth?: number;
  maxDebtEquity?: number;
  minMarginOfSafety?: number;
  valuationStatus?: ValuationStatusType | 'ALL';
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'ALL';
  signal?: OpportunityClassification | 'ALL';
  searchQuery?: string;
}

export class OpportunityEngine {
  /**
   * Determine Market-Cap Category based on Indian Market thresholds:
   * Large Cap: >= ₹50,000 Cr
   * Mid Cap: >= ₹15,000 Cr and < ₹50,000 Cr
   * Small Cap: >= ₹1,000 Cr and < ₹15,000 Cr
   * Micro Cap: < ₹1,000 Cr (Application-defined segment; note: not an official SEBI mutual fund category)
   * Unclassified: Market Cap data missing or invalid
   */
  public static determineMarketCapCategory(marketCapCr: number, defaultCategory?: string): ExtendedMarketCapCategory {
    if (marketCapCr >= 50000) return 'LARGE_CAP';
    if (marketCapCr >= 15000) return 'MID_CAP';
    if (marketCapCr >= 1000) return 'SMALL_CAP';
    if (marketCapCr > 0) return 'MICRO_CAP';

    if (defaultCategory === 'LARGE_CAP') return 'LARGE_CAP';
    if (defaultCategory === 'MID_CAP') return 'MID_CAP';
    if (defaultCategory === 'SMALL_CAP') return 'SMALL_CAP';
    if (defaultCategory === 'MICRO_CAP') return 'MICRO_CAP';

    return 'UNCLASSIFIED';
  }

  /**
   * Deterministically estimate Fair Value and Margin of Safety.
   * Margin of Safety (%) = ((Estimated Fair Value - Current Market Price) / Estimated Fair Value) * 100
   */
  public static calculateFairValueAndMarginOfSafety(
    metrics: StockMetricsSnapshot,
    _priceTargetRange?: StockAnalysis['priceTargetRange']
  ): {
    estimatedFairValue: number | null;
    marginOfSafety: number | null;
    valuationStatus: ValuationStatusType;
    valuationStatusLabel: string;
    valuationMethod: string;
  } {
    const price = metrics.price;
    if (!price || price <= 0) {
      return {
        estimatedFairValue: null,
        marginOfSafety: null,
        valuationStatus: 'NOT_AVAILABLE',
        valuationStatusLabel: 'Valuation N/A',
        valuationMethod: 'Incomplete Price'
      };
    }

    const industryPe = metrics.industryPe || 0;
    const pe = metrics.pe;
    if (!Number.isFinite(pe) || pe <= 0 || !Number.isFinite(industryPe) || industryPe <= 0) {
      return {
        estimatedFairValue: null,
        marginOfSafety: null,
        valuationStatus: 'NOT_AVAILABLE',
        valuationStatusLabel: 'Valuation unavailable — reliable company and industry P/E are required',
        valuationMethod: 'Insufficient financial data'
      };
    }

    const earningsPerShare = price / pe;
    if (!Number.isFinite(earningsPerShare) || earningsPerShare <= 0) {
      return {
        estimatedFairValue: null,
        marginOfSafety: null,
        valuationStatus: 'NOT_AVAILABLE',
        valuationStatusLabel: 'Valuation unavailable — positive earnings are required',
        valuationMethod: 'Insufficient financial data'
      };
    }

    const estimatedFairValue = Math.round(earningsPerShare * industryPe);

    const marginOfSafety = Math.round(((estimatedFairValue - price) / estimatedFairValue) * 1000) / 10;

    let valuationStatus: ValuationStatusType;
    let valuationStatusLabel: string;
    if (marginOfSafety >= 20) {
      valuationStatus = 'DEEPLY_UNDERVALUED';
      valuationStatusLabel = `💎 Industry-relative discount (+${marginOfSafety}%)`;
    } else if (marginOfSafety >= 5) {
      valuationStatus = 'UNDERVALUED';
      valuationStatusLabel = `🟢 Below industry P/E reference (+${marginOfSafety}%)`;
    } else if (marginOfSafety >= -10) {
      valuationStatus = 'FAIR_VALUE';
      valuationStatusLabel = `⚖️ Near industry P/E reference (${marginOfSafety >= 0 ? '+' : ''}${marginOfSafety}%)`;
    } else if (marginOfSafety >= -25) {
      valuationStatus = 'OVERVALUED';
      valuationStatusLabel = `⏳ Above industry P/E reference (${marginOfSafety}%)`;
    } else {
      valuationStatus = 'EXTREMELY_OVERVALUED';
      valuationStatusLabel = `⚠️ Well above industry P/E reference (${marginOfSafety}%)`;
    }

    return {
      estimatedFairValue,
      marginOfSafety,
      valuationStatus,
      valuationStatusLabel,
      valuationMethod: 'Industry-relative P/E reference; not an intrinsic-value estimate'
    };
  }

  /**
   * Determine Risk Level deterministically
   */
  public static evaluateRiskLevel(
    metrics: StockMetricsSnapshot,
    score: number,
    marketCap: ExtendedMarketCapCategory,
    aiRisk: string
  ): 'LOW' | 'MODERATE' | 'HIGH' {
    const unavailable = new Set((metrics.unavailableMetrics || []).map(value => value.toLowerCase()));
    if (
      unavailable.has('debt-to-equity') ||
      unavailable.has('promoter pledge') ||
      unavailable.has('roce')
    ) {
      return marketCap === 'MICRO_CAP' ? 'HIGH' : 'MODERATE';
    }

    if (
      metrics.debtEquity > 1.0 ||
      metrics.promoterPledge > 10 ||
      metrics.roce < 10 ||
      aiRisk === 'VULNERABLE' ||
      marketCap === 'MICRO_CAP'
    ) {
      return 'HIGH';
    }

    if (
      metrics.debtEquity <= 0.3 &&
      metrics.promoterPledge === 0 &&
      metrics.roce >= 20 &&
      score >= 85 &&
      marketCap === 'LARGE_CAP'
    ) {
      return 'LOW';
    }

    return 'MODERATE';
  }

  /**
   * Classify stock into BUY, HOLD/WATCH, or SELL/REDUCE
   */
  public static classifyOpportunity(
    metrics: StockMetricsSnapshot,
    analysis: StockAnalysis,
    marketCap: ExtendedMarketCapCategory,
    isPortfolioHolding: boolean,
    holdingPnlPercent?: number
  ): {
    classification: OpportunityClassification;
    classificationReason: string;
    sellSignal?: string;
    deteriorationIndicators?: string[];
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    valuation: ReturnType<typeof OpportunityEngine.calculateFairValueAndMarginOfSafety>;
  } {
    const valuation = this.calculateFairValueAndMarginOfSafety(metrics, analysis.priceTargetRange);
    const mos = valuation.marginOfSafety;
    const score = analysis.totalScore;
    const price = metrics.price;
    const riskLevel = this.evaluateRiskLevel(metrics, score, marketCap, analysis.aiRisk);
    const config = getInvestmentConfig();
    const { stockScoring, equity } = config;
    const isAvailable = (field: string) =>
      !(metrics.unavailableMetrics || []).some(value => value.toLowerCase() === field.toLowerCase());

    const requiredData: string[] = [];
    const requiredFields = [
      ['Live Market Price', price > 0],
      ['Market Capitalization', metrics.marketCapCr > 0],
      ['P/E Ratio', metrics.pe > 0],
      ['Industry P/E', (metrics.industryPe || 0) > 0],
      ['ROE', isAvailable('ROE')],
      ['ROCE', isAvailable('ROCE')],
      ['Debt-to-Equity', isAvailable('Debt-to-Equity')],
      ['Interest Coverage', isAvailable('Interest Coverage')],
      ['5Y Sales Growth', isAvailable('5Y Sales Growth')],
      ['5Y Profit Growth', isAvailable('5Y Profit Growth')],
      ['EPS Growth', isAvailable('EPS Growth') && metrics.epsCagr5Y !== undefined],
      ['Free Cash Flow', isAvailable('Free Cash Flow')],
      ['Promoter Pledge', isAvailable('Promoter Pledge')],
      ['200-DMA trend', metrics.priceAboveDma200 !== undefined],
      ['Market-cap category', marketCap !== 'UNCLASSIFIED']
    ] as const;
    for (const [field, present] of requiredFields) {
      if (!present && !requiredData.includes(field)) requiredData.push(field);
    }

    if (requiredData.length > 0) {
      return {
        classification: 'HOLD_WATCH',
        classificationReason: `Analysis incomplete: ${requiredData.join(', ')} unavailable. Keep on watch until complete data is fetched.`,
        riskLevel,
        valuation
      };
    }

    const snapshotTime = Date.parse(metrics.snapshotDate);
    if (!Number.isFinite(snapshotTime) || Date.now() - snapshotTime > 48 * 60 * 60 * 1000) {
      return {
        classification: 'HOLD_WATCH',
        classificationReason: 'Market data is stale or its timestamp is unavailable. Refresh the analysis before considering a buy or sell/reduce signal.',
        riskLevel,
        valuation: {
          estimatedFairValue: null,
          marginOfSafety: null,
          valuationStatus: 'NOT_AVAILABLE',
          valuationStatusLabel: 'Valuation unavailable — market data is stale',
          valuationMethod: 'Stale source data'
        }
      };
    }

    const deteriorationIndicators: string[] = [];
    if (isAvailable('Debt-to-Equity') && metrics.debtEquity > stockScoring.maxDebtEquity) {
      deteriorationIndicators.push(`Debt-to-equity exceeds configured preference (${metrics.debtEquity.toFixed(2)} > ${stockScoring.maxDebtEquity})`);
    }
    if (isAvailable('Promoter Pledge') && metrics.promoterPledge > 0) {
      deteriorationIndicators.push(`Promoter shares are pledged (${metrics.promoterPledge.toFixed(1)}%)`);
    }
    if (isAvailable('ROCE') && metrics.roce < stockScoring.minRoce) {
      deteriorationIndicators.push(`ROCE is below the configured preference (${metrics.roce.toFixed(1)}% < ${stockScoring.minRoce}%)`);
    }
    if (isAvailable('Free Cash Flow') && metrics.fcfCr < 0) {
      deteriorationIndicators.push(`Negative free cash flow (₹${metrics.fcfCr.toFixed(0)} Cr)`);
    }

    // 1. SELL / REDUCE CANDIDATE CONDITIONS
    const sellRule = equity.midSmallCapSellTrigger;
    if (
      sellRule.enabled &&
      isPortfolioHolding &&
      holdingPnlPercent !== undefined &&
      holdingPnlPercent >= sellRule.minPercent &&
      (marketCap === 'MID_CAP' || marketCap === 'SMALL_CAP')
    ) {
      return {
        classification: 'SELL_REDUCE',
        classificationReason: `Portfolio Rule: Mid/Small-cap profit review threshold reached (+${holdingPnlPercent.toFixed(1)}%; configured trigger ${sellRule.minPercent}–${sellRule.maxPercent}%). Consider partial profit-taking after manual review.`,
        sellSignal: `Profit Booking Trigger (+${holdingPnlPercent.toFixed(1)}%)`,
        deteriorationIndicators: deteriorationIndicators.length > 0 ? deteriorationIndicators : undefined,
        riskLevel,
        valuation
      };
    }

    if (deteriorationIndicators.length >= 2 && score < stockScoring.minimumCandidateScore) {
      return {
        classification: 'SELL_REDUCE',
        classificationReason: isPortfolioHolding
          ? `Review the existing holding: multiple available fundamentals are below configured preferences and the quality score is below ${stockScoring.minimumCandidateScore}. This is not an instruction to trade.`
          : `Do not initiate a position without review: multiple available fundamentals are below configured preferences and the quality score is below ${stockScoring.minimumCandidateScore}. No portfolio holding is inferred.`,
        sellSignal: 'Fundamental Deterioration Review',
        deteriorationIndicators,
        riskLevel,
        valuation
      };
    }
    const minCandidateScore = Math.max(80, stockScoring.minimumCandidateScore);
    const valuationAttractive = mos !== null && mos >= 0;
    const checks = [
      { name: 'minimum quality score', passed: score >= minCandidateScore },
      { name: 'attractive supported valuation', passed: valuationAttractive },
      { name: 'ROE preference', passed: metrics.roe >= stockScoring.minRoe },
      { name: 'ROCE preference', passed: metrics.roce >= stockScoring.minRoce },
      { name: 'debt-to-equity preference', passed: metrics.debtEquity <= stockScoring.maxDebtEquity },
      { name: 'interest coverage', passed: metrics.interestCoverage >= 4 },
      { name: 'sales growth preference', passed: metrics.salesCagr5Y >= stockScoring.minSalesCagr5Y },
      { name: 'profit growth preference', passed: metrics.profitCagr5Y >= stockScoring.minProfitCagr5Y },
      { name: 'positive free cash flow', passed: metrics.fcfCr > 0 },
      { name: 'zero promoter pledge', passed: metrics.promoterPledge === 0 },
      { name: 'all Priority 10 checks', passed: analysis.priority10Checks.every(check => check.passed) },
      { name: 'manageable AI risk', passed: analysis.aiRisk !== 'VULNERABLE' },
      { name: 'non-micro-cap risk', passed: marketCap !== 'MICRO_CAP' }
    ];
    const failedBuyChecks = checks.filter(check => !check.passed).map(check => check.name);

    if (requiredData.length === 0 && failedBuyChecks.length === 0) {
      return {
        classification: 'BUY',
        classificationReason: `Meets the existing ${minCandidateScore}-point quality hurdle, configured financial preferences, Priority 10 requirements, and is at or below the supported industry-relative P/E reference (margin of safety ${mos}%).`,
        riskLevel,
        valuation
      };
    }

    const holdReason = requiredData.length > 0
      ? `Analysis incomplete: ${requiredData.join(', ')} unavailable. Buy eligibility is not established.`
      : `Not currently eligible to buy: ${failedBuyChecks.join(', ')}. Continue monitoring and review the underlying checks.`;

    return {
      classification: 'HOLD_WATCH',
      classificationReason: holdReason,
      riskLevel,
      valuation
    };
  }

  /**
   * Run opportunities analysis on the existing watchlist
   */
  public static analyzeWatchlist(
    watchlistItems: WatchlistRecord[],
    activeHoldings: Holding[] = [],
    _forceRefresh = false,
    marketSnapshots?: Map<string, StockMetricsSnapshot>
  ): OpportunitiesAnalysisResult {
    const buyCandidates: OpportunityItem[] = [];
    const holdCandidates: OpportunityItem[] = [];
    const sellCandidates: OpportunityItem[] = [];
    const allOpportunities: OpportunityItem[] = [];

    let incompleteCount = 0;

    for (const item of watchlistItems) {
      const symbolUpper = item.symbol.toUpperCase().trim();

      const sourceSnapshot = marketSnapshots?.get(symbolUpper);
      const price = sourceSnapshot?.price ?? (marketSnapshots ? 0 : item.price ?? 0);
      const marketCapCr = sourceSnapshot?.marketCapCr ?? 0;
      const pe = sourceSnapshot?.pe ?? (marketSnapshots ? 0 : item.pe ?? 0);
      const roce = sourceSnapshot?.roce ?? (marketSnapshots ? 0 : item.roce ?? 0);
      const roe = sourceSnapshot?.roe ?? (marketSnapshots ? 0 : item.roe ?? 0);
      const debtEquity = sourceSnapshot?.debtEquity ?? (marketSnapshots ? 0 : item.debtEquity ?? 0);
      const salesCagr5Y = sourceSnapshot?.salesCagr5Y ?? 0;
      const profitCagr5Y = sourceSnapshot?.profitCagr5Y ?? 0;
      const metrics: StockMetricsSnapshot = sourceSnapshot || {
        id: `STK-${symbolUpper}`,
        symbol: symbolUpper,
        name: item.name || symbolUpper,
        sector: 'Unclassified',
        industry: 'Unclassified',
        marketCapCategory: 'MID_CAP',
        snapshotDate: item.addedAt,
        sourceUrl: '',
        price,
        marketCapCr,
        pe,
        industryPe: 0,
        pb: 0,
        roe,
        roce,
        roceConsistencyYears: 0,
        opm: 0,
        salesCagr5Y,
        profitCagr5Y,
        debtEquity,
        interestCoverage: 0,
        fcfCr: 0,
        fcfPositiveYears: 0,
        cfoCr: 0,
        patCr: 0,
        promoterHolding: 0,
        promoterPledge: 0,
        unavailableMetrics: [
          'Market data retrieval failed',
          'Industry P/E',
          '5Y Sales Growth',
          '5Y Profit Growth',
          'EPS Growth',
          'ROCE Consistency',
          'Operating Margin',
          'Interest Coverage',
          'Free Cash Flow',
          'FCF History',
          'Operating Cash Flow',
          'Profit After Tax',
          'Promoter Holding',
          'Promoter Pledge',
          '200-DMA trend',
          ...(price > 0 ? [] : ['Live Market Price']),
          ...(marketCapCr > 0 ? [] : ['Market Capitalization']),
          ...(pe > 0 ? [] : ['P/E Ratio']),
          ...(roe !== 0 || item.roe !== undefined ? [] : ['ROE']),
          ...(roce !== 0 || item.roce !== undefined ? [] : ['ROCE']),
          ...(item.debtEquity !== undefined ? [] : ['Debt-to-Equity'])
        ]
      };

      // Check missing data
      const missingData: string[] = [...(metrics.unavailableMetrics || [])];
      const markMissing = (field: string, unavailable: boolean) => {
        if (unavailable && !missingData.includes(field)) missingData.push(field);
      };
      markMissing('Live Market Price', price <= 0);
      markMissing('Market Capitalization', marketCapCr <= 0);
      markMissing('P/E Ratio', pe <= 0);
      markMissing('Industry P/E', !metrics.industryPe || metrics.industryPe <= 0);
      markMissing('Debt-to-Equity', debtEquity < 0);
      const snapshotTime = Date.parse(metrics.snapshotDate);
      const isStale = !Number.isFinite(snapshotTime) || Date.now() - snapshotTime > 48 * 60 * 60 * 1000;
      markMissing('Stale market data', isStale);
      // Evaluate 100-point scoring
      const analysis = StockScoringEngine.analyzeStock(metrics);
      const hasEssentialDataGap = missingData.includes('Market data retrieval failed') ||
        missingData.includes('Stale market data') ||
        price <= 0 ||
        marketCapCr <= 0 ||
        analysis.priority10Checks.some(check => check.value === 'N/A');
      if (hasEssentialDataGap) incompleteCount++;
      const finalScore = analysis.totalScore;

      // Quality tier
      let qualityTier: QualityTier;
      if (finalScore >= 90) qualityTier = 'CATEGORY_A';
      else if (finalScore >= 85) qualityTier = 'CATEGORY_B';
      else if (finalScore >= 80) qualityTier = 'CATEGORY_C';
      else qualityTier = 'BELOW_80';

      // Market-Cap categorization
      const marketCapCategory = this.determineMarketCapCategory(
        marketCapCr,
        marketCapCr > 0 ? undefined : item.marketCapCategory
      );

      // Check if held in portfolio
      const holding = activeHoldings.find(h => h.symbol.toUpperCase() === symbolUpper);
      const isPortfolioHolding = !!holding;
      const holdingPnlPercent = holding ? holding.pnlPercent : undefined;

      // Classify
      const classificationResult = this.classifyOpportunity(
        metrics,
        analysis,
        marketCapCategory,
        isPortfolioHolding,
        holdingPnlPercent
      );
      const uniqueFailedChecks = Array.from(new Set(analysis.failedChecks));
      const uniquePassedChecks = Array.from(new Set(analysis.passedChecks));

      const exchange: 'NSE' | 'BSE' | 'NSE/BSE' = 'NSE/BSE';
      const low52 = metrics.nseQuote?.low52 || metrics.bseQuote?.low52 || 0;
      const hasSupportedEntryRange = metrics.price > 0 && (
        analysis.totalScore >= 75
          ? metrics.priceAboveDma200 === true
            ? (metrics.dma200 || 0) > 0
            : metrics.priceAboveDma200 === false && low52 > 0
          : low52 > 0
      );

      const oppItem: OpportunityItem = {
        symbol: symbolUpper,
        name: metrics.name,
        exchange,
        sector: metrics.sector || 'Diversified',
        industry: metrics.industry,
        marketCapCategory,
        marketCapCr,
        price: metrics.price,
        score: finalScore,
        qualityTier,
        suitability: analysis.suitability,

        valuationStatus: classificationResult.valuation.valuationStatus,
        valuationStatusLabel: classificationResult.valuation.valuationStatusLabel,
        estimatedFairValue: classificationResult.valuation.estimatedFairValue,
        marginOfSafety: classificationResult.valuation.marginOfSafety,
        valuationMethod: classificationResult.valuation.valuationMethod,
        pe: metrics.pe,
        industryPe: metrics.industryPe ?? 0,
        pb: metrics.pb ?? 0,
        peg: metrics.peg ?? 0,

        roe: metrics.roe,
        roce: metrics.roce,
        debtEquity: metrics.debtEquity,
        interestCoverage: metrics.interestCoverage,
        salesCagr5Y: metrics.salesCagr5Y,
        profitCagr5Y: metrics.profitCagr5Y,
        epsCagr5Y: metrics.epsCagr5Y ?? 0,
        dividendYield: metrics.dividendYield || 0,
        fcfCr: metrics.fcfCr,

        entryPriceMin: hasSupportedEntryRange ? analysis.priceTargetRange?.buyRangeMin ?? 0 : 0,
        entryPriceMax: hasSupportedEntryRange ? analysis.priceTargetRange?.buyRangeMax ?? 0 : 0,
        buyStatusLabel: hasSupportedEntryRange
          ? analysis.priceTargetRange?.buyStatusLabel || 'Not available'
          : 'Not available — required technical price data is missing',
        sellTarget1: analysis.priceTargetRange?.sellRangeMin ?? 0,
        sellTarget2: analysis.priceTargetRange?.sellRangeMax ?? 0,

        riskLevel: classificationResult.riskLevel,
        failedChecks: uniqueFailedChecks,
        passedChecks: uniquePassedChecks,
        missingData,

        classification: classificationResult.classification,
        classificationReason: classificationResult.classificationReason,

        isPortfolioHolding,
        holdingPnlPercent,
        sellSignal: classificationResult.sellSignal,
        deteriorationIndicators: classificationResult.deteriorationIndicators,

        dataFreshness: isStale ? 'STALE' : missingData.length > 0 ? 'FALLBACK' : 'RECENT',
        lastUpdated: sourceSnapshot?.snapshotDate || item.addedAt || new Date().toISOString(),
        analysisDate: new Date().toISOString()
      };

      allOpportunities.push(oppItem);

      if (oppItem.classification === 'BUY') {
        buyCandidates.push(oppItem);
      } else if (oppItem.classification === 'SELL_REDUCE') {
        sellCandidates.push(oppItem);
      } else {
        holdCandidates.push(oppItem);
      }
    }

    // Default sorting for buy candidates: Most Undervalued First (Highest Margin of Safety)
    buyCandidates.sort((a, b) => (b.marginOfSafety ?? -999) - (a.marginOfSafety ?? -999));
    holdCandidates.sort((a, b) => b.score - a.score);
    sellCandidates.sort((a, b) => (b.isPortfolioHolding ? 1 : 0) - (a.isPortfolioHolding ? 1 : 0));

    const summary: OpportunitySummary = {
      totalWatchlist: watchlistItems.length,
      analyzedCount: allOpportunities.length - incompleteCount,
      buyCandidatesCount: buyCandidates.length,
      holdCandidatesCount: holdCandidates.length,
      sellCandidatesCount: sellCandidates.length,
      incompleteCount,
      lastAnalysisTimestamp: new Date().toISOString()
    };

    const result: OpportunitiesAnalysisResult = {
      summary,
      buyCandidates,
      holdCandidates,
      sellCandidates,
      allOpportunities,
      generatedAt: new Date().toISOString()
    };

    // Record audit trail entry
    auditTrail.record(
      'OPPORTUNITIES_ANALYSIS_RUN',
      'WATCHLIST',
      `${allOpportunities.length} watchlist stocks analyzed`,
      {
        total: watchlistItems.length,
        buys: buyCandidates.length,
        holds: holdCandidates.length,
        sells: sellCandidates.length,
        topBuyCandidate: buyCandidates[0]?.symbol || 'None'
      },
      buyCandidates[0]?.score,
      'PASS'
    );

    return result;
  }

  /**
   * Filter and Sort Opportunities
   */
  public static filterAndSort(
    items: OpportunityItem[],
    filters: OpportunityFilterCriteria = {},
    sortOption: string = 'cheapest_fair_value'
  ): OpportunityItem[] {
    let result = [...items];

    // Market-Cap Filter
    if (filters.marketCap && filters.marketCap !== 'ALL') {
      result = result.filter(i => i.marketCapCategory === filters.marketCap);
    }

    // Exchange Filter
    if (filters.exchange && filters.exchange !== 'ALL') {
      result = result.filter(i => i.exchange.includes(filters.exchange!));
    }

    // Sector Filter
    if (filters.sector && filters.sector !== 'ALL') {
      result = result.filter(i => i.sector.toLowerCase().includes(filters.sector!.toLowerCase()));
    }

    // Min Score
    if (filters.minScore !== undefined && filters.minScore > 0) {
      result = result.filter(i => i.score >= filters.minScore!);
    }

    // Max PE
    if (filters.maxPe !== undefined && filters.maxPe > 0) {
      result = result.filter(i => i.pe > 0 && i.pe <= filters.maxPe!);
    }

    // Max PB
    if (filters.maxPb !== undefined && filters.maxPb > 0) {
      result = result.filter(i => i.pb > 0 && i.pb <= filters.maxPb!);
    }

    // Min ROCE
    if (filters.minRoce !== undefined && filters.minRoce > 0) {
      result = result.filter(i => i.roce >= filters.minRoce!);
    }

    // Min Sales Growth
    if (filters.minSalesGrowth !== undefined && filters.minSalesGrowth > 0) {
      result = result.filter(i => i.salesCagr5Y >= filters.minSalesGrowth!);
    }

    // Min Profit Growth
    if (filters.minProfitGrowth !== undefined && filters.minProfitGrowth > 0) {
      result = result.filter(i => i.profitCagr5Y >= filters.minProfitGrowth!);
    }

    // Max Debt-to-Equity
    if (filters.maxDebtEquity !== undefined && filters.maxDebtEquity >= 0) {
      result = result.filter(i => i.debtEquity <= filters.maxDebtEquity!);
    }

    // Min Margin of Safety
    if (filters.minMarginOfSafety !== undefined) {
      result = result.filter(i => i.marginOfSafety !== null && i.marginOfSafety >= filters.minMarginOfSafety!);
    }

    // Valuation Status Filter
    if (filters.valuationStatus && filters.valuationStatus !== 'ALL') {
      result = result.filter(i => i.valuationStatus === filters.valuationStatus);
    }

    // Risk Level Filter
    if (filters.riskLevel && filters.riskLevel !== 'ALL') {
      result = result.filter(i => i.riskLevel === filters.riskLevel);
    }

    // Signal Filter
    if (filters.signal && filters.signal !== 'ALL') {
      result = result.filter(i => i.classification === filters.signal);
    }

    // Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      result = result.filter(i => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }

    // Sort Options
    switch (sortOption) {
      case 'cheapest_fair_value':
      case 'highest_margin_of_safety':
        // Most Undervalued First (highest margin of safety)
        result.sort((a, b) => (b.marginOfSafety ?? -999) - (a.marginOfSafety ?? -999));
        break;

      case 'lowest_pe':
        result.sort((a, b) => (a.pe > 0 ? a.pe : 9999) - (b.pe > 0 ? b.pe : 9999));
        break;

      case 'lowest_pb':
        result.sort((a, b) => (a.pb > 0 ? a.pb : 9999) - (b.pb > 0 ? b.pb : 9999));
        break;

      case 'highest_score':
        result.sort((a, b) => b.score - a.score);
        break;

      case 'highest_earnings_growth':
        result.sort((a, b) => b.profitCagr5Y - a.profitCagr5Y);
        break;

      case 'highest_roce':
        result.sort((a, b) => b.roce - a.roce);
        break;

      case 'lowest_debt_equity':
        result.sort((a, b) => a.debtEquity - b.debtEquity);
        break;

      case 'lowest_price':
        result.sort((a, b) => a.price - b.price);
        break;

      case 'lowest_risk': {
        const riskRank = { 'LOW': 1, 'MODERATE': 2, 'HIGH': 3 };
        result.sort((a, b) => {
          const diff = riskRank[a.riskLevel] - riskRank[b.riskLevel];
          return diff !== 0 ? diff : b.score - a.score;
        });
        break;
      }

      default:
        result.sort((a, b) => (b.marginOfSafety ?? -999) - (a.marginOfSafety ?? -999));
        break;
    }

    return result;
  }
}
