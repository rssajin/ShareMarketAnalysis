// Domain Types matching docs/DATA_MODEL.md, docs/INVESTMENT_RULES.md, docs/STOCK_ANALYSIS.md

export type AssetClass = 'EQUITY' | 'MUTUAL_FUND' | 'ETF_GOLD_SILVER' | 'DEBT';

export type MarketCapCategory = 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP' | 'MICRO_CAP' | 'ETF_GOLD_SILVER';

export type MutualFundCategory = 
  | 'NIFTY_INDEX' 
  | 'MULTI_CAP' 
  | 'MID_SMALL_CAP' 
  | 'DEBT_MONEY_MARKET';

export type RuleStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_ENOUGH_DATA';

export type AiRiskClassification = 'BENEFICIARY' | 'NEUTRAL' | 'VULNERABLE';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Instrument {
  id: string;
  symbol: string;
  exchange: string;
  isin?: string;
  name: string;
  instrumentType: AssetClass;
  sector?: string;
  industry?: string;
  marketCapCategory?: MarketCapCategory;
}

export interface ProductSegment {
  name: string;          // Product or service name
  revenuePercent: number; // % of total revenue
  description?: string;  // Short description of the segment
  trend?: 'GROWING' | 'STABLE' | 'DECLINING';
}

export interface ExchangeQuote {
  exchange: 'NSE' | 'BSE';
  symbol: string;
  scripCode?: string;         // BSE 6-digit scrip code (e.g. 532540)
  previousClose: number;      // Official previous trading day close (₹)
  closePrice: number;         // Last traded / previous date close price (₹)
  openPrice?: number;         // Open price of trading session (₹)
  dayHigh?: number;           // Day's high (₹)
  dayLow?: number;            // Day's low (₹)
  change?: number;            // Net change (₹)
  changePercent?: number;     // Net change %
  high52?: number;            // 52-week High (₹)
  low52?: number;             // 52-week Low (₹)
  volume?: number;            // Traded volume (shares)
  tradingDate?: string;       // Date of previous trading session
  dataTimestamp?: string;     // ISO timestamp
  status?: string;            // 'LIVE' | 'PREV_DAY' | 'FALLBACK'
}

export interface StockMetricsSnapshot {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCapCategory: MarketCapCategory;
  snapshotDate: string; // ISO format
  sourceUrl: string;
  price: number;
  marketCapCr: number;
  pe: number;
  industryPe?: number;
  pb?: number;
  peg?: number;
  evEbitda?: number;
  roe: number;          // %
  roce: number;         // %
  roceConsistencyYears: number; // consecutive positive/stable years
  opm: number;           // Operating profit margin %
  salesCagr5Y: number;   // %
  profitCagr5Y: number;  // %
  epsCagr5Y?: number;    // %
  quarterlySalesGrowth?: number; // %
  quarterlyProfitGrowth?: number; // %
  debtEquity: number;
  interestCoverage: number;
  fcfCr: number;         // Free Cash Flow in Cr
  fcfPositiveYears: number; // out of 5 years
  cfoCr: number;         // Cash Flow from Operations
  patCr: number;         // Profit After Tax
  promoterHolding: number; // %
  promoterPledge: number;  // %
  dma200?: number;
  priceAboveDma200?: boolean;
  relativeStrengthRank?: number; // 0 - 100
  volume20DayAvg?: number;
  dividendYield?: number;        // %
  dividendPayout?: number;       // %
  dividendPerShare?: number;     // ₹
  return5Y?: number;             // 5-Year Stock Price Return CAGR %
  return3Y?: number;             // 3-Year Stock Price Return CAGR %
  return1Y?: number;             // 1-Year Stock Price Return %
  productsAndServices?: ProductSegment[]; // Revenue breakdown by product/service
  nseQuote?: ExchangeQuote;      // Official NSE Previous Date Quote
  bseQuote?: ExchangeQuote;      // Official BSE Previous Date Quote
  previousClose?: number;        // Primary exchange previous close (₹)
  previousCloseDate?: string;    // Date of previous trading day
  dataSources?: string[];        // Sources used (e.g. NSE, BSE, Screener.in, Yahoo Finance)
  unavailableMetrics?: string[];
}

