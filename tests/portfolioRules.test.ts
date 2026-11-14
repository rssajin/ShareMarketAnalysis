import { describe, it, expect } from 'vitest';
import { PortfolioRuleEngine } from '../src/engine/portfolioRuleEngine';
import { Holding } from '../src/domain/types';

describe('PortfolioRuleEngine - 40/30/20/10 Targets & Mid/Small Profit Triggers', () => {
  const balancedHoldings: Holding[] = [
    {
      id: 'H1',
      portfolioId: 'PORT-1',
      symbol: 'TCS',
      name: 'Tata Consultancy Services',
      assetClass: 'EQUITY',
      marketCapCategory: 'LARGE_CAP',
      quantity: 100,
      averageCost: 3500,
      currentPrice: 4000,
      currentValue: 0,
      investedValue: 0,
      pnl: 0,
      pnlPercent: 0,
      allocationPercent: 0,
      targetPercent: 40
    },
    {
      id: 'H2',
      portfolioId: 'PORT-1',
      symbol: 'POLYCAB',
      name: 'Polycab India Ltd',
      assetClass: 'EQUITY',
      marketCapCategory: 'MID_CAP',
      quantity: 50,
      averageCost: 5500,
      currentPrice: 6000,
      currentValue: 0,
      investedValue: 0,
      pnl: 0,
      pnlPercent: 0,
      allocationPercent: 0,
      targetPercent: 30
    },
    {
      id: 'H3',
      portfolioId: 'PORT-1',
      symbol: 'KAYNES',
      name: 'Kaynes Technology',
      assetClass: 'EQUITY',
      marketCapCategory: 'SMALL_CAP',
      quantity: 40,
      averageCost: 4500,
      currentPrice: 5000,
      currentValue: 0,
      investedValue: 0,
      pnl: 0,
      pnlPercent: 0,
      allocationPercent: 0,
      targetPercent: 20
    },
    {
      id: 'H4',
      portfolioId: 'PORT-1',
      symbol: 'GOLDBEES',
      name: 'Nippon India ETF Gold BeES',
      assetClass: 'ETF_GOLD_SILVER',
      marketCapCategory: 'ETF_GOLD_SILVER',
      quantity: 1600,
      averageCost: 60,
      currentPrice: 62.5,
      currentValue: 0,
      investedValue: 0,
      pnl: 0,
      pnlPercent: 0,
      allocationPercent: 0,
      targetPercent: 10
    }
  ];

  it('should accurately calculate total portfolio values and evaluate balanced 40/30/20/10 allocation', () => {
    // Large Cap: 100 * 4000 = 4,00,000 (40%)
    // Mid Cap: 50 * 6000 = 3,00,000 (30%)
    // Small Cap: 40 * 5000 = 2,00,000 (20%)
    // Gold: 1600 * 62.5 = 1,00,000 (10%)
    // Total = 10,00,000
    const analysis = PortfolioRuleEngine.evaluatePortfolio('PORT-1', balancedHoldings);

    expect(analysis.totalValue).toBe(1000000);
    expect(analysis.equityAllocation.largeCap.actual).toBe(40);
    expect(analysis.equityAllocation.midCap.actual).toBe(30);
    expect(analysis.equityAllocation.smallCap.actual).toBe(20);
    expect(analysis.equityAllocation.goldSilverEtf.actual).toBe(10);

    expect(analysis.equityAllocation.largeCap.status).toBe('PASS');
    expect(analysis.equityAllocation.midCap.status).toBe('PASS');
    expect(analysis.equityAllocation.smallCap.status).toBe('PASS');
    expect(analysis.equityAllocation.goldSilverEtf.status).toBe('PASS');
    expect(analysis.complianceScore).toBe(100);
  });

  it('should flag mid/small-cap 10-15% profit trigger without triggering for large caps', () => {
    const profitTriggerHoldings: Holding[] = [
      {
        ...balancedHoldings[0], // TCS (Large-cap) at +50% should NOT trigger mid/small sell rule
        averageCost: 2000,
        currentPrice: 3000 // +50% gain
      },
      {
        ...balancedHoldings[1], // POLYCAB (Mid-cap) at +14% (between 10% and 15%)
        averageCost: 5000,
        currentPrice: 5700 // +14% gain
      },
      {
        ...balancedHoldings[2], // KAYNES (Small-cap) at +12%
        averageCost: 4000,
        currentPrice: 4480 // +12% gain
      },
      balancedHoldings[3]
    ];

    const analysis = PortfolioRuleEngine.evaluatePortfolio('PORT-1', profitTriggerHoldings);

    // Large cap should NOT be in midSmallCapSellTriggers
    expect(analysis.midSmallCapSellTriggers.some(t => t.holding.symbol === 'TCS')).toBe(false);

    // Mid and small cap SHOULD be in triggers
    expect(analysis.midSmallCapSellTriggers.some(t => t.holding.symbol === 'POLYCAB')).toBe(true);
    expect(analysis.midSmallCapSellTriggers.some(t => t.holding.symbol === 'KAYNES')).toBe(true);
    expect(analysis.alerts.some(a => a.type === 'MID_SMALL_PROFIT_TRIGGER')).toBe(true);
  });

  it('should flag allocation drift and concentration risk', () => {
    const lopsidedHoldings: Holding[] = [
      {
        ...balancedHoldings[0], // TCS is 80% of portfolio
        quantity: 1000,
        currentPrice: 4000
      },
      balancedHoldings[1] // Mid cap is tiny
    ];

    const analysis = PortfolioRuleEngine.evaluatePortfolio('PORT-1', lopsidedHoldings);

    expect(analysis.equityAllocation.largeCap.variance).toBeGreaterThan(15);
    expect(analysis.equityAllocation.largeCap.status).toBe('FAIL');
    expect(analysis.alerts.some(a => a.type === 'CONCENTRATION_RISK')).toBe(true);
  });
});
