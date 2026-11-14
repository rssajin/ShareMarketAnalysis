import { MarketCapCategory, IndexTag, StockMetricsSnapshot } from '../domain/types';

export interface UniverseStockDefinition {
  symbol: string;
  name: string;
  marketCapCategory: MarketCapCategory;
  indices: IndexTag[];
  sector: string;
  industry: string;
  // Baseline financials to ensure immediate, deterministic screening
  baseMetrics: Partial<StockMetricsSnapshot>;
}

export const LARGE_CAP_INDICES: IndexTag[] = [
  'NIFTY50', 'NIFTY100', 'NIFTY200', 'NIFTY500',
  'BSE100', 'BSE200', 'BSE500', 'BSE_LARGECAP'
];

export const NEXT50_INDICES: IndexTag[] = [
  'NIFTY_NEXT_50', 'NIFTY100', 'NIFTY200', 'NIFTY500',
  'BSE100', 'BSE200', 'BSE500', 'BSE_LARGECAP'
];

export const MID_CAP_INDICES: IndexTag[] = [
  'NIFTY_MIDCAP_50', 'NIFTY_MIDCAP_100', 'NIFTY_MIDCAP_150', 'NIFTY_MIDCAP_SELECT',
  'NIFTY200', 'NIFTY500', 'NIFTY_LARGEMIDCAP_250',
  'BSE_MIDCAP', 'BSE200', 'BSE500'
];

export const SMALL_CAP_INDICES: IndexTag[] = [
  'NIFTY_SMALLCAP_50', 'NIFTY_SMALLCAP_100', 'NIFTY_SMALLCAP_250',
  'NIFTY500',
  'BSE_SMALLCAP', 'BSE500'
];

