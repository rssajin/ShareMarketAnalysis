import { describe, it, expect } from 'vitest';
import { MutualFundEngine, SelectedFundItem } from '../src/engine/mutualFundEngine';
import { MutualFund } from '../src/domain/types';

describe('MutualFundEngine - 4-Fund Maximum, 30/30/30/10 Targets & 15Y SIP Scheduler', () => {
  const mockFunds: MutualFund[] = [
    {
      id: 'MF-1',
      schemeCode: '10001',
      name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth',
      fundHouse: 'UTI Mutual Fund',
      category: 'NIFTY_INDEX',
      benchmark: 'Nifty 50 TRI',
      expenseRatio: 0.20,
      exitLoad: 'Nil',
      currentNav: 175.5,
      navDate: '2026-09-04',
      returns1Y: 16.5,
      returns3Y: 15.2,
      returns5Y: 17.0,
      sharpeRatio: 1.15
    },
    {
      id: 'MF-2',
      schemeCode: '10002',
      name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
      fundHouse: 'PPFAS Mutual Fund',
      category: 'MULTI_CAP',
      benchmark: 'Nifty 500 TRI',
      expenseRatio: 0.65,
      exitLoad: '1% within 365 days',
      currentNav: 92.4,
      navDate: '2026-09-04',
      returns1Y: 19.5,
      returns3Y: 18.1,
      returns5Y: 21.0,
      sharpeRatio: 1.45
    },
    {
      id: 'MF-3',
      schemeCode: '10003',
      name: 'Motilal Oswal Midcap Fund - Direct Plan - Growth',
      fundHouse: 'Motilal Oswal Mutual Fund',
      category: 'MID_SMALL_CAP',
      benchmark: 'Nifty Midcap 150 TRI',
      expenseRatio: 0.70,
      exitLoad: '1% within 365 days',
      currentNav: 110.2,
      navDate: '2026-09-04',
      returns1Y: 28.5,
      returns3Y: 24.2,
      returns5Y: 26.5,
      sharpeRatio: 1.35
    },
    {
      id: 'MF-4',
      schemeCode: '10004',
      name: 'ICICI Prudential Money Market Fund - Direct - Growth',
      fundHouse: 'ICICI Prudential Mutual Fund',
      category: 'DEBT_MONEY_MARKET',
      benchmark: 'Crisil 1 Yr T-Bill Index',
      expenseRatio: 0.25,
      exitLoad: 'Nil',
      currentNav: 350.0,
      navDate: '2026-09-04',
      returns1Y: 7.2,
      returns3Y: 6.8,
      returns5Y: 6.9,
      sharpeRatio: 1.80
    }
  ];

  it('should pass with flying colors when exactly 4 funds match the 30/30/30/10 SIP allocation', () => {
    const selected: SelectedFundItem[] = [
      { fund: mockFunds[0], monthlySipAmount: 30000, sipStartDate: '2026-01-01' }, // 30%
      { fund: mockFunds[1], monthlySipAmount: 30000, sipStartDate: '2026-01-01' }, // 30%
      { fund: mockFunds[2], monthlySipAmount: 30000, sipStartDate: '2026-01-01' }, // 30%
      { fund: mockFunds[3], monthlySipAmount: 10000, sipStartDate: '2026-01-01' }  // 10%
    ];

    const result = MutualFundEngine.evaluateFundPortfolio(selected);

    expect(result.fourFundRuleStatus).toBe('PASS');
    expect(result.totalMonthlySip).toBe(100000);
    expect(result.categoryAllocation.niftyIndex.actualPct).toBe(30);
    expect(result.categoryAllocation.multiCap.actualPct).toBe(30);
    expect(result.categoryAllocation.midSmallCap.actualPct).toBe(30);
    expect(result.categoryAllocation.debtMoneyMarket.actualPct).toBe(10);

    expect(result.categoryAllocation.niftyIndex.status).toBe('PASS');
    expect(result.categoryAllocation.debtMoneyMarket.status).toBe('PASS');

    // 15-Year SIP projection
    expect(result.sipScheduleSummary.horizonYears).toBe(15);
    expect(result.sipScheduleSummary.totalInstallments).toBe(180);
    expect(result.sipScheduleSummary.estimatedTotalInvestment).toBe(18000000);
    expect(result.sipScheduleSummary.projectedValueAt12PctCagr).toBeGreaterThan(45000000);
  });

  it('should violate four-fund rule (FAIL) when a 5th fund is added', () => {
    const extraFund: MutualFund = {
      ...mockFunds[0],
      id: 'MF-5',
      name: 'Nippon India Small Cap Fund'
    };

    const fiveFunds: SelectedFundItem[] = [
      { fund: mockFunds[0], monthlySipAmount: 20000, sipStartDate: '2026-01-01' },
      { fund: mockFunds[1], monthlySipAmount: 20000, sipStartDate: '2026-01-01' },
      { fund: mockFunds[2], monthlySipAmount: 20000, sipStartDate: '2026-01-01' },
      { fund: mockFunds[3], monthlySipAmount: 20000, sipStartDate: '2026-01-01' },
      { fund: extraFund, monthlySipAmount: 20000, sipStartDate: '2026-01-01' } // 5th scheme
    ];

    const result = MutualFundEngine.evaluateFundPortfolio(fiveFunds);

    expect(result.fourFundRuleStatus).toBe('FAIL');
    expect(result.ruleStatuses.find(r => r.ruleName.includes('Max 4'))?.status).toBe('FAIL');
  });

  it('should flag high overlap when two funds are from the exact same category', () => {
    const duplicateCategory: SelectedFundItem[] = [
      { fund: mockFunds[0], monthlySipAmount: 5000, sipStartDate: '2026-01-01' },
      { fund: { ...mockFunds[0], id: 'MF-DUP', name: 'HDFC Nifty 50 Index Fund' }, monthlySipAmount: 5000, sipStartDate: '2026-01-01' }
    ];

    const result = MutualFundEngine.evaluateFundPortfolio(duplicateCategory);

    expect(result.overlapMatrix.some(o => o.overlapWarning)).toBe(true);
  });
});