export interface DimensionScore {
  score: number;
  maxScore: number;
  details: string;
}

export interface CheckItem {
  name: string;
  passed: boolean;
  value: string;
  threshold: string;
  comment: string;
  score?: number;      // Points awarded in 100-point framework (e.g. 0-10)
  maxScore?: number;   // Max points for this check (10)
  weight?: number;     // Weight in 100-point framework (10)
  dimension?: string;  // Related dimension (e.g. Growth, Profitability, etc.)
}

export interface StockPriceTargetRange {
  buyRangeMin: number;
  buyRangeMax: number;
  buyStatus: 'IN_BUY_ZONE' | 'DEEP_VALUE' | 'WAIT_FOR_PULLBACK';
  buyStatusLabel: string;
  buyStrategy: string;
  sellRangeMin: number;
  sellRangeMax: number;
  sellStatus: 'IN_SELL_ZONE' | 'UPSIDE_AHEAD' | 'OVERVALUED_EXTREME';
  sellStatusLabel: string;
  sellStrategy: string;
  target1: number;
  target2: number;
  stopLoss: number;
  supportLevel: number;
  resistanceLevel: number;
  upsidePercentMin: number;
  upsidePercentMax: number;
}

export interface StockAnalysis {
  id: string;
  symbol: string;
  name: string;
  analysisDate: string;
  metrics: StockMetricsSnapshot;
  
  // 100-point score dimensions
  businessQualityScore: DimensionScore;   // max 20
  growthScore: DimensionScore;            // max 20
  profitabilityScore: DimensionScore;     // max 15
  financialStrengthScore: DimensionScore; // max 15
  cashFlowScore: DimensionScore;          // max 10
  valuationScore: DimensionScore;         // max 10
  managementScore: DimensionScore;        // max 5
  moatScore: DimensionScore;              // max 5
  totalScore: number;                     // 0 - 100
  priority10Score?: number;               // 0 - 100 points calculated directly from Priority 10 Investment Checks

  // Price Range Recommendation (Better to Buy & Sell)
  priceTargetRange?: StockPriceTargetRange;

  // Qualitative & AI
  aiRisk: AiRiskClassification;
  aiConfidence: number;                   // 0.0 - 1.0
  aiReasoning: string;
  
  // Checks & Recommendations
  priority10Checks: CheckItem[];
  passedChecks: string[];
  failedChecks: string[];
  warnings: string[];
  suitability: 'EXCELLENT' | 'GOOD' | 'RESEARCH_REQUIRED' | 'AVOID';
  investmentAttractivenessIndex: number;  // normalized index
  thesis: string;
  keyRisks: string[];
  dataAsOf: string;
}

export interface MutualFund {
  id: string;
  schemeCode: string;
  name: string;
  fundHouse: string;
  category: MutualFundCategory;
  subCategory?: string;
  benchmark: string;
  expenseRatio: number;
  exitLoad: string;
  currentNav: number;
  navDate: string;
  aumCr?: number;
  returns1Y?: number;
  returns3Y?: number;
  returns5Y?: number;
  sharpeRatio?: number;
  standardDeviation?: number;
}

export interface MutualFundAnalysis {
  fund: MutualFund;
  analysisDate: string;
  categorySuitability: RuleStatus;
  expenseScore: number;      // out of 25
  performanceScore: number;  // out of 35
  riskScore: number;         // out of 25
  consistencyScore: number;  // out of 15
  totalScore: number;        // out of 100
  keyReasons: string[];
  failedChecks: string[];
  dataAsOf: string;
}

export interface Holding {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  marketCapCategory: MarketCapCategory;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  investedValue: number;
  pnl: number;
  pnlPercent: number;
  allocationPercent: number;
  targetPercent: number;
}

