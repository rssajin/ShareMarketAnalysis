import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { MarketDataService } from './adapters/marketDataService';
import { StockScoringEngine } from './engine/stockScoringEngine';
import { PortfolioRuleEngine } from './engine/portfolioRuleEngine';
import { MutualFundEngine, SelectedFundItem } from './engine/mutualFundEngine';
import { alertService } from './engine/alertEngine';
import { auditTrail } from './engine/auditTrail';
import { getInvestmentConfig, updateInvestmentConfig, resetInvestmentConfig } from './engine/config';
import { ScreenerEngine } from './engine/screenerEngine';
import { Holding, MarketCapCategory, QualityTier, IndexTag } from './domain/types';
import { initDatabase } from './engine/database';
import { WatchlistService } from './engine/watchlistService';
import { OpportunityEngine } from './engine/opportunityEngine';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const marketData = new MarketDataService();

// Initialize SQLite database (Step 3)
initDatabase();

// In-memory portfolio state for Step 1 (DB persistence in Step 3)
let activeHoldings: Holding[] = [
  {
    id: 'H-1',
    portfolioId: 'default-portfolio',
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    assetClass: 'EQUITY',
    marketCapCategory: 'LARGE_CAP',
    quantity: 50,
    averageCost: 3200,
    currentPrice: 2304,
    currentValue: 115200,
    investedValue: 160000,
    pnl: -44800,
    pnlPercent: -28.0,
    allocationPercent: 38.4,
    targetPercent: 40.0
  },
  {
    id: 'H-2',
    portfolioId: 'default-portfolio',
    symbol: 'POLYCAB',
    name: 'Polycab India Ltd',
    assetClass: 'EQUITY',
    marketCapCategory: 'MID_CAP',
    quantity: 15,
    averageCost: 5400,
    currentPrice: 6200,
    currentValue: 93000,
    investedValue: 81000,
    pnl: 12000,
    pnlPercent: 14.8, // Triggers 10-15% profit review!
    allocationPercent: 31.0,
    targetPercent: 30.0
  },
  {
    id: 'H-3',
    portfolioId: 'default-portfolio',
    symbol: 'KAYNES',
    name: 'Kaynes Technology India Ltd',
    assetClass: 'EQUITY',
    marketCapCategory: 'SMALL_CAP',
    quantity: 12,
    averageCost: 4600,
    currentPrice: 5180,
    currentValue: 62160,
    investedValue: 55200,
    pnl: 6960,
    pnlPercent: 12.6, // Triggers 10-15% profit review!
    allocationPercent: 20.7,
    targetPercent: 20.0
  },
  {
    id: 'H-4',
    portfolioId: 'default-portfolio',
    symbol: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    assetClass: 'ETF_GOLD_SILVER',
    marketCapCategory: 'ETF_GOLD_SILVER',
    quantity: 470,
    averageCost: 61.5,
    currentPrice: 63.2,
    currentValue: 29704,
    investedValue: 28905,
    pnl: 799,
    pnlPercent: 2.76,
    allocationPercent: 9.9,
    targetPercent: 10.0
  }
];

// In-memory selected mutual funds (4-Fund strategy)
let selectedMfPortfolio: SelectedFundItem[] = [
  {
    fund: {
      id: 'MF-120716',
      schemeCode: '120716',
      name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
      fundHouse: 'UTI Mutual Fund',
      category: 'NIFTY_INDEX',
      benchmark: 'Nifty 50 TRI',
      expenseRatio: 0.20,
      exitLoad: 'Nil',
      currentNav: 178.4,
      navDate: '2026-09-04',
      returns1Y: 17.2,
      returns3Y: 15.8,
      returns5Y: 16.9,
      sharpeRatio: 1.15
    },
    monthlySipAmount: 15000,
    sipStartDate: '2025-01-01'
  },
  {
    fund: {
      id: 'MF-122639',
      schemeCode: '122639',
      name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
      fundHouse: 'PPFAS Mutual Fund',
      category: 'MULTI_CAP',
      benchmark: 'Nifty 500 TRI',
      expenseRatio: 0.65,
      exitLoad: '1% within 365 days',
      currentNav: 90.63,
      navDate: '2026-09-04',
      returns1Y: 19.8,
      returns3Y: 18.2,
      returns5Y: 21.4,
      sharpeRatio: 1.48
    },
    monthlySipAmount: 15000,
    sipStartDate: '2025-01-01'
  },
  {
    fund: {
      id: 'MF-127042',
      schemeCode: '127042',
      name: 'Motilal Oswal Midcap Fund - Direct Plan - Growth',
      fundHouse: 'Motilal Oswal Mutual Fund',
      category: 'MID_SMALL_CAP',
      benchmark: 'Nifty Midcap 150 TRI',
      expenseRatio: 0.68,
      exitLoad: '1% within 365 days',
      currentNav: 112.5,
      navDate: '2026-09-04',
      returns1Y: 27.4,
      returns3Y: 25.1,
      returns5Y: 26.8,
      sharpeRatio: 1.38
    },
    monthlySipAmount: 15000,
    sipStartDate: '2025-01-01'
  },
  {
    fund: {
      id: 'MF-119062',
      schemeCode: '119062',
      name: 'ICICI Prudential Money Market Fund - Direct Plan - Growth',
      fundHouse: 'ICICI Prudential Mutual Fund',
      category: 'DEBT_MONEY_MARKET',
      benchmark: 'Crisil 1 Yr T-Bill Index',
      expenseRatio: 0.22,
      exitLoad: 'Nil',
      currentNav: 362.4,
      navDate: '2026-09-04',
      returns1Y: 7.4,
      returns3Y: 7.1,
      returns5Y: 6.9,
      sharpeRatio: 1.95
    },
    monthlySipAmount: 5000,
    sipStartDate: '2025-01-01'
  }
];

