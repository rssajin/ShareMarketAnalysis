import { InvestmentConfig } from '../domain/types';

export const defaultInvestmentConfig: InvestmentConfig = {
  equity: {
    targetAllocation: {
      largeCap: 0.40,
      midCap: 0.30,
      smallCap: 0.20,
      goldSilverEtf: 0.10
    },
    toleranceBandPercent: 5.0, // +/- 5% tolerance before warning
    midSmallCapSellTrigger: {
      enabled: true,
      minPercent: 10.0,
      maxPercent: 15.0
    }
  },
  mutualFunds: {
    maxSchemes: 4,
    targetAllocation: {
      niftyIndex: 0.30,
      multiCap: 0.30,
      midSmallCap: 0.30,
      debtMoneyMarket: 0.10
    },
    horizonYears: 15
  },
  stockScoring: {
    minimumCandidateScore: 70,
    minRoe: 15.0,
    minRoce: 15.0,
    maxDebtEquity: 0.5,
    minSalesCagr5Y: 10.0,
    minProfitCagr5Y: 12.0
  }
};

let currentConfig: InvestmentConfig = JSON.parse(JSON.stringify(defaultInvestmentConfig));

export function getInvestmentConfig(): InvestmentConfig {
  return currentConfig;
}

export function updateInvestmentConfig(updates: Partial<InvestmentConfig>): InvestmentConfig {
  currentConfig = {
    ...currentConfig,
    ...updates,
    equity: {
      ...currentConfig.equity,
      ...(updates.equity || {})
    },
    mutualFunds: {
      ...currentConfig.mutualFunds,
      ...(updates.mutualFunds || {})
    },
    stockScoring: {
      ...currentConfig.stockScoring,
      ...(updates.stockScoring || {})
    }
  };
  return currentConfig;
}

export function resetInvestmentConfig(): InvestmentConfig {
  currentConfig = JSON.parse(JSON.stringify(defaultInvestmentConfig));
  return currentConfig;
}
