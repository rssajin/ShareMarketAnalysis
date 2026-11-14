import { 
  MutualFund, 
  MutualFundAnalysis, 
  MutualFundCategory, 
  RuleStatus 
} from '../domain/types';
import { getInvestmentConfig } from './config';
import { auditTrail } from './auditTrail';

export interface SelectedFundItem {
  fund: MutualFund;
  monthlySipAmount: number;
  sipStartDate: string; // YYYY-MM-DD
}

export interface MutualFundPortfolioAnalysis {
  selectedFunds: SelectedFundItem[];
  totalMonthlySip: number;
  totalProjected15YCorpus: number;
  fourFundRuleStatus: RuleStatus;
  categoryAllocation: {
    niftyIndex: { actualPct: number; targetPct: number; variance: number; status: RuleStatus; amount: number };
    multiCap: { actualPct: number; targetPct: number; variance: number; status: RuleStatus; amount: number };
    midSmallCap: { actualPct: number; targetPct: number; variance: number; status: RuleStatus; amount: number };
    debtMoneyMarket: { actualPct: number; targetPct: number; variance: number; status: RuleStatus; amount: number };
  };
  overlapMatrix: {
    fundPair: string;
    overlapPercentage: number;
    overlapWarning: boolean;
  }[];
  sipScheduleSummary: {
    horizonYears: number;
    startDate: string;
    projectedCompletionDate: string;
    totalInstallments: number;
    estimatedTotalInvestment: number;
    projectedValueAt12PctCagr: number;
    taxExemptionGuidance: string;
  };
  ruleStatuses: {
    ruleName: string;
    status: RuleStatus;
    message: string;
  }[];
}

export class MutualFundEngine {
  /**
   * Deterministically analyze a single mutual fund scheme
   */
  public static analyzeFund(fund: MutualFund): MutualFundAnalysis {
    const analysisDate = new Date().toISOString();
    let expenseScore = 0;
    let performanceScore = 0;
    let riskScore = 0;
    let consistencyScore = 0;

    const keyReasons: string[] = [];
    const failedChecks: string[] = [];

    // 1. Expense Ratio Score (out of 25)
    // Direct index < 0.3% is great; active equity < 1.0% is good
    if (fund.expenseRatio <= 0.3) {
      expenseScore = 25;
      keyReasons.push(`Ultra-low expense ratio (${fund.expenseRatio}%) maximizes compounding`);
    } else if (fund.expenseRatio <= 0.75) {
      expenseScore = 20;
      keyReasons.push(`Competitive expense ratio (${fund.expenseRatio}%)`);
    } else if (fund.expenseRatio <= 1.25) {
      expenseScore = 14;
      keyReasons.push(`Moderate expense ratio (${fund.expenseRatio}%)`);
    } else {
      expenseScore = 8;
      failedChecks.push(`High expense ratio (${fund.expenseRatio}% > 1.25%)`);
    }

    // 2. Performance Score (out of 35)
    // 3Y & 5Y CAGR evaluation
    const ret3Y = fund.returns3Y ?? fund.returns1Y ?? 12;
    const ret5Y = fund.returns5Y ?? ret3Y;
    if (ret5Y >= 18) {
      performanceScore = 35;
      keyReasons.push(`Outstanding 5Y CAGR (${ret5Y.toFixed(1)}%)`);
    } else if (ret5Y >= 14) {
      performanceScore = 28;
      keyReasons.push(`Healthy long-term CAGR (${ret5Y.toFixed(1)}%)`);
    } else if (ret5Y >= 10) {
      performanceScore = 20;
      keyReasons.push(`Adequate return profile (${ret5Y.toFixed(1)}%)`);
    } else {
      performanceScore = 10;
      failedChecks.push(`Underperforming long-term return (${ret5Y.toFixed(1)}%)`);
    }

    // 3. Risk & Volatility Score (out of 25)
    const sharpe = fund.sharpeRatio ?? 1.1;
    if (sharpe >= 1.2) {
      riskScore = 25;
      keyReasons.push(`High risk-adjusted alpha (Sharpe ratio ${sharpe.toFixed(2)})`);
    } else if (sharpe >= 0.8) {
      riskScore = 18;
      keyReasons.push(`Balanced risk profile (Sharpe ratio ${sharpe.toFixed(2)})`);
    } else {
      riskScore = 10;
      failedChecks.push(`Below-benchmark risk efficiency (Sharpe ratio ${sharpe.toFixed(2)})`);
    }

    // 4. Consistency Score (out of 15)
    if (ret3Y > 12 && ret5Y > 12) {
      consistencyScore = 15;
      keyReasons.push('Exceptional rolling return consistency across market cycles');
    } else if (ret3Y > 8) {
      consistencyScore = 10;
    } else {
      consistencyScore = 5;
      failedChecks.push('Inconsistent performance across cyclical phases');
    }

    const totalScore = expenseScore + performanceScore + riskScore + consistencyScore;
    const categorySuitability: RuleStatus = totalScore >= 70 ? 'PASS' : totalScore >= 50 ? 'WARNING' : 'FAIL';

    // Audit log
    auditTrail.record(
      'MUTUAL_FUND_ANALYSIS',
      'amfi_mfapi',
      fund.schemeCode,
      {
        name: fund.name,
        category: fund.category,
        nav: fund.currentNav,
        expenseRatio: fund.expenseRatio,
        returns5Y: fund.returns5Y
      },
      totalScore,
      categorySuitability
    );

    return {
      fund,
      analysisDate,
      categorySuitability,
      expenseScore,
      performanceScore,
      riskScore,
      consistencyScore,
      totalScore,
      keyReasons,
      failedChecks,
      dataAsOf: fund.navDate
    };
  }