// --- PORTFOLIO ENDPOINTS ---

app.get('/api/v1/portfolios', (req: Request, res: Response) => {
  const analysis = PortfolioRuleEngine.evaluatePortfolio('default-portfolio', activeHoldings);
  alertService.syncPortfolioAlerts(analysis);
  res.json({
    data: [{
      id: 'default-portfolio',
      name: 'Primary Long-Term Wealth Portfolio',
      baseCurrency: 'INR',
      totalValue: analysis.totalValue,
      totalInvested: analysis.totalInvested,
      complianceScore: analysis.complianceScore,
      holdingsCount: activeHoldings.length,
      createdAt: '2025-01-01T00:00:00Z'
    }],
    dataAsOf: new Date().toISOString()
  });
});

app.get('/api/v1/portfolios/:id', (req: Request, res: Response) => {
  const analysis = PortfolioRuleEngine.evaluatePortfolio(req.params.id, activeHoldings);
  alertService.syncPortfolioAlerts(analysis);
  res.json({
    data: {
      id: req.params.id,
      name: 'Primary Long-Term Wealth Portfolio',
      baseCurrency: 'INR',
      analysis
    },
    dataAsOf: new Date().toISOString()
  });
});

app.get('/api/v1/portfolios/:id/holdings', (req: Request, res: Response) => {
  const analysis = PortfolioRuleEngine.evaluatePortfolio(req.params.id, activeHoldings);
  res.json({
    data: activeHoldings,
    totalValue: analysis.totalValue,
    dataAsOf: new Date().toISOString()
  });
});

app.post('/api/v1/portfolios/:id/holdings', async (req: Request, res: Response) => {
  const { symbol, quantity, averageCost, assetClass, marketCapCategory, name } = req.body;
  if (!symbol || !quantity || !averageCost) {
    return res.status(400).json({ error: 'symbol, quantity, and averageCost are required' });
  }

  // Fetch live price from web
  let livePrice = averageCost;
  let resolvedName = name || symbol;
  let resolvedCategory: MarketCapCategory = marketCapCategory || 'MID_CAP';

  try {
    const snap = await marketData.getStockMetrics(symbol);
    if (snap && snap.price > 0) {
      livePrice = snap.price;
      resolvedName = snap.name;
      resolvedCategory = snap.marketCapCategory;
    }
  } catch (e) {
    console.warn('Could not fetch live price for holding, using averageCost');
  }

  const existingIdx = activeHoldings.findIndex(h => h.symbol.toUpperCase() === symbol.toUpperCase());
  if (existingIdx >= 0) {
    activeHoldings[existingIdx].quantity += Number(quantity);
    activeHoldings[existingIdx].averageCost = Number(averageCost);
    activeHoldings[existingIdx].currentPrice = livePrice;
  } else {
    activeHoldings.push({
      id: `H-${Date.now()}`,
      portfolioId: req.params.id,
      symbol: symbol.toUpperCase(),
      name: resolvedName,
      assetClass: assetClass || (symbol.includes('BEES') || symbol.includes('ETF') ? 'ETF_GOLD_SILVER' : 'EQUITY'),
      marketCapCategory: resolvedCategory,
      quantity: Number(quantity),
      averageCost: Number(averageCost),
      currentPrice: livePrice,
      currentValue: livePrice * Number(quantity),
      investedValue: Number(averageCost) * Number(quantity),
      pnl: (livePrice - Number(averageCost)) * Number(quantity),
      pnlPercent: ((livePrice - Number(averageCost)) / Number(averageCost)) * 100,
      allocationPercent: 0,
      targetPercent: 0
    });
  }

  const analysis = PortfolioRuleEngine.evaluatePortfolio(req.params.id, activeHoldings);
  alertService.syncPortfolioAlerts(analysis);
  res.status(201).json({ data: activeHoldings, analysis });
});

app.delete('/api/v1/portfolios/:id/holdings/:symbol', (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  activeHoldings = activeHoldings.filter(h => h.symbol.toUpperCase() !== symbol);
  const analysis = PortfolioRuleEngine.evaluatePortfolio(req.params.id, activeHoldings);
  alertService.syncPortfolioAlerts(analysis);
  res.json({ data: activeHoldings, analysis });
});