export const STOCK_UNIVERSE: UniverseStockDefinition[] = [
  // ===================== LARGE CAP (NIFTY 50 / BSE 100 / NIFTY 200 / NIFTY 500) =====================
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    baseMetrics: {
      price: 2304,
      marketCapCr: 836528,
      pe: 15.6,
      roce: 63.0,
      roe: 51.8,
      salesCagr5Y: 10.0,
      profitCagr5Y: 9.0,
      debtEquity: 0.01,
      interestCoverage: 80,
      promoterHolding: 72.3,
      promoterPledge: 0.0,
      fcfCr: 42000,
      cfoCr: 52000,
      patCr: 48000,
      opm: 26.5
    }
  },
  {
    symbol: 'INFY',
    name: 'Infosys Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    baseMetrics: {
      price: 1130,
      marketCapCr: 468000,
      pe: 18.2,
      roce: 41.5,
      roe: 32.0,
      salesCagr5Y: 12.5,
      profitCagr5Y: 10.8,
      debtEquity: 0.08,
      interestCoverage: 65,
      promoterHolding: 14.8,
      promoterPledge: 0.0,
      fcfCr: 21000,
      cfoCr: 26000,
      patCr: 25000,
      opm: 23.8
    }
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Financial Services',
    industry: 'Private Bank',
    baseMetrics: {
      price: 1680,
      marketCapCr: 1280000,
      pe: 18.5,
      roce: 17.5,
      roe: 16.8,
      salesCagr5Y: 17.0,
      profitCagr5Y: 19.5,
      debtEquity: 0.85,
      interestCoverage: 15,
      promoterHolding: 25.5,
      promoterPledge: 0.0,
      fcfCr: 35000,
      cfoCr: 48000,
      patCr: 64000,
      opm: 28.0
    }
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Financial Services',
    industry: 'Private Bank',
    baseMetrics: {
      price: 1240,
      marketCapCr: 875000,
      pe: 17.2,
      roce: 18.2,
      roe: 18.5,
      salesCagr5Y: 18.5,
      profitCagr5Y: 28.0,
      debtEquity: 0.78,
      interestCoverage: 18,
      promoterHolding: 0.0,
      promoterPledge: 0.0,
      fcfCr: 28000,
      cfoCr: 38000,
      patCr: 44000,
      opm: 29.5
    }
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Consumer Discretionary',
    industry: 'Gems, Jewellery And Watches',
    baseMetrics: {
      price: 3450,
      marketCapCr: 306000,
      pe: 72.0,
      roce: 28.5,
      roe: 27.2,
      salesCagr5Y: 21.0,
      profitCagr5Y: 24.5,
      debtEquity: 0.45,
      interestCoverage: 12,
      promoterHolding: 52.9,
      promoterPledge: 0.0,
      fcfCr: 2800,
      cfoCr: 4200,
      patCr: 3500,
      opm: 11.2
    }
  },
  {
    symbol: 'ITC',
    name: 'ITC Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'FMCG',
    industry: 'Diversified FMCG & Hotels',
    baseMetrics: {
      price: 460,
      marketCapCr: 575000,
      pe: 27.5,
      roce: 38.0,
      roe: 29.5,
      salesCagr5Y: 11.5,
      profitCagr5Y: 12.8,
      debtEquity: 0.01,
      interestCoverage: 95,
      promoterHolding: 0.0,
      promoterPledge: 0.0,
      fcfCr: 17000,
      cfoCr: 20500,
      patCr: 20400,
      opm: 37.5
    }
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Capital Goods',
    industry: 'EPC & Infrastructure Engineering',
    baseMetrics: {
      price: 3580,
      marketCapCr: 492000,
      pe: 34.0,
      roce: 16.5,
      roe: 15.2,
      salesCagr5Y: 13.5,
      profitCagr5Y: 15.0,
      debtEquity: 0.65,
      interestCoverage: 5.5,
      promoterHolding: 0.0,
      promoterPledge: 0.0,
      fcfCr: 12000,
      cfoCr: 18500,
      patCr: 14500,
      opm: 12.0
    }
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Automobile',
    industry: 'Commercial & Passenger Vehicles',
    baseMetrics: {
      price: 820,
      marketCapCr: 301000,
      pe: 9.8,
      roce: 22.0,
      roe: 36.5,
      salesCagr5Y: 14.0,
      profitCagr5Y: 45.0,
      debtEquity: 0.42,
      interestCoverage: 9.5,
      promoterHolding: 46.4,
      promoterPledge: 0.0,
      fcfCr: 22000,
      cfoCr: 41000,
      patCr: 31000,
      opm: 14.5
    }
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Telecommunication',
    industry: 'Telecom - Services',
    baseMetrics: {
      price: 1590,
      marketCapCr: 940000,
      pe: 65.0,
      roce: 14.5,
      roe: 18.0,
      salesCagr5Y: 14.8,
      profitCagr5Y: 35.0,
      debtEquity: 1.1,
      interestCoverage: 4.8,
      promoterHolding: 53.5,
      promoterPledge: 0.0,
      fcfCr: 26000,
      cfoCr: 55000,
      patCr: 14000,
      opm: 52.0
    }
  },
  {
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries Ltd',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Healthcare',
    industry: 'Pharmaceuticals',
    baseMetrics: {
      price: 1820,
      marketCapCr: 436000,
      pe: 39.5,
      roce: 17.8,
      roe: 16.5,
      salesCagr5Y: 11.0,
      profitCagr5Y: 18.2,
      debtEquity: 0.05,
      interestCoverage: 45,
      promoterHolding: 54.5,
      promoterPledge: 1.5,
      fcfCr: 8500,
      cfoCr: 11500,
      patCr: 10800,
      opm: 27.5
    }
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: LARGE_CAP_INDICES,
    sector: 'Energy',
    industry: 'Oil, Gas & Retail/Telecom',
    baseMetrics: {
      price: 1322,
      marketCapCr: 1780000,
      pe: 24.5,
      roce: 10.5,
      roe: 9.8,
      salesCagr5Y: 12.0,
      profitCagr5Y: 11.2,
      debtEquity: 0.42,
      interestCoverage: 6.8,
      promoterHolding: 50.3,
      promoterPledge: 0.0,
      fcfCr: 15000,
      cfoCr: 140000,
      patCr: 72000,
      opm: 18.0
    }
  },
  {
    symbol: 'BEL',
    name: 'Bharat Electronics Limited',
    marketCapCategory: 'LARGE_CAP',
    indices: NEXT50_INDICES,
    sector: 'Capital Goods',
    industry: 'Aerospace & Defense',
    baseMetrics: {
      price: 310,
      marketCapCr: 226000,
      pe: 48.0,
      roce: 36.5,
      roe: 27.5,
      salesCagr5Y: 14.5,
      profitCagr5Y: 22.0,
      debtEquity: 0.0,
      interestCoverage: 99,
      promoterHolding: 51.1,
      promoterPledge: 0.0,
      fcfCr: 3800,
      cfoCr: 4900,
      patCr: 4500,
      opm: 25.5
    }
  },

  // ===================== MID CAP (NIFTY 200 / NIFTY MIDCAP 150 / NIFTY 500) =====================
  {
    symbol: 'POLYCAB',
    name: 'Polycab India Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Capital Goods',
    industry: 'Wires & Cables / FMEG',
    baseMetrics: {
      price: 6200,
      marketCapCr: 93200,
      pe: 44.0,
      roce: 32.5,
      roe: 25.8,
      salesCagr5Y: 19.5,
      profitCagr5Y: 28.2,
      debtEquity: 0.02,
      interestCoverage: 38,
      promoterHolding: 63.1,
      promoterPledge: 0.0,
      fcfCr: 1600,
      cfoCr: 2100,
      patCr: 2050,
      opm: 13.5
    }
  },
  {
    symbol: 'PERSISTENT',
    name: 'Persistent Systems Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Information Technology',
    industry: 'Digital Product Engineering',
    baseMetrics: {
      price: 5400,
      marketCapCr: 83500,
      pe: 58.5,
      roce: 31.0,
      roe: 26.5,
      salesCagr5Y: 23.5,
      profitCagr5Y: 29.0,
      debtEquity: 0.12,
      interestCoverage: 28,
      promoterHolding: 31.0,
      promoterPledge: 0.0,
      fcfCr: 1200,
      cfoCr: 1650,
      patCr: 1420,
      opm: 18.2
    }
  },
  {
    symbol: 'COFORGE',
    name: 'Coforge Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Information Technology',
    industry: 'Software Consulting',
    baseMetrics: {
      price: 7850,
      marketCapCr: 52000,
      pe: 52.0,
      roce: 25.5,
      roe: 23.0,
      salesCagr5Y: 21.0,
      profitCagr5Y: 18.5,
      debtEquity: 0.35,
      interestCoverage: 12,
      promoterHolding: 0.0,
      promoterPledge: 0.0,
      fcfCr: 850,
      cfoCr: 1250,
      patCr: 1050,
      opm: 17.5
    }
  },
  {
    symbol: 'DIXON',
    name: 'Dixon Technologies (India) Ltd',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Consumer Durables',
    industry: 'Electronic Manufacturing Services (EMS)',
    baseMetrics: {
      price: 13400,
      marketCapCr: 80500,
      pe: 95.0,
      roce: 38.0,
      roe: 31.5,
      salesCagr5Y: 34.0,
      profitCagr5Y: 38.5,
      debtEquity: 0.28,
      interestCoverage: 14,
      promoterHolding: 33.8,
      promoterPledge: 0.0,
      fcfCr: 600,
      cfoCr: 1100,
      patCr: 850,
      opm: 4.2
    }
  },
  {
    symbol: 'TATAELXSI',
    name: 'Tata Elxsi Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Information Technology',
    industry: 'Design & Engineering Technology',
    baseMetrics: {
      price: 7100,
      marketCapCr: 44200,
      pe: 55.5,
      roce: 42.0,
      roe: 34.5,
      salesCagr5Y: 17.5,
      profitCagr5Y: 21.0,
      debtEquity: 0.05,
      interestCoverage: 45,
      promoterHolding: 42.2,
      promoterPledge: 0.0,
      fcfCr: 720,
      cfoCr: 910,
      patCr: 790,
      opm: 29.5
    }
  },
  {
    symbol: 'ASTRAL',
    name: 'Astral Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Building Materials',
    industry: 'Pipes & Adhesives',
    baseMetrics: {
      price: 1980,
      marketCapCr: 53200,
      pe: 85.0,
      roce: 24.5,
      roe: 19.5,
      salesCagr5Y: 18.0,
      profitCagr5Y: 17.5,
      debtEquity: 0.04,
      interestCoverage: 32,
      promoterHolding: 54.1,
      promoterPledge: 0.0,
      fcfCr: 450,
      cfoCr: 780,
      patCr: 620,
      opm: 16.5
    }
  },
  {
    symbol: 'DEEPAKNTR',
    name: 'Deepak Nitrite Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Chemicals',
    industry: 'Specialty Chemicals',
    baseMetrics: {
      price: 2750,
      marketCapCr: 37500,
      pe: 42.0,
      roce: 22.0,
      roe: 18.5,
      salesCagr5Y: 16.5,
      profitCagr5Y: 15.0,
      debtEquity: 0.03,
      interestCoverage: 40,
      promoterHolding: 49.1,
      promoterPledge: 0.0,
      fcfCr: 620,
      cfoCr: 980,
      patCr: 880,
      opm: 17.0
    }
  },
  {
    symbol: 'CUMMINSIND',
    name: 'Cummins India Limited',
    marketCapCategory: 'MID_CAP',
    indices: MID_CAP_INDICES,
    sector: 'Capital Goods',
    industry: 'Engines & Power Generation',
    baseMetrics: {
      price: 3650,
      marketCapCr: 101000,
      pe: 54.0,
      roce: 31.5,
      roe: 24.0,
      salesCagr5Y: 15.0,
      profitCagr5Y: 26.5,
      debtEquity: 0.05,
      interestCoverage: 48,
      promoterHolding: 51.0,
      promoterPledge: 0.0,
      fcfCr: 1400,
      cfoCr: 1850,
      patCr: 1800,
      opm: 19.8
    }
  },

  // ===================== SMALL CAP (NIFTY 500 / NIFTY SMALLCAP 250) =====================
  {
    symbol: 'KAYNES',
    name: 'Kaynes Technology India Ltd',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Electronic Manufacturing',
    industry: 'IoT, Automotive & Defense EMS',
    baseMetrics: {
      price: 5180,
      marketCapCr: 33100,
      pe: 98.0,
      roce: 21.5,
      roe: 16.0,
      salesCagr5Y: 38.0,
      profitCagr5Y: 62.0,
      debtEquity: 0.18,
      interestCoverage: 11,
      promoterHolding: 57.5,
      promoterPledge: 0.0,
      fcfCr: 180,
      cfoCr: 320,
      patCr: 340,
      opm: 14.5
    }
  },
  {
    symbol: 'CDSL',
    name: 'Central Depository Services (India) Ltd',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Financial Services',
    industry: 'Securities Depository Monopoly',
    baseMetrics: {
      price: 1520,
      marketCapCr: 31800,
      pe: 62.0,
      roce: 38.5,
      roe: 31.0,
      salesCagr5Y: 28.0,
      profitCagr5Y: 31.5,
      debtEquity: 0.0,
      interestCoverage: 99,
      promoterHolding: 20.0,
      promoterPledge: 0.0,
      fcfCr: 420,
      cfoCr: 540,
      patCr: 510,
      opm: 62.0
    }
  },
  {
    symbol: 'CAMS',
    name: 'Computer Age Management Services Ltd',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Financial Services',
    industry: 'Mutual Fund RTA Duopoly',
    baseMetrics: {
      price: 4350,
      marketCapCr: 21400,
      pe: 49.5,
      roce: 48.0,
      roe: 39.5,
      salesCagr5Y: 15.5,
      profitCagr5Y: 21.0,
      debtEquity: 0.08,
      interestCoverage: 32,
      promoterHolding: 0.0,
      promoterPledge: 0.0,
      fcfCr: 380,
      cfoCr: 460,
      patCr: 430,
      opm: 44.5
    }
  },
  {
    symbol: 'ANGELONE',
    name: 'Angel One Limited',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Financial Services',
    industry: 'Fintech & Digital Brokerage',
    baseMetrics: {
      price: 2850,
      marketCapCr: 25600,
      pe: 20.5,
      roce: 39.0,
      roe: 36.5,
      salesCagr5Y: 42.0,
      profitCagr5Y: 55.0,
      debtEquity: 0.65,
      interestCoverage: 12,
      promoterHolding: 38.2,
      promoterPledge: 0.0,
      fcfCr: 800,
      cfoCr: 1200,
      patCr: 1250,
      opm: 38.0
    }
  },
  {
    symbol: 'KPITTECH',
    name: 'KPIT Technologies Limited',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Information Technology',
    industry: 'Automotive Software & EV Tech',
    baseMetrics: {
      price: 1450,
      marketCapCr: 39500,
      pe: 65.0,
      roce: 32.5,
      roe: 28.5,
      salesCagr5Y: 25.5,
      profitCagr5Y: 38.0,
      debtEquity: 0.15,
      interestCoverage: 24,
      promoterHolding: 39.5,
      promoterPledge: 0.0,
      fcfCr: 550,
      cfoCr: 720,
      patCr: 610,
      opm: 20.5
    }
  },
  {
    symbol: 'SONACOMS',
    name: 'Sona BLW Precision Forgings Ltd',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Automobile',
    industry: 'Auto Components & EV Driveline',
    baseMetrics: {
      price: 680,
      marketCapCr: 40200,
      pe: 75.0,
      roce: 21.0,
      roe: 19.5,
      salesCagr5Y: 24.0,
      profitCagr5Y: 29.5,
      debtEquity: 0.12,
      interestCoverage: 19,
      promoterHolding: 29.8,
      promoterPledge: 0.0,
      fcfCr: 350,
      cfoCr: 620,
      patCr: 540,
      opm: 28.0
    }
  },
  {
    symbol: 'HBLPOWER',
    name: 'HBL Power Systems Limited',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Industrial Manufacturing',
    industry: 'Railway Kavach & Defense Batteries',
    baseMetrics: {
      price: 590,
      marketCapCr: 16400,
      pe: 45.0,
      roce: 34.0,
      roe: 26.5,
      salesCagr5Y: 20.5,
      profitCagr5Y: 48.0,
      debtEquity: 0.03,
      interestCoverage: 35,
      promoterHolding: 59.1,
      promoterPledge: 0.0,
      fcfCr: 280,
      cfoCr: 390,
      patCr: 365,
      opm: 22.0
    }
  },
  {
    symbol: 'CLEAN',
    name: 'Clean Science and Technology Ltd',
    marketCapCategory: 'SMALL_CAP',
    indices: SMALL_CAP_INDICES,
    sector: 'Chemicals',
    industry: 'Specialty Green Chemicals',
    baseMetrics: {
      price: 1380,
      marketCapCr: 14700,
      pe: 58.0,
      roce: 29.5,
      roe: 23.5,
      salesCagr5Y: 18.0,
      profitCagr5Y: 16.5,
      debtEquity: 0.01,
      interestCoverage: 85,
      promoterHolding: 74.9,
      promoterPledge: 0.0,
      fcfCr: 210,
      cfoCr: 290,
      patCr: 250,
      opm: 39.5
    }
  }
];