  /**
   * Evaluate the complete 4-Fund SIP Framework & Portfolio from docs/MUTUAL_FUND_ANALYSIS.md
   */
  public static evaluateFundPortfolio(selectedFunds: SelectedFundItem[]): MutualFundPortfolioAnalysis {
    const config = getInvestmentConfig().mutualFunds;
    const totalFunds = selectedFunds.length;
    
    // 1. Four-Fund Rule Status
    let fourFundRuleStatus: RuleStatus = 'PASS';
    if (totalFunds > config.maxSchemes) {
      fourFundRuleStatus = 'FAIL';
    } else if (totalFunds === 0) {
      fourFundRuleStatus = 'NOT_ENOUGH_DATA';
    } else if (totalFunds < config.maxSchemes) {
      fourFundRuleStatus = 'WARNING'; // Framework works best with complete 4-bucket diversification
    }

    // 2. Category Allocations
    let totalMonthlySip = 0;
    let niftyIndexAmt = 0;
    let multiCapAmt = 0;
    let midSmallCapAmt = 0;
    let debtMoneyMarketAmt = 0;

    for (const item of selectedFunds) {
      totalMonthlySip += item.monthlySipAmount;
      if (item.fund.category === 'NIFTY_INDEX') niftyIndexAmt += item.monthlySipAmount;
      else if (item.fund.category === 'MULTI_CAP') multiCapAmt += item.monthlySipAmount;
      else if (item.fund.category === 'MID_SMALL_CAP') midSmallCapAmt += item.monthlySipAmount;
      else if (item.fund.category === 'DEBT_MONEY_MARKET') debtMoneyMarketAmt += item.monthlySipAmount;
    }

    const calcCat = (amt: number, targetFraction: number) => {
      const actualPct = totalMonthlySip > 0 ? Math.round((amt / totalMonthlySip) * 10000) / 100 : 0;
      const targetPct = targetFraction * 100;
      const variance = Math.round((actualPct - targetPct) * 100) / 100;
      let status: RuleStatus = 'PASS';
      if (Math.abs(variance) > 10) status = 'FAIL';
      else if (Math.abs(variance) > 5) status = 'WARNING';
      return { actualPct, targetPct, variance, status, amount: amt };
    };

    const targetAlloc = config.targetAllocation;
    const categoryAllocation = {
      niftyIndex: calcCat(niftyIndexAmt, targetAlloc.niftyIndex),
      multiCap: calcCat(multiCapAmt, targetAlloc.multiCap),
      midSmallCap: calcCat(midSmallCapAmt, targetAlloc.midSmallCap),
      debtMoneyMarket: calcCat(debtMoneyMarketAmt, targetAlloc.debtMoneyMarket)
    };

    // 3. Overlap Analysis between selected funds
    const overlapMatrix: { fundPair: string; overlapPercentage: number; overlapWarning: boolean }[] = [];
    for (let i = 0; i < selectedFunds.length; i++) {
      for (let j = i + 1; j < selectedFunds.length; j++) {
        const f1 = selectedFunds[i].fund;
        const f2 = selectedFunds[j].fund;
        // Deterministic overlap estimation based on category similarities
        let estimatedOverlap = 15; // baseline market overlap
        if (f1.category === f2.category) {
          estimatedOverlap = 65; // Same category has heavy duplicate exposure
        } else if (
          (f1.category === 'NIFTY_INDEX' && f2.category === 'MULTI_CAP') ||
          (f2.category === 'NIFTY_INDEX' && f1.category === 'MULTI_CAP')
        ) {
          estimatedOverlap = 38; // Multi-cap usually holds 40-50% large caps
        } else if (
          (f1.category === 'MULTI_CAP' && f2.category === 'MID_SMALL_CAP') ||
          (f2.category === 'MULTI_CAP' && f1.category === 'MID_SMALL_CAP')
        ) {
          estimatedOverlap = 28;
        } else if (f1.category === 'DEBT_MONEY_MARKET' || f2.category === 'DEBT_MONEY_MARKET') {
          estimatedOverlap = 0; // Equity vs debt has zero portfolio overlap
        }

        overlapMatrix.push({
          fundPair: `${f1.name.split(' - ')[0]} ↔ ${f2.name.split(' - ')[0]}`,
          overlapPercentage: estimatedOverlap,
          overlapWarning: estimatedOverlap > 40
        });
      }
    }

    // 4. 15-Year Horizon & SIP Schedule Calculation
    const horizonYears = config.horizonYears;
    const totalInstallments = horizonYears * 12;
    const estimatedTotalInvestment = totalMonthlySip * totalInstallments;
    
    // Future value formula for SIP: FV = P * [((1+r)^n - 1) / r] * (1+r)
    // Assuming 12% expected annual return (1.0% monthly)
    const monthlyRate = 0.12 / 12;
    let projectedValueAt12PctCagr = 0;
    if (totalMonthlySip > 0) {
      projectedValueAt12PctCagr = Math.round(
        totalMonthlySip * ((Math.pow(1 + monthlyRate, totalInstallments) - 1) / monthlyRate) * (1 + monthlyRate)
      );
    }

    const firstStartDate = selectedFunds.length > 0 ? selectedFunds[0].sipStartDate : new Date().toISOString().split('T')[0];
    const startDateObj = new Date(firstStartDate);
    const completionDateObj = new Date(startDateObj);
    completionDateObj.setFullYear(completionDateObj.getFullYear() + horizonYears);

    const sipScheduleSummary = {
      horizonYears,
      startDate: firstStartDate,
      projectedCompletionDate: completionDateObj.toISOString().split('T')[0],
      totalInstallments,
      estimatedTotalInvestment,
      projectedValueAt12PctCagr,
      taxExemptionGuidance: 'Indian Tax Law Notice: Equity mutual funds qualify for LTCG (Long-Term Capital Gains) when held for > 12 months from each lot date. To optimize tax, wait 1 year after the 180th (last) SIP installment before redeeming that specific lot. Disclaimer: Tax rules are subject to legislative changes.'
    };

    // 5. Consolidated Rule Statuses
    const ruleStatuses: { ruleName: string; status: RuleStatus; message: string }[] = [
      {
        ruleName: 'Max 4 Mutual Fund Schemes',
        status: fourFundRuleStatus,
        message: totalFunds === 4 
          ? 'Exactly 4 schemes selected, maintaining disciplined focus without portfolio dilution.'
          : totalFunds < 4 
          ? `${totalFunds}/4 schemes selected. You have room to complete your 4-pillar portfolio.`
          : `RULE VIOLATION: ${totalFunds} schemes selected. Exceeds the maximum 4 funds rule!`
      },
      {
        ruleName: 'Target Category Diversification (30/30/30/10)',
        status: (categoryAllocation.niftyIndex.status === 'PASS' &&
                 categoryAllocation.multiCap.status === 'PASS' &&
                 categoryAllocation.midSmallCap.status === 'PASS' &&
                 categoryAllocation.debtMoneyMarket.status === 'PASS') ? 'PASS' : 'WARNING',
        message: `Current weights: Index ${categoryAllocation.niftyIndex.actualPct}% / Multi-cap ${categoryAllocation.multiCap.actualPct}% / Mid-Small ${categoryAllocation.midSmallCap.actualPct}% / Debt ${categoryAllocation.debtMoneyMarket.actualPct}%.`
      },
      {
        ruleName: 'Portfolio Overlap Control',
        status: overlapMatrix.some(o => o.overlapWarning) ? 'WARNING' : 'PASS',
        message: overlapMatrix.some(o => o.overlapWarning)
          ? 'Warning: Some selected funds have >40% estimated portfolio overlap. Consider selecting distinct fund houses or styles.'
          : 'Low to moderate overlap among funds ensures genuine diversification.'
      }
    ];

    return {
      selectedFunds,
      totalMonthlySip,
      totalProjected15YCorpus: projectedValueAt12PctCagr,
      fourFundRuleStatus,
      categoryAllocation,
      overlapMatrix,
      sipScheduleSummary,
      ruleStatuses
    };
  }
}