app.get('/api/v1/portfolios/:id/analysis', (req: Request, res: Response) => {
  const analysis = PortfolioRuleEngine.evaluatePortfolio(req.params.id, activeHoldings);
  alertService.syncPortfolioAlerts(analysis);
  res.json({ data: analysis, dataAsOf: new Date().toISOString() });
});

app.get('/api/v1/portfolios/:id/rule-results', (req: Request, res: Response) => {
  const analysis = PortfolioRuleEngine.evaluatePortfolio(req.params.id, activeHoldings);
  res.json({ data: analysis.ruleResults, dataAsOf: new Date().toISOString() });
});

// --- STOCKS ENDPOINTS ---

app.get('/api/v1/stocks/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  if (!q.trim()) return res.json({ data: [] });
  try {
    const results = await marketData.searchStocks(q);
    res.json({ data: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/stocks/:symbol', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const snapshot = await marketData.getStockMetrics(symbol);
    res.json({ data: snapshot, dataAsOf: snapshot.snapshotDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/stocks/:symbol/exchanges', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const quotes = await marketData.getExchangeQuotes(symbol);
    res.json({
      symbol,
      nse: quotes.nse,
      bse: quotes.bse,
      dataAsOf: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/stocks/:symbol/analysis', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const snapshot = await marketData.getStockMetrics(symbol);
    const analysis = StockScoringEngine.analyzeStock(snapshot);
    alertService.evaluateStockAlerts(analysis);
    res.json({ data: analysis, dataAsOf: snapshot.snapshotDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/stocks/:symbol/competitors', async (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  // Competitor comparison based on sector
  try {
    const main = await marketData.getStockMetrics(symbol);
    let peers: string[] = [];
    if (main.sector?.toLowerCase().includes('information technology')) {
      peers = ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'LTIM'];
    } else if (main.sector?.toLowerCase().includes('finance') || main.sector?.toLowerCase().includes('bank')) {
      peers = ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'AXISBANK', 'SBIN'];
    } else if (main.sector?.toLowerCase().includes('auto')) {
      peers = ['TATAMOTORS', 'MARUTI', 'M&M', 'BAJAJ-AUTO'];
    } else {
      peers = ['RELIANCE', 'ITC', 'LT', 'TITAN'];
    }

    peers = peers.filter(p => p !== symbol).slice(0, 3);
    const peerSnapshots = await Promise.all(peers.map(p => marketData.getStockMetrics(p)));
    const peerAnalyses = peerSnapshots.map(s => StockScoringEngine.analyzeStock(s));

    res.json({
      data: {
        target: StockScoringEngine.analyzeStock(main),
        competitors: peerAnalyses
      },
      dataAsOf: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SCREENER ENDPOINTS (Quality Tiers A, B, C across Large, Mid, Small Cap) ---

app.get('/api/v1/screener/stocks', (req: Request, res: Response) => {
  const marketCap = req.query.marketCap ? String(req.query.marketCap) as MarketCapCategory : undefined;
  const category = req.query.category ? String(req.query.category) as QualityTier : undefined;
  const index = req.query.index ? String(req.query.index) as IndexTag : undefined;
  const search = req.query.q ? String(req.query.q) : undefined;

  const results = ScreenerEngine.filterStocks({
    marketCapCategory: marketCap,
    qualityTier: category,
    index,
    searchQuery: search
  });

  res.json({
    data: results,
    count: results.length,
    filters: { marketCap, category, index, search },
    dataAsOf: new Date().toISOString()
  });
});

app.get('/api/v1/screener/summary', (req: Request, res: Response) => {
  const summary = ScreenerEngine.getSummary();
  res.json({
    data: summary,
    dataAsOf: new Date().toISOString()
  });
});

app.post('/api/v1/screener/refresh', (req: Request, res: Response) => {
  const refreshed = ScreenerEngine.evaluateUniverse(true);
  res.json({
    success: true,
    count: refreshed.length,
    summary: ScreenerEngine.getSummary(),
    dataAsOf: new Date().toISOString()
  });
});

// Map of new extended indexes → market-cap categories they cover
// Used as a proxy since stock universe entries are only tagged with the 4 original indexes.
const INDEX_MARKET_CAP_MAP: Record<string, { caps: MarketCapCategory[]; nseOnly?: boolean; bseOnly?: boolean }> = {
  // NSE Large-Cap
  'NIFTY50':              { caps: ['LARGE_CAP'] },
  'NIFTY_NEXT_50':        { caps: ['LARGE_CAP'] },
  'NIFTY100':             { caps: ['LARGE_CAP'] },
  'NIFTY200':             { caps: ['LARGE_CAP', 'MID_CAP'] },
  // NSE Mid-Cap
  'NIFTY_MIDCAP_50':      { caps: ['MID_CAP'] },
  'NIFTY_MIDCAP_100':     { caps: ['MID_CAP'] },
  'NIFTY_MIDCAP_150':     { caps: ['MID_CAP'] },
  'NIFTY_MIDCAP_SELECT':  { caps: ['MID_CAP'] },
  // NSE Small-Cap
  'NIFTY_SMALLCAP_50':    { caps: ['SMALL_CAP'] },
  'NIFTY_SMALLCAP_100':   { caps: ['SMALL_CAP'] },
  'NIFTY_SMALLCAP_250':   { caps: ['SMALL_CAP'] },
  // NSE Broad
  'NIFTY500':             { caps: ['LARGE_CAP', 'MID_CAP', 'SMALL_CAP'] },
  'NIFTY_LARGEMIDCAP_250':{ caps: ['LARGE_CAP', 'MID_CAP'] },
  // BSE
  'BSE100':               { caps: ['LARGE_CAP'], bseOnly: true },
  'BSE200':               { caps: ['LARGE_CAP', 'MID_CAP'], bseOnly: true },
  'BSE500':               { caps: ['LARGE_CAP', 'MID_CAP', 'SMALL_CAP'], bseOnly: true },
  'BSE_LARGECAP':         { caps: ['LARGE_CAP'], bseOnly: true },
  'BSE_MIDCAP':           { caps: ['MID_CAP'], bseOnly: true },
  'BSE_SMALLCAP':         { caps: ['SMALL_CAP'], bseOnly: true },
};

// Original explicit index tags supported in stockUniverse (used for direct filter)
const EXPLICIT_INDEX_TAGS = new Set(['NIFTY50', 'NIFTY200', 'NIFTY500', 'BSE100']);

app.get('/api/v1/index-scanner/stocks', (req: Request, res: Response) => {
  const indexParam = req.query.index ? String(req.query.index) : 'ALL';
  const qualityTier = req.query.tier ? String(req.query.tier) as QualityTier : undefined;
  const minScore = req.query.minScore ? Number(req.query.minScore) : 80;
  const exchange = req.query.exchange ? String(req.query.exchange).toUpperCase() : 'ALL';
  const sector = req.query.sector ? String(req.query.sector) : 'ALL';
  const searchQuery = req.query.q ? String(req.query.q) : undefined;

  // For original 4 explicit index tags, use ScreenerEngine's built-in filter.
  // For new extended indexes, use market-cap as a proxy.
  let results = ScreenerEngine.filterStocks({
    qualityTier: qualityTier && qualityTier !== ('ALL' as any) ? qualityTier : undefined,
    searchQuery
  });

  // Filter by Index if not ALL
  if (indexParam !== 'ALL') {
    const matched = results.filter(s => s.indices.includes(indexParam as IndexTag));
    if (matched.length > 0) {
      results = matched;
    } else if (INDEX_MARKET_CAP_MAP[indexParam]) {
      const allowedCaps = INDEX_MARKET_CAP_MAP[indexParam].caps;
      results = results.filter(s => allowedCaps.includes(s.marketCapCategory));
    }
  }

  // Apply minimum score filter (default ≥ 80)
  results = results.filter(s => s.score >= minScore);

  // Apply sector filter
  if (sector !== 'ALL') {
    results = results.filter(s => {
      const stockSector = s.analysis?.metrics?.sector || '';
      return stockSector.toLowerCase().includes(sector.toLowerCase());
    });
  }

  // Apply exchange filter
  if (exchange === 'NSE') {
    results = results.filter(s => !indexParam.startsWith('BSE'));
  } else if (exchange === 'BSE') {
    results = results.filter(s => !indexParam.startsWith('NIFTY'));
  }

  // Compute summary counts
  const summary = {
    total: results.length,
    categoryA: results.filter(s => s.qualityTier === 'CATEGORY_A').length,
    categoryB: results.filter(s => s.qualityTier === 'CATEGORY_B').length,
    categoryC: results.filter(s => s.qualityTier === 'CATEGORY_C').length,
  };

  res.json({
    data: results,
    summary,
    count: results.length,
    filters: { index: indexParam, exchange, sector, minScore, tier: qualityTier, searchQuery },
    dataAsOf: new Date().toISOString()
  });
});

app.post('/api/v1/index-scanner/refresh', (req: Request, res: Response) => {
  const refreshed = ScreenerEngine.evaluateUniverse(true);
  res.json({
    success: true,
    count: refreshed.length,
    dataAsOf: new Date().toISOString()
  });
});

// --- MUTUAL FUNDS ENDPOINTS ---

app.get('/api/v1/mutual-funds/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  if (!q.trim()) return res.json({ data: [] });
  try {
    const results = await marketData.searchMutualFunds(q);
    res.json({ data: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/mutual-funds/portfolio/analysis', (req: Request, res: Response) => {
  const analysis = MutualFundEngine.evaluateFundPortfolio(selectedMfPortfolio);
  res.json({ data: analysis, dataAsOf: new Date().toISOString() });
});

app.post('/api/v1/mutual-funds/portfolio/funds', async (req: Request, res: Response) => {
  const { schemeCode, monthlySipAmount, sipStartDate } = req.body;
  if (!schemeCode || !monthlySipAmount) {
    return res.status(400).json({ error: 'schemeCode and monthlySipAmount are required' });
  }

  try {
    const fund = await marketData.getMutualFund(schemeCode);
    selectedMfPortfolio.push({
      fund,
      monthlySipAmount: Number(monthlySipAmount),
      sipStartDate: sipStartDate || new Date().toISOString().split('T')[0]
    });
    const analysis = MutualFundEngine.evaluateFundPortfolio(selectedMfPortfolio);
    res.status(201).json({ data: analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/mutual-funds/portfolio/funds/:schemeCode', (req: Request, res: Response) => {
  selectedMfPortfolio = selectedMfPortfolio.filter(s => s.fund.schemeCode !== req.params.schemeCode);
  const analysis = MutualFundEngine.evaluateFundPortfolio(selectedMfPortfolio);
  res.json({ data: analysis });
});

app.get('/api/v1/mutual-funds/:schemeCode', async (req: Request, res: Response) => {
  try {
    const fund = await marketData.getMutualFund(req.params.schemeCode);
    res.json({ data: fund, dataAsOf: fund.navDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/mutual-funds/:schemeCode/analysis', async (req: Request, res: Response) => {
  try {
    const fund = await marketData.getMutualFund(req.params.schemeCode);
    const analysis = MutualFundEngine.analyzeFund(fund);
    res.json({ data: analysis, dataAsOf: fund.navDate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RECOMMENDATIONS ENDPOINTS ---

app.get('/api/v1/recommendations/stocks', async (req: Request, res: Response) => {
  const universe = ['TCS', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'POLYCAB', 'KAYNES', 'ITC', 'TITAN'];
  try {
    const snapshots = await Promise.all(universe.map(s => marketData.getStockMetrics(s)));
    const analyses = snapshots.map(s => StockScoringEngine.analyzeStock(s));
    // Sort by total score descending
    analyses.sort((a, b) => b.totalScore - a.totalScore);
    res.json({
      data: analyses,
      dataAsOf: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/recommendations/mutual-funds', (req: Request, res: Response) => {
  const analysis = MutualFundEngine.evaluateFundPortfolio(selectedMfPortfolio);
  res.json({
    data: {
      frameworkRecommendation: 'Maintain disciplined monthly SIP in maximum four non-overlapping schemes matching 30/30/30/10 target.',
      selectedFunds: selectedMfPortfolio,
      analysis
    },
    dataAsOf: new Date().toISOString()
  });
});

// --- ALERTS ENDPOINTS ---

app.get('/api/v1/alerts', (req: Request, res: Response) => {
  const unack = req.query.unacknowledged === 'true';
  res.json({
    data: alertService.getAlerts(unack),
    count: alertService.getAlerts(unack).length,
    dataAsOf: new Date().toISOString()
  });
});

app.post('/api/v1/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const ok = alertService.acknowledgeAlert(req.params.id);
  if (ok) {
    res.json({ success: true, message: 'Alert acknowledged' });
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// --- AUDIT TRAIL ENDPOINT (Rule 12) ---

app.get('/api/v1/audit-trail', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit)) : 100;
  res.json({
    data: auditTrail.getRecords(limit),
    totalCount: auditTrail.getRecords(1000).length,
    dataAsOf: new Date().toISOString()
  });
});

// --- CONFIGURATION ENDPOINTS ---

app.get('/api/v1/config', (req: Request, res: Response) => {
  res.json({ data: getInvestmentConfig() });
});

app.put('/api/v1/config', (req: Request, res: Response) => {
  const updated = updateInvestmentConfig(req.body);
  res.json({ data: updated });
});

app.post('/api/v1/config/reset', (req: Request, res: Response) => {
  res.json({ data: resetInvestmentConfig() });
});

// --- WATCHLIST DATABASE ENDPOINTS (Step 3: SQLite Persistence) ---

app.get('/api/v1/watchlist', (req: Request, res: Response) => {
  try {
    const items = WatchlistService.getAll();
    res.json({ success: true, data: items, count: items.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/watchlist', (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.symbol) {
      return res.status(400).json({ success: false, error: 'Symbol is required' });
    }
    const saved = WatchlistService.add(item);
    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/watchlist/import', (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: Array<{ symbol: string; company_name?: string; name?: string; market_cap_type?: string; marketCapCategory?: string }> };
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'A non-empty "items" array is required' });
    }
    const result = WatchlistService.importBatch(items);
    res.json({
      success: true,
      imported: result.imported,
      updated: result.updated,
      totalCount: result.count,
      data: result.items,
      message: `Successfully processed ${items.length} stocks (${result.imported} added, ${result.updated} updated)`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/v1/watchlist/:symbol', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const removed = WatchlistService.remove(symbol);
    res.json({ success: true, removed, symbol: symbol.toUpperCase() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/v1/watchlist', (req: Request, res: Response) => {
  try {
    WatchlistService.clearAll();
    res.json({ success: true, message: 'Watchlist cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/watchlist/:symbol/exists', (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const exists = WatchlistService.exists(symbol);
    res.json({ success: true, exists, symbol: symbol.toUpperCase() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- TODAY'S STOCK OPPORTUNITIES ENDPOINTS ---

app.get('/api/v1/opportunities', (req: Request, res: Response) => {
  try {
    const watchlist = WatchlistService.getAll();
    const result = OpportunityEngine.analyzeWatchlist(watchlist, activeHoldings, false);

    const marketCap = req.query.marketCap ? String(req.query.marketCap) as any : undefined;
    const exchange = req.query.exchange ? String(req.query.exchange) as any : undefined;
    const sector = req.query.sector ? String(req.query.sector) : undefined;
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
    const maxPe = req.query.maxPe ? Number(req.query.maxPe) : undefined;
    const maxPb = req.query.maxPb ? Number(req.query.maxPb) : undefined;
    const minRoce = req.query.minRoce ? Number(req.query.minRoce) : undefined;
    const minSalesGrowth = req.query.minSalesGrowth ? Number(req.query.minSalesGrowth) : undefined;
    const minProfitGrowth = req.query.minProfitGrowth ? Number(req.query.minProfitGrowth) : undefined;
    const maxDebtEquity = req.query.maxDebtEquity !== undefined ? Number(req.query.maxDebtEquity) : undefined;
    const minMarginOfSafety = req.query.minMarginOfSafety !== undefined ? Number(req.query.minMarginOfSafety) : undefined;
    const valuationStatus = req.query.valuationStatus ? String(req.query.valuationStatus) as any : undefined;
    const riskLevel = req.query.riskLevel ? String(req.query.riskLevel) as any : undefined;
    const signal = req.query.signal ? String(req.query.signal) as any : undefined;
    const searchQuery = req.query.q ? String(req.query.q) : undefined;
    const sort = req.query.sort ? String(req.query.sort) : 'cheapest_fair_value';

    const filterObj = {
      marketCap,
      exchange,
      sector,
      minScore,
      maxPe,
      maxPb,
      minRoce,
      minSalesGrowth,
      minProfitGrowth,
      maxDebtEquity,
      minMarginOfSafety,
      valuationStatus,
      riskLevel,
      signal,
      searchQuery
    };

    const filteredBuys = OpportunityEngine.filterAndSort(result.buyCandidates, filterObj, sort);
    const filteredHolds = OpportunityEngine.filterAndSort(result.holdCandidates, filterObj, sort);
    const filteredSells = OpportunityEngine.filterAndSort(result.sellCandidates, filterObj, sort);
    const filteredAll = OpportunityEngine.filterAndSort(result.allOpportunities, filterObj, sort);

    res.json({
      success: true,
      data: {
        summary: result.summary,
        buyCandidates: filteredBuys,
        holdCandidates: filteredHolds,
        sellCandidates: filteredSells,
        allOpportunities: filteredAll,
        generatedAt: result.generatedAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/opportunities/generate', (req: Request, res: Response) => {
  void (async () => {
    try {
    const watchlist = WatchlistService.getAll();
    const marketSnapshots = new Map<string, Awaited<ReturnType<typeof marketData.getStockMetrics>>>();
    const failedSymbols: string[] = [];
    const batchSize = 3;

    for (let index = 0; index < watchlist.length; index += batchSize) {
      const batch = watchlist.slice(index, index + batchSize);
      const settled = await Promise.allSettled(batch.map(item => marketData.getStockMetrics(item.symbol)));
      settled.forEach((outcome, offset) => {
        const symbol = batch[offset].symbol.toUpperCase().trim();
        if (outcome.status === 'fulfilled') {
          marketSnapshots.set(symbol, outcome.value);
        } else {
          failedSymbols.push(symbol);
        }
      });
    }

    const result = OpportunityEngine.analyzeWatchlist(watchlist, activeHoldings, true, marketSnapshots);
    res.json({
      success: true,
      data: result,
      message: `Generated opportunities for ${result.summary.analyzedCount} watchlist stocks: ${result.summary.buyCandidatesCount} Buy candidates, ${result.summary.holdCandidatesCount} Hold/Watch, ${result.summary.sellCandidatesCount} Sell/Reduce`,
      failedSymbols
    });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  })();
});

// --- INTEGRATIONS STATUS (Step 1 indicates no MCP connected yet, Step 3 DB connected) ---

app.get('/api/v1/integrations', (req: Request, res: Response) => {
  res.json({
    data: [
      {
        provider: 'WEBSITE_DATA_ADAPTERS',
        status: 'CONNECTED',
        type: 'NSE_BSE_SCREENER_YAHOO_AMFI',
        readOnly: true,
        details: 'Official market data extraction from NSE India, BSE India, Screener.in, Yahoo Finance & AMFI India (till previous trading date).'
      },
      {
        provider: 'ZERODHA_KITE_MCP',
        status: 'SKIPPED',
        type: 'BROKER_MCP',
        readOnly: true,
        details: 'MCP Server connection skipped per user instructions.'
      },
      {
        provider: 'GROWW_MCP',
        status: 'SKIPPED',
        type: 'BROKER_MCP',
        readOnly: true,
        details: 'MCP Server connection skipped per user instructions.'
      },
      {
        provider: 'SQLITE_DB',
        status: 'CONNECTED',
        type: 'RELATIONAL_DATABASE',
        readOnly: false,
        details: 'SQLite persistent database storage active for Watchlist (Step 3).'
      }
    ],
    dataAsOf: new Date().toISOString()
  });
});

// ============================================================
// POST /api/v1/chat — AI Market Analysis Chat (deterministic)
// ============================================================
app.post('/api/v1/chat', async (req: Request, res: Response) => {
  try {
    const { prompt = '', assetType = 'STOCK', categories = [], sectors = [] } = req.body as {
      prompt: string;
      assetType: 'STOCK' | 'MUTUAL_FUND' | 'COMMODITY';
      categories: string[];
      sectors: string[];
    };

    const promptLower = prompt.toLowerCase();

    // ---- MUTUAL FUND branch ----
    if (assetType === 'MUTUAL_FUND') {
      const fundKeywords = ['fund', 'sip', 'nav', 'mutual', 'scheme', 'amfi'];
      const isMfQuery = fundKeywords.some(k => promptLower.includes(k));
      const reply =
        `📊 **Mutual Fund Analysis Context**\n\n` +
        `Based on your query about mutual funds, here are key guidelines from the 4-Fund SIP Framework:\n\n` +
        `• **Max 4 schemes** in your SIP portfolio to avoid over-diversification.\n` +
        `• **Target allocation**: 30% Nifty Index | 30% Multi-cap | 30% Mid & Small-cap | 10% Debt/Money Market.\n` +
        `• **Horizon**: 15 years minimum for equity mutual funds (compounding effect).\n` +
        `• **Expense ratio**: Prefer funds with expense ratio < 1% for direct plans.\n` +
        `• **Overlap check**: Ensure selected funds don't hold the same top-10 stocks.\n\n` +
        `💡 Use the **Mutual Funds** screen to search AMFI's full registry and add funds to your SIP portfolio.`;

      const suggestions = [
        'Which Nifty Index fund has the lowest expense ratio?',
        'Compare Parag Parikh vs HDFC Multi-cap fund',
        'Best mid-cap fund for 15-year SIP',
        'What is the 5-year return of top flexi-cap funds?'
      ];

      return res.json({ success: true, data: { reply, relatedStocks: [], suggestions } });
    }

    // ---- COMMODITY branch ----
    if (assetType === 'COMMODITY') {
      const reply =
        `🏅 **Commodity & Gold ETF Analysis**\n\n` +
        `For portfolio diversification, consider these commodity-related instruments:\n\n` +
        `• **Gold ETFs**: GOLDBEES (Nippon), HDFCGOLD (HDFC), SETFGOLD (SBI) — target 10% of equity portfolio as per investment rules.\n` +
        `• **Silver ETFs**: SILVERBEES, SILVRETF — emerging option for industrial metal exposure.\n` +
        `• **Commodity Mutual Funds**: Kotak Gold, Aditya Birla Sun Life Gold ETF.\n\n` +
        `📌 **Rule reminder**: The portfolio target is 10% in Gold/Silver ETF bucket. These act as inflation hedges and reduce correlation with equity.\n\n` +
        `⚠️ Commodities are volatile — position size within the defined 10% ETF bucket only.`;

      const suggestions = [
        'What is the current price of GOLDBEES?',
        'How much should I allocate to Gold ETF?',
        'Difference between Gold ETF and Sovereign Gold Bond',
        'Show my current Gold ETF allocation'
      ];

      return res.json({ success: true, data: { reply, relatedStocks: [], suggestions } });
    }

    // ---- STOCK branch ----
    // Load the screener universe using static method
    const allStocks = ScreenerEngine.evaluateUniverse();

    // Apply category filters
    let filtered = [...allStocks];
    if (categories.length > 0) {
      filtered = filtered.filter(s => categories.includes(s.qualityTier));
    }
    // Apply sector filters — match on stock universe sector if available
    // (ScreenerStockItem doesn't expose sector, so we skip sector filtering gracefully)
    // sectors filter is noted in context pills but doesn't narrow results

    // Keyword intent detection
    const isDividend    = promptLower.includes('dividend');
    const isLowPe       = promptLower.includes('low p/e') || promptLower.includes('low pe') || promptLower.includes('cheap');
    const isHighRoce    = promptLower.includes('roce') || promptLower.includes('return on capital');
    const isDebtFree    = promptLower.includes('debt-free') || promptLower.includes('debt free') || promptLower.includes('zero debt') || promptLower.includes('low debt');
    const isMomentum    = promptLower.includes('momentum') || promptLower.includes('200') || promptLower.includes('dma');
    const isSmallCap    = promptLower.includes('small') || categories.includes('SMALL_CAP');
    const isMidCap      = promptLower.includes('mid') || categories.includes('MID_CAP');
    const isLargeCap    = promptLower.includes('large') || categories.includes('LARGE_CAP');
    const isAiBenefit   = promptLower.includes('ai') && (promptLower.includes('benefit') || promptLower.includes('winner'));

    // Apply prompt-based secondary filters
    let workingSet = filtered.length > 0 ? filtered : allStocks;

    if (isDebtFree) {
      const df1 = workingSet.filter(s => s.debtEquity < 0.3);
      workingSet = df1.length > 0 ? df1 : workingSet.filter(s => s.debtEquity < 0.5);
    }
    if (isHighRoce) {
      const hr = workingSet.filter(s => s.roce >= 20);
      if (hr.length > 0) workingSet = hr;
    }
    if (isLowPe) {
      workingSet = [...workingSet].sort((a, b) => (a.pe || 999) - (b.pe || 999));
    }
    if (isLargeCap && !isMidCap && !isSmallCap) {
      workingSet = workingSet.filter(s => s.marketCapCategory === 'LARGE_CAP');
    } else if (isMidCap && !isLargeCap && !isSmallCap) {
      workingSet = workingSet.filter(s => s.marketCapCategory === 'MID_CAP');
    } else if (isSmallCap && !isLargeCap && !isMidCap) {
      workingSet = workingSet.filter(s => s.marketCapCategory === 'SMALL_CAP');
    }
    if (isAiBenefit) {
      workingSet = workingSet.filter(s => s.aiRisk === 'BENEFICIARY');
    }

    // Sort by score descending (default)
    workingSet = [...workingSet].sort((a, b) => ((b as any).score || 0) - ((a as any).score || 0));

    const topStocks = workingSet.slice(0, 5);

    // Build cap / tier context label
    const capCtx = isLargeCap ? 'Large-Cap' : isMidCap ? 'Mid-Cap' : isSmallCap ? 'Small-Cap' : 'All-Cap';
    const tierCtx = categories.length > 0 ? categories.map(c => c.replace('CATEGORY_', 'Category ')).join(' / ') : 'all tiers';
    const sectorCtx = sectors.length > 0 ? sectors.join(', ') : 'all sectors';

    // Build reply
    let reply = '';

    if (topStocks.length === 0) {
      reply = `🔍 No stocks found matching your criteria (${capCtx}, ${tierCtx}, ${sectorCtx}).\n\nTry:\n• Broadening the category filter\n• Removing sector filters\n• Checking if the screener universe has been loaded (click "Re-Score Universe" on the Quality Tiers screen)`;
    } else {
      const intentLabel = isDebtFree ? 'debt-free/low-debt' : isHighRoce ? 'high-ROCE' : isLowPe ? 'low P/E value' : isMomentum ? 'momentum' : isDividend ? 'dividend-paying' : isAiBenefit ? 'AI-beneficiary' : 'quality';

      reply = `📈 **${capCtx} ${intentLabel} stocks** (${tierCtx} | ${sectorCtx})\n\n`;
      reply += `Found **${workingSet.length}** matching stocks. Here are the top ${topStocks.length} by 100-point score:\n\n`;

      topStocks.forEach((s, i: number) => {
        const tierEmoji = s.qualityTier === 'CATEGORY_A' ? '🌟' : s.qualityTier === 'CATEGORY_B' ? '🥈' : s.qualityTier === 'CATEGORY_C' ? '🥉' : '📌';
        reply += `**${i + 1}. ${s.symbol}** (${s.name}) — Score: ${s.score}/100 ${tierEmoji}\n`;
        reply += `   ROCE: ${s.roce}% | ROE: ${s.roe}% | P/E: ${s.pe} | D/E: ${s.debtEquity} | Price: ₹${(s.price || 0).toLocaleString('en-IN')}\n\n`;
      });

      reply += `\n💡 **Investment reminder**: These are decision-support scores based on the 100-point framework. Not financial advice. Always verify fundamentals before investing.\n`;

      if (isHighRoce) reply += `\n📌 ROCE > 20% suggests the business earns strong returns on invested capital — a key moat indicator.`;
      if (isDebtFree) reply += `\n📌 Low debt (D/E < 0.3) means these companies can survive downturns without refinancing risk.`;
      if (isLowPe) reply += `\n📌 Low P/E doesn't always mean cheap — check earnings quality and growth runway.`;
      if (isAiBenefit) reply += `\n📌 AI Beneficiary classification means these businesses stand to gain from AI automation, not be disrupted.`;
    }

    // Suggestions for follow-up
    const suggestions: string[] = [
      `Compare ROCE of these stocks`,
      `Which of these are debt-free?`,
      `Show ${capCtx} Category A stocks`,
      `What is the 5Y sales CAGR for top picks?`,
      `Show AI vulnerable stocks to avoid`
    ];

    const relatedStocks = topStocks.map(s => ({
      symbol: s.symbol,
      name: s.name,
      score: s.score,
      price: s.price
    }));

    return res.json({ success: true, data: { reply, relatedStocks, suggestions } });

  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    return res.json({
      success: false,
      data: {
        reply: `⚠️ Analysis engine encountered an error: ${err.message}. Please try again or use the Stock Analysis screen to search directly.`,
        relatedStocks: [],
        suggestions: ['Try searching a specific stock symbol', 'Load the screener first']
      }
    });
  }
});

// Fallback to index.html for SPA routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});


app.listen(PORT, () => {
  console.log(`🚀 Share Market Analysis server running on http://localhost:${PORT}`);
});
