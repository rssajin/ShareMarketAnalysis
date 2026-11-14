import { 
  Holding, 
  PortfolioAnalysis, 
  PortfolioRuleResult, 
  RuleStatus, 
  Alert 
} from '../domain/types';
import { getInvestmentConfig } from './config';
import { auditTrail } from './auditTrail';

export class PortfolioRuleEngine {
  /**
   * Evaluates portfolio holdings against the configured target allocations and rules
   */
  public static evaluatePortfolio(portfolioId: string, holdings: Holding[]): PortfolioAnalysis {
    const config = getInvestmentConfig();
    const evaluatedAt = new Date().toISOString();

    if (!holdings || holdings.length === 0) {
      return {
        portfolioId,
        totalValue: 0,
        totalInvested: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        equityAllocation: {
          largeCap: { actual: 0, target: 40, variance: -40, status: 'NOT_ENOUGH_DATA', value: 0 },
          midCap: { actual: 0, target: 30, variance: -30, status: 'NOT_ENOUGH_DATA', value: 0 },
          smallCap: { actual: 0, target: 20, variance: -20, status: 'NOT_ENOUGH_DATA', value: 0 },
          goldSilverEtf: { actual: 0, target: 10, variance: -10, status: 'NOT_ENOUGH_DATA', value: 0 }
        },
        complianceScore: 0,
        ruleResults: [],
        alerts: [{
          id: `ALT-EMPTY-${Date.now()}`,
          portfolioId,
          type: 'EMPTY_PORTFOLIO',
          severity: 'INFO',
          title: 'Empty Portfolio',
          message: 'Add holdings to analyze allocation against target rules.',
          createdAt: evaluatedAt
        }],
        midSmallCapSellTriggers: [],
        evaluatedAt
      };
    }

    // 1. Calculate values
    let totalValue = 0;
    let totalInvested = 0;
    let largeCapVal = 0;
    let midCapVal = 0;
    let smallCapVal = 0;
    let goldSilverVal = 0;

    for (const h of holdings) {
      const curVal = h.quantity * h.currentPrice;
      const invVal = h.quantity * h.averageCost;
      h.currentValue = Math.round(curVal * 100) / 100;
      h.investedValue = Math.round(invVal * 100) / 100;
      h.pnl = Math.round((curVal - invVal) * 100) / 100;
      h.pnlPercent = invVal > 0 ? Math.round(((curVal - invVal) / invVal) * 10000) / 100 : 0;

      totalValue += curVal;
      totalInvested += invVal;

      if (h.marketCapCategory === 'LARGE_CAP') largeCapVal += curVal;
      else if (h.marketCapCategory === 'MID_CAP') midCapVal += curVal;
      else if (h.marketCapCategory === 'SMALL_CAP') smallCapVal += curVal;
      else if (h.marketCapCategory === 'ETF_GOLD_SILVER' || h.assetClass === 'ETF_GOLD_SILVER') goldSilverVal += curVal;
      else largeCapVal += curVal; // fallback
    }

    totalValue = Math.round(totalValue * 100) / 100;
    totalInvested = Math.round(totalInvested * 100) / 100;
    const totalPnl = Math.round((totalValue - totalInvested) * 100) / 100;
    const totalPnlPercent = totalInvested > 0 ? Math.round((totalPnl / totalInvested) * 10000) / 100 : 0;

    // Update individual allocation percentages
    for (const h of holdings) {
      h.allocationPercent = totalValue > 0 ? Math.round((h.currentValue / totalValue) * 10000) / 100 : 0;
    }

    // Allocation percentages by category
    const largeCapPct = totalValue > 0 ? Math.round((largeCapVal / totalValue) * 10000) / 100 : 0;
    const midCapPct = totalValue > 0 ? Math.round((midCapVal / totalValue) * 10000) / 100 : 0;
    const smallCapPct = totalValue > 0 ? Math.round((smallCapVal / totalValue) * 10000) / 100 : 0;
    const goldSilverPct = totalValue > 0 ? Math.round((goldSilverVal / totalValue) * 10000) / 100 : 0;

    const target = config.equity.targetAllocation;
    const targetLarge = target.largeCap * 100;
    const targetMid = target.midCap * 100;
    const targetSmall = target.smallCap * 100;
    const targetGold = target.goldSilverEtf * 100;
    const tol = config.equity.toleranceBandPercent;

    const evalCategory = (actual: number, tgt: number, name: string): { status: RuleStatus; variance: number } => {
      const variance = Math.round((actual - tgt) * 100) / 100;
      let status: RuleStatus = 'PASS';
      if (Math.abs(variance) > tol * 2) {
        status = 'FAIL';
      } else if (Math.abs(variance) > tol) {
        status = 'WARNING';
      }
      return { status, variance };
    };

    const resLarge = evalCategory(largeCapPct, targetLarge, 'Large-cap');
    const resMid = evalCategory(midCapPct, targetMid, 'Mid-cap');
    const resSmall = evalCategory(smallCapPct, targetSmall, 'Small-cap');
    const resGold = evalCategory(goldSilverPct, targetGold, 'Gold/Silver ETF');

    const ruleResults: PortfolioRuleResult[] = [
      {
        ruleCode: 'RULE_ALLOC_LARGE_CAP',
        ruleName: 'Large-Cap Allocation (Target 40%)',
        status: resLarge.status,
        actualValue: `${largeCapPct}%`,
        targetValue: `${targetLarge}% (±${tol}%)`,
        variance: resLarge.variance,
        explanation: `Current large-cap allocation is ${largeCapPct}% (₹${largeCapVal.toLocaleString('en-IN')}) vs target ${targetLarge}%.`,
        suggestedAction: resLarge.variance < -tol 
          ? `Allocate fresh capital to quality large-cap compounders to reach target.`
          : resLarge.variance > tol 
          ? `Consider shifting incremental SIPs toward mid-cap or ETF to normalize balance.`
          : `Allocation is within the healthy tolerance corridor.`,
        evaluatedAt
      },
      {
        ruleCode: 'RULE_ALLOC_MID_CAP',
        ruleName: 'Mid-Cap Allocation (Target 30%)',
        status: resMid.status,
        actualValue: `${midCapPct}%`,
        targetValue: `${targetMid}% (±${tol}%)`,
        variance: resMid.variance,
        explanation: `Current mid-cap allocation is ${midCapPct}% (₹${midCapVal.toLocaleString('en-IN')}) vs target ${targetMid}%.`,
        suggestedAction: resMid.variance < -tol 
          ? `Add vetted mid-cap growth stocks with low leverage and high ROCE.`
          : resMid.variance > tol 
          ? `Take partial profits on mid-caps crossing return thresholds to rebalance.`
          : `Allocation is on target.`,
        evaluatedAt
      },
      {
        ruleCode: 'RULE_ALLOC_SMALL_CAP',
        ruleName: 'Small-Cap Allocation (Target 20%)',
        status: resSmall.status,
        actualValue: `${smallCapPct}%`,
        targetValue: `${targetSmall}% (±${tol}%)`,
        variance: resSmall.variance,
        explanation: `Current small-cap allocation is ${smallCapPct}% (₹${smallCapVal.toLocaleString('en-IN')}) vs target ${targetSmall}%.`,
        suggestedAction: resSmall.variance < -tol 
          ? `Selectively deploy in small-cap companies with positive FCF and 0% promoter pledge.`
          : resSmall.variance > tol 
          ? `Trim small-cap exposure to prevent excessive drawdown risk.`
          : `Small-cap exposure is well managed within tolerance.`,
        evaluatedAt
      },
      {
        ruleCode: 'RULE_ALLOC_GOLD_ETF',
        ruleName: 'Precious Metals / Gold ETF (Target 10%)',
        status: resGold.status,
        actualValue: `${goldSilverPct}%`,
        targetValue: `${targetGold}% (±${tol}%)`,
        variance: resGold.variance,
        explanation: `Current Gold/Silver ETF allocation is ${goldSilverPct}% (₹${goldSilverVal.toLocaleString('en-IN')}) vs target ${targetGold}%.`,
        suggestedAction: resGold.variance < -tol 
          ? `Add Sovereign Gold Bond or Gold ETF to maintain defensive hedge.`
          : resGold.variance > tol 
          ? `Reallocate excess gold ETF gains into lagging equity segments.`
          : `Defensive hedge is maintained at appropriate levels.`,
        evaluatedAt
      }
    ];

    // Check Single Stock Concentration (>15% of portfolio)
    const alerts: Alert[] = [];
    for (const h of holdings) {
      if (h.allocationPercent > 15) {
        alerts.push({
          id: `ALT-CONC-${h.symbol}-${Date.now()}`,
          portfolioId,
          type: 'CONCENTRATION_RISK',
          severity: h.allocationPercent > 25 ? 'CRITICAL' : 'WARNING',
          title: `Excess Concentration: ${h.name} (${h.symbol})`,
          message: `${h.symbol} represents ${h.allocationPercent.toFixed(1)}% of your total portfolio, exceeding the 15% prudential threshold.`,
          suggestedAction: 'Consider taking partial profits to reduce single-stock volatility risk.',
          createdAt: evaluatedAt
        });
      }
    }

    // Mid/Small-cap 10–15% Profit Sell Trigger Rule
    const midSmallCapSellTriggers: {
      holding: Holding;
      pnlPercent: number;
      thresholdRange: string;
      suggestion: string;
    }[] = [];

    const sellRule = config.equity.midSmallCapSellTrigger;
    if (sellRule.enabled) {
      for (const h of holdings) {
        if (h.marketCapCategory === 'MID_CAP' || h.marketCapCategory === 'SMALL_CAP') {
          if (h.pnlPercent >= sellRule.minPercent) {
            const isUpper = h.pnlPercent >= sellRule.maxPercent;
            const triggerInfo = {
              holding: h,
              pnlPercent: h.pnlPercent,
              thresholdRange: `${sellRule.minPercent}% – ${sellRule.maxPercent}%`,
              suggestion: `Per your rules, ${h.marketCapCategory === 'MID_CAP' ? 'Mid-cap' : 'Small-cap'} holding ${h.symbol} has achieved +${h.pnlPercent.toFixed(1)}% return. Consider taking partial profits to lock in gains and protect capital. (Requires manual confirmation).`
            };
            midSmallCapSellTriggers.push(triggerInfo);

            alerts.push({
              id: `ALT-PROFIT-${h.symbol}-${Date.now()}`,
              portfolioId,
              type: 'MID_SMALL_PROFIT_TRIGGER',
              severity: isUpper ? 'CRITICAL' : 'WARNING',
              title: `Profit Review Trigger: ${h.symbol} (+${h.pnlPercent.toFixed(1)}%)`,
              message: `${h.name} (${h.marketCapCategory}) has gained ${h.pnlPercent.toFixed(1)}% (target rule: ${sellRule.minPercent}%-${sellRule.maxPercent}%).`,
              suggestedAction: 'Review whether to sell partially and shift capital to underweight asset classes.',
              createdAt: evaluatedAt
            });
          }
        }
      }
    }

    // Overall Compliance Score (out of 100%)
    let passCount = 0;
    for (const r of ruleResults) {
      if (r.status === 'PASS') passCount += 1;
      else if (r.status === 'WARNING') passCount += 0.5;
    }
    const complianceScore = Math.round((passCount / ruleResults.length) * 100);

    const result: PortfolioAnalysis = {
      portfolioId,
      totalValue,
      totalInvested,
      totalPnl,
      totalPnlPercent,
      equityAllocation: {
        largeCap: { actual: largeCapPct, target: targetLarge, variance: resLarge.variance, status: resLarge.status, value: largeCapVal },
        midCap: { actual: midCapPct, target: targetMid, variance: resMid.variance, status: resMid.status, value: midCapVal },
        smallCap: { actual: smallCapPct, target: targetSmall, variance: resSmall.variance, status: resSmall.status, value: smallCapVal },
        goldSilverEtf: { actual: goldSilverPct, target: targetGold, variance: resGold.variance, status: resGold.status, value: goldSilverVal }
      },
      complianceScore,
      ruleResults,
      alerts,
      midSmallCapSellTriggers,
      evaluatedAt
    };

    // Log to audit trail
    auditTrail.record(
      'PORTFOLIO_RULE_EVALUATION',
      'user_portfolio',
      portfolioId,
      {
        totalValue,
        allocations: { largeCapPct, midCapPct, smallCapPct, goldSilverPct },
        alertsCount: alerts.length
      },
      complianceScore,
      complianceScore >= 75 ? 'PASS' : complianceScore >= 50 ? 'WARNING' : 'FAIL'
    );

    return result;
  }
}