export interface PortfolioRuleResult {
  ruleCode: string;
  ruleName: string;
  status: RuleStatus;
  actualValue: number | string;
  targetValue: number | string;
  variance: number;
  explanation: string;
  suggestedAction: string;
  evaluatedAt: string;
}

export interface PortfolioAnalysis {
  portfolioId: string;
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  
  // Allocations
  equityAllocation: {
    largeCap: { actual: number; target: number; variance: number; status: RuleStatus; value: number };
    midCap: { actual: number; target: number; variance: number; status: RuleStatus; value: number };
    smallCap: { actual: number; target: number; variance: number; status: RuleStatus; value: number };
    goldSilverEtf: { actual: number; target: number; variance: number; status: RuleStatus; value: number };
  };
  
  complianceScore: number; // 0 - 100%
  ruleResults: PortfolioRuleResult[];
  alerts: Alert[];
  midSmallCapSellTriggers: {
    holding: Holding;
    pnlPercent: number;
    thresholdRange: string;
    suggestion: string;
  }[];
  evaluatedAt: string;
}

export interface Alert {
  id: string;
  portfolioId?: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  suggestedAction?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  operation: string;
  sourceUrl: string;
  targetSymbolOrCode: string;
  rawMetricsSnapshot: any;
  calculatedScore?: number;
  ruleStatus?: RuleStatus;
}

export interface InvestmentConfig {
  equity: {
    targetAllocation: {
      largeCap: number; // 0.40
      midCap: number;   // 0.30
      smallCap: number; // 0.20
      goldSilverEtf: number; // 0.10
    };
    toleranceBandPercent: number; // e.g. 5%
    midSmallCapSellTrigger: {
      enabled: boolean;
      minPercent: number; // 10%
      maxPercent: number; // 15%
    };
  };
  mutualFunds: {
    maxSchemes: number; // 4
    targetAllocation: {
      niftyIndex: number;     // 0.30
      multiCap: number;       // 0.30
      midSmallCap: number;    // 0.30
      debtMoneyMarket: number;// 0.10
    };
    horizonYears: number;     // 15
  };
  stockScoring: {
    minimumCandidateScore: number; // 70
    minRoe: number;                // 15%
    minRoce: number;               // 15%
    maxDebtEquity: number;         // 0.5
    minSalesCagr5Y: number;        // 10%
    minProfitCagr5Y: number;       // 12%
  };
}

export type QualityTier = 'CATEGORY_A' | 'CATEGORY_B' | 'CATEGORY_C' | 'BELOW_80';

export type IndexTag =
  // NSE Large-Cap Indexes
  | 'NIFTY50'        // Top 50 large-caps
  | 'NIFTY_NEXT_50'  // Rank 51–100 large-caps
  | 'NIFTY100'       // Top 100 (NIFTY50 + NIFTY_NEXT_50)
  | 'NIFTY200'       // Top 200 (Large + upper Mid)
  // NSE Mid-Cap Indexes
  | 'NIFTY_MIDCAP_50'     // Top 50 mid-caps
  | 'NIFTY_MIDCAP_100'    // Top 100 mid-caps
  | 'NIFTY_MIDCAP_150'    // Top 150 mid-caps
  | 'NIFTY_MIDCAP_SELECT' // Quality mid-cap selection
  // NSE Small-Cap Indexes
  | 'NIFTY_SMALLCAP_50'   // Top 50 small-caps
  | 'NIFTY_SMALLCAP_100'  // Top 100 small-caps
  | 'NIFTY_SMALLCAP_250'  // Top 250 small-caps
  // NSE Broad Market
  | 'NIFTY500'            // Top 500 (Large + Mid + Small)
  | 'NIFTY_LARGEMIDCAP_250' // Combined Large + Mid 250
  // BSE Indexes
  | 'BSE100'        // BSE top 100 large-caps
  | 'BSE200'        // BSE top 200 (Large + upper Mid)
  | 'BSE500'        // BSE top 500 broad market
  | 'BSE_LARGECAP'  // BSE Large-cap segment
  | 'BSE_MIDCAP'    // BSE Mid-cap segment
  | 'BSE_SMALLCAP'; // BSE Small-cap segment

export interface ScreenerStockItem {
  symbol: string;
  name: string;
  marketCapCategory: MarketCapCategory;
  indices: IndexTag[];
  score: number;
  qualityTier: QualityTier;
  price: number;
  pe: number;
  roce: number;
  roe: number;
  salesCagr5Y: number;
  profitCagr5Y: number;
  debtEquity: number;
  aiRisk: AiRiskClassification;
  suitability: string;
  passedChecksCount: number;
  failedChecksCount: number;
  analysis: StockAnalysis;
}

export interface ScreenerSummary {
  totalScreened: number;
  categoryA: number; // 90+
  categoryB: number; // 85-90
  categoryC: number; // 80-85
  below80: number;
  byMarketCap: {
    largeCap: { total: number; categoryA: number; categoryB: number; categoryC: number };
    midCap: { total: number; categoryA: number; categoryB: number; categoryC: number };
    smallCap: { total: number; categoryA: number; categoryB: number; categoryC: number };
  };
}

export type OpportunityClassification = 'BUY' | 'HOLD_WATCH' | 'SELL_REDUCE';

export type ExtendedMarketCapCategory = 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP' | 'MICRO_CAP' | 'UNCLASSIFIED';

export type ValuationStatusType = 
  | 'DEEPLY_UNDERVALUED' 
  | 'UNDERVALUED' 
  | 'FAIR_VALUE' 
  | 'OVERVALUED' 
  | 'EXTREMELY_OVERVALUED'
  | 'NOT_AVAILABLE';

export interface OpportunityItem {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'NSE/BSE';
  sector: string;
  industry?: string;
  marketCapCategory: ExtendedMarketCapCategory;
  marketCapCr: number;
  price: number;
  score: number;
  qualityTier: QualityTier;
  suitability: string;
  
  // Valuation metrics
  valuationStatus: ValuationStatusType;
  valuationStatusLabel: string;
  estimatedFairValue: number | null;
  marginOfSafety: number | null; // % (positive = discount/margin of safety, negative = premium)
  valuationMethod: string;
  pe: number;
  industryPe: number;
  pb: number;
  peg: number;
  
  // Fundamentals
  roe: number;
  roce: number;
  debtEquity: number;
  interestCoverage: number;
  salesCagr5Y: number;
  profitCagr5Y: number;
  epsCagr5Y: number;
  dividendYield: number;
  fcfCr: number;
  
  // Entry & Target ranges
  entryPriceMin: number;
  entryPriceMax: number;
  buyStatusLabel: string;
  sellTarget1: number;
  sellTarget2: number;
  
  // Risk & Flags
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  failedChecks: string[];
  passedChecks: string[];
  missingData: string[];
  
  // Classification
  classification: OpportunityClassification;
  classificationReason: string;
  
  // Ownership & Sell indicators
  isPortfolioHolding: boolean;
  holdingPnlPercent?: number;
  sellSignal?: string;
  deteriorationIndicators?: string[];
  
  // Timestamps & Freshness
  dataFreshness: 'VERIFIED' | 'RECENT' | 'STALE' | 'FALLBACK';
  lastUpdated: string;
  analysisDate: string;
}

export interface OpportunitySummary {
  totalWatchlist: number;
  analyzedCount: number;
  buyCandidatesCount: number;
  holdCandidatesCount: number;
  sellCandidatesCount: number;
  incompleteCount: number;
  lastAnalysisTimestamp: string;
}

export interface OpportunitiesAnalysisResult {
  summary: OpportunitySummary;
  buyCandidates: OpportunityItem[];
  holdCandidates: OpportunityItem[];
  sellCandidates: OpportunityItem[];
  allOpportunities: OpportunityItem[];
  generatedAt: string;
}
