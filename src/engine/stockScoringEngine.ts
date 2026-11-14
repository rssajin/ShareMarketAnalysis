import { 
  StockMetricsSnapshot, 
  StockAnalysis, 
  DimensionScore, 
  CheckItem, 
  AiRiskClassification,
  StockPriceTargetRange
} from '../domain/types';
import { getInvestmentConfig } from './config';
import { auditTrail } from './auditTrail';

export class StockScoringEngine {
  /**
   * Deterministically evaluate a stock against the 100-point framework from docs/STOCK_ANALYSIS.md
   */
  public static analyzeStock(metrics: StockMetricsSnapshot): StockAnalysis {
    const config = getInvestmentConfig().stockScoring;
    const unavailable = new Set((metrics.unavailableMetrics || []).map(value => value.toLowerCase()));
    const metricAvailable = (name: string) => !unavailable.has(name.toLowerCase());
    const hasRoe = metricAvailable('ROE');
    const hasRoce = metricAvailable('ROCE');
    const hasRoceConsistency = metricAvailable('ROCE Consistency');
    const hasOperatingMargin = metricAvailable('Operating Margin');
    const hasSalesGrowth = metricAvailable('5Y Sales Growth');
    const hasProfitGrowth = metricAvailable('5Y Profit Growth');
    const hasEpsGrowth = metricAvailable('EPS Growth') && metrics.epsCagr5Y !== undefined;
    const hasDebtEquity = metricAvailable('Debt-to-Equity');
    const hasInterestCoverage = metricAvailable('Interest Coverage');
    const hasFreeCashFlow = metricAvailable('Free Cash Flow');
    const hasFreeCashFlowHistory = metricAvailable('FCF History');
    const hasOperatingCashFlow = metricAvailable('Operating Cash Flow');
    const hasProfitAfterTax = metricAvailable('Profit After Tax');
    const hasPromoterPledge = metricAvailable('Promoter Pledge');
    const hasPromoterHolding = metricAvailable('Promoter Holding');

    // 1. Business Quality (Max 20)
    // Criteria: ROE > 15%, ROCE > 15-18%, ROCE consistency, OPM
    let bqScore = 0;
    const bqDetails: string[] = [];
    if (!hasRoe) {
      bqDetails.push('ROE data unavailable');
    } else if (metrics.roe >= 20) {
      bqScore += 6;
      bqDetails.push(`Excellent ROE (${metrics.roe.toFixed(1)}% >= 20%)`);
    } else if (metrics.roe >= config.minRoe) {
      bqScore += 4.5;
      bqDetails.push(`Healthy ROE (${metrics.roe.toFixed(1)}% >= ${config.minRoe}%)`);
    } else if (metrics.roe > 10) {
      bqScore += 2;
      bqDetails.push(`Sub-par ROE (${metrics.roe.toFixed(1)}%)`);
    } else {
      bqDetails.push(`Poor ROE (${metrics.roe.toFixed(1)}% < 10%)`);
    }

    if (!hasRoce) {
      bqDetails.push('ROCE data unavailable');
    } else if (metrics.roce >= 22) {
      bqScore += 7;
      bqDetails.push(`Superior ROCE (${metrics.roce.toFixed(1)}% >= 22%)`);
    } else if (metrics.roce >= config.minRoce) {
      bqScore += 5;
      bqDetails.push(`Good ROCE (${metrics.roce.toFixed(1)}% >= ${config.minRoce}%)`);
    } else if (metrics.roce > 10) {
      bqScore += 2.5;
      bqDetails.push(`Moderate ROCE (${metrics.roce.toFixed(1)}%)`);
    } else {
      bqDetails.push(`Low ROCE (${metrics.roce.toFixed(1)}%)`);
    }

    if (!hasRoceConsistency) {
      bqDetails.push('ROCE consistency data unavailable');
    } else if (metrics.roceConsistencyYears >= 5) {
      bqScore += 4;
      bqDetails.push(`5+ years positive & consistent capital efficiency`);
    } else if (metrics.roceConsistencyYears >= 3) {
      bqScore += 2.5;
      bqDetails.push(`3-4 years stable capital efficiency`);
    } else {
      bqDetails.push(`Inconsistent ROCE track record`);
    }

    if (!hasOperatingMargin) {
      bqDetails.push('Operating margin data unavailable');
    } else if (metrics.opm >= 20) {
      bqScore += 3;
      bqDetails.push(`Robust operating margins (${metrics.opm.toFixed(1)}%)`);
    } else if (metrics.opm >= 12) {
      bqScore += 2;
      bqDetails.push(`Healthy operating margins (${metrics.opm.toFixed(1)}%)`);
    } else {
      bqScore += 1;
      bqDetails.push(`Slim operating margins (${metrics.opm.toFixed(1)}%)`);
    }
    const businessQualityScore: DimensionScore = {
      score: Math.min(20, Math.round(bqScore * 10) / 10),
      maxScore: 20,
      details: bqDetails.join('; ')
    };

    // 2. Growth (Max 20)
    // Criteria: 5Y Sales CAGR (>10-12%), 5Y Profit CAGR (>12-15%), EPS / quarterly momentum
    let grScore = 0;
    const grDetails: string[] = [];
    if (!hasSalesGrowth) {
      grDetails.push('5Y sales growth data unavailable');
    } else if (metrics.salesCagr5Y >= 15) {
      grScore += 8;
      grDetails.push(`High 5Y Sales CAGR (${metrics.salesCagr5Y.toFixed(1)}%)`);
    } else if (metrics.salesCagr5Y >= config.minSalesCagr5Y) {
      grScore += 6;
      grDetails.push(`Solid 5Y Sales CAGR (${metrics.salesCagr5Y.toFixed(1)}%)`);
    } else if (metrics.salesCagr5Y > 5) {
      grScore += 3;
      grDetails.push(`Moderate 5Y Sales CAGR (${metrics.salesCagr5Y.toFixed(1)}%)`);
    } else {
      grDetails.push(`Sluggish 5Y Sales CAGR (${metrics.salesCagr5Y.toFixed(1)}%)`);
    }

    if (!hasProfitGrowth) {
      grDetails.push('5Y profit growth data unavailable');
    } else if (metrics.profitCagr5Y >= 18) {
      grScore += 8;
      grDetails.push(`High 5Y Profit CAGR (${metrics.profitCagr5Y.toFixed(1)}%)`);
    } else if (metrics.profitCagr5Y >= config.minProfitCagr5Y) {
      grScore += 6;
      grDetails.push(`Healthy 5Y Profit CAGR (${metrics.profitCagr5Y.toFixed(1)}%)`);
    } else if (metrics.profitCagr5Y > 5) {
      grScore += 3;
      grDetails.push(`Slow 5Y Profit CAGR (${metrics.profitCagr5Y.toFixed(1)}%)`);
    } else {
      grDetails.push(`Stagnant or declining 5Y Profit CAGR (${metrics.profitCagr5Y.toFixed(1)}%)`);
    }

    const hasQuarterlyGrowth = metrics.quarterlySalesGrowth !== undefined &&
      metricAvailable('Quarterly Sales Growth');
    const quarterlyGrowth = metrics.quarterlySalesGrowth ?? (hasEpsGrowth ? metrics.epsCagr5Y : undefined) ?? metrics.salesCagr5Y;
    if (!hasQuarterlyGrowth && !hasEpsGrowth && !hasSalesGrowth) {
      grDetails.push('Recent growth momentum data unavailable');
    } else if (quarterlyGrowth >= 12) {
      grScore += 4;
      grDetails.push(`Strong recent momentum (${quarterlyGrowth.toFixed(1)}%)`);
    } else if (quarterlyGrowth > 0) {
      grScore += 2.5;
      grDetails.push(`Positive recent momentum (${quarterlyGrowth.toFixed(1)}%)`);
    } else {
      grDetails.push(`Negative recent quarterly momentum`);
    }
    const growthScore: DimensionScore = {
      score: Math.min(20, Math.round(grScore * 10) / 10),
      maxScore: 20,
      details: grDetails.join('; ')
    };

    // 3. Profitability (Max 15)
    // Evaluates margin sustainability and return compounding
    let prScore = 0;
    const prDetails: string[] = [];
    if (hasRoce && hasRoe && metrics.roce >= 18 && metrics.roe >= 18) {
      prScore += 9;
      prDetails.push(`Top-tier dual profitability (ROCE & ROE both >= 18%)`);
    } else if ((hasRoce && metrics.roce >= 15) || (hasRoe && metrics.roe >= 15)) {
      prScore += 6.5;
      prDetails.push(`Good profitability returns`);
    } else if (!hasRoce && !hasRoe) {
      prDetails.push('ROCE and ROE data unavailable');
    } else {
      prScore += 2;
      prDetails.push(`Below preferred hurdle rate (<15%)`);
    }

    if (!hasOperatingMargin) {
      prDetails.push('Operating margin data unavailable');
    } else if (metrics.opm >= 15) {
      prScore += 6;
      prDetails.push(`Defensible margin cushion (OPM ${metrics.opm.toFixed(1)}%)`);
    } else if (metrics.opm >= 8) {
      prScore += 3.5;
      prDetails.push(`Average margin cushion (OPM ${metrics.opm.toFixed(1)}%)`);
    } else {
      prScore += 1;
      prDetails.push(`Thin profit margin (${metrics.opm.toFixed(1)}%)`);
    }
    const profitabilityScore: DimensionScore = {
      score: Math.min(15, Math.round(prScore * 10) / 10),
      maxScore: 15,
      details: prDetails.join('; ')
    };

    // 4. Financial Strength (Max 15)
    // Criteria: Debt/Equity (<0.5 preferred), Interest coverage (>4-5x)
    let fsScore = 0;
    const fsDetails: string[] = [];
    if (!hasDebtEquity) {
      fsDetails.push('Debt-to-equity data unavailable');
    } else if (metrics.debtEquity <= 0.1) {
      fsScore += 9;
      fsDetails.push(`Virtually zero debt (D/E ${metrics.debtEquity.toFixed(2)})`);
    } else if (metrics.debtEquity <= config.maxDebtEquity) {
      fsScore += 7;
      fsDetails.push(`Comfortable leverage (D/E ${metrics.debtEquity.toFixed(2)} <= ${config.maxDebtEquity})`);
    } else if (metrics.debtEquity <= 1.0) {
      fsScore += 3.5;
      fsDetails.push(`Moderate leverage (D/E ${metrics.debtEquity.toFixed(2)})`);
    } else {
      fsDetails.push(`High debt load (D/E ${metrics.debtEquity.toFixed(2)} > 1.0)`);
    }

    if (!hasInterestCoverage) {
      fsDetails.push('Interest coverage data unavailable');
    } else if (metrics.interestCoverage >= 10) {
      fsScore += 6;
      fsDetails.push(`Outstanding interest coverage (${metrics.interestCoverage.toFixed(1)}x)`);
    } else if (metrics.interestCoverage >= 4) {
      fsScore += 4.5;
      fsDetails.push(`Adequate interest coverage (${metrics.interestCoverage.toFixed(1)}x)`);
    } else if (metrics.interestCoverage >= 2) {
      fsScore += 2;
      fsDetails.push(`Marginal interest coverage (${metrics.interestCoverage.toFixed(1)}x)`);
    } else {
      fsDetails.push(`Stressed interest coverage (${metrics.interestCoverage.toFixed(1)}x < 2x)`);
    }
    const financialStrengthScore: DimensionScore = {
      score: Math.min(15, Math.round(fsScore * 10) / 10),
      maxScore: 15,
      details: fsDetails.join('; ')
    };

    // 5. Cash Flow Quality (Max 10)
    // Criteria: Positive FCF, CFO vs PAT (CFO/PAT >= 1 preferred)
    let cfScore = 0;
    const cfDetails: string[] = [];
    if (!hasFreeCashFlow) {
      cfDetails.push('Free cash flow data unavailable');
    } else if (metrics.fcfCr > 0 && hasFreeCashFlowHistory && metrics.fcfPositiveYears >= 4) {
      cfScore += 5;
      cfDetails.push(`Consistent positive free cash flow (₹${metrics.fcfCr.toFixed(0)} Cr, ${metrics.fcfPositiveYears}/5 yrs)`);
    } else if (metrics.fcfCr > 0) {
      cfScore += 3;
      cfDetails.push(`Positive FCF (₹${metrics.fcfCr.toFixed(0)} Cr)`);
    } else {
      cfDetails.push(`Negative free cash flow (₹${metrics.fcfCr.toFixed(0)} Cr)`);
    }

    const hasCashConversionData = hasOperatingCashFlow && hasProfitAfterTax && metrics.patCr > 0;
    const cfoRatio = hasCashConversionData ? metrics.cfoCr / metrics.patCr : 0;
    if (!hasCashConversionData) {
      cfDetails.push('CFO/PAT data unavailable');
    } else if (cfoRatio >= 1.0) {
      cfScore += 5;
      cfDetails.push(`High earnings quality: CFO exceeds PAT (CFO/PAT = ${cfoRatio.toFixed(2)})`);
    } else if (cfoRatio >= 0.75) {
      cfScore += 3.5;
      cfDetails.push(`Good earnings conversion (CFO/PAT = ${cfoRatio.toFixed(2)})`);
    } else if (cfoRatio > 0.4) {
      cfScore += 1.5;
      cfDetails.push(`Weak cash flow conversion (CFO/PAT = ${cfoRatio.toFixed(2)})`);
    } else {
      cfDetails.push(`Poor earnings quality: CFO significantly trails PAT (CFO/PAT = ${cfoRatio.toFixed(2)})`);
    }
    const cashFlowScore: DimensionScore = {
      score: Math.min(10, Math.round(cfScore * 10) / 10),
      maxScore: 10,
      details: cfDetails.join('; ')
    };

    // 6. Valuation (Max 10)
    // Criteria: P/E relative to sector/growth, PEG < 1.5, P/B vs ROE
    let valScore = 0;
    const valDetails: string[] = [];
    const industryPe = metrics.industryPe && metrics.industryPe > 0 ? metrics.industryPe : 0;
    const peg = metrics.peg && metrics.peg > 0
      ? metrics.peg
      : metrics.pe > 0 && metrics.profitCagr5Y > 0
        ? metrics.pe / metrics.profitCagr5Y
        : 0;
    const hasIndustryPe = metricAvailable('Industry P/E') && industryPe > 0;
    const hasPeg = metricAvailable('P/E Ratio') && peg > 0;

    if (hasIndustryPe && metrics.pe > 0 && metrics.pe <= industryPe * 0.9) {
      valScore += 4;
      valDetails.push(`Attractive P/E (${metrics.pe.toFixed(1)} vs industry ${industryPe.toFixed(1)})`);
    } else if (hasIndustryPe && metrics.pe > 0 && metrics.pe <= industryPe * 1.25) {
      valScore += 2.5;
      valDetails.push(`Fair P/E (${metrics.pe.toFixed(1)} vs industry ${industryPe.toFixed(1)})`);
    } else if (hasIndustryPe && metrics.pe > 0) {
      valScore += 1;
      valDetails.push(`Premium P/E (${metrics.pe.toFixed(1)} vs industry ${industryPe.toFixed(1)})`);
    } else if (!hasIndustryPe) {
      valDetails.push('Industry P/E unavailable; relative P/E is not scored');
    } else {
      valDetails.push(`Loss making or extreme valuation`);
    }

    if (hasPeg && peg <= 1.2) {
      valScore += 4;
      valDetails.push(`Favorable growth valuation (PEG ${peg.toFixed(2)} <= 1.2)`);
    } else if (hasPeg && peg <= 1.8) {
      valScore += 2.5;
      valDetails.push(`Acceptable PEG (${peg.toFixed(2)})`);
    } else if (hasPeg) {
      valScore += 0.5;
      valDetails.push(`Elevated PEG (${peg.toFixed(2)})`);
    } else {
      valDetails.push('PEG unavailable; growth-relative valuation is not scored');
    }

    if (metrics.fcfCr > 0 && metrics.marketCapCr > 0) {
      const fcfYield = (metrics.fcfCr / metrics.marketCapCr) * 100;
      if (fcfYield >= 3) {
        valScore += 2;
        valDetails.push(`Attractive FCF yield (${fcfYield.toFixed(1)}%)`);
      } else {
        valScore += 1;
        valDetails.push(`Moderate FCF yield (${fcfYield.toFixed(1)}%)`);
      }
    }
    const valuationScore: DimensionScore = {
      score: Math.min(10, Math.round(valScore * 10) / 10),
      maxScore: 10,
      details: valDetails.join('; ')
    };

    // 7. Management & Governance (Max 5)
    // Criteria: Promoter holding healthy (>40-50%), Promoter pledge = 0%
    let mgScore = 0;
    const mgDetails: string[] = [];
    if (!hasPromoterPledge) {
      mgDetails.push('Promoter pledge data unavailable');
    } else if (metrics.promoterPledge === 0) {
      mgScore += 3;
      mgDetails.push(`Zero promoter pledge (0.0%)`);
    } else if (metrics.promoterPledge <= 5) {
      mgScore += 1.5;
      mgDetails.push(`Minor promoter pledge (${metrics.promoterPledge.toFixed(1)}%)`);
    } else {
      mgDetails.push(`WARNING: High promoter pledge (${metrics.promoterPledge.toFixed(1)}%)`);
    }

    if (!hasPromoterHolding) {
      mgDetails.push('Promoter holding data unavailable');
    } else if (metrics.promoterHolding >= 50) {
      mgScore += 2;
      mgDetails.push(`Substantial promoter stake (${metrics.promoterHolding.toFixed(1)}%)`);
    } else if (metrics.promoterHolding >= 35) {
      mgScore += 1.5;
      mgDetails.push(`Decent promoter stake (${metrics.promoterHolding.toFixed(1)}%)`);
    } else {
      mgScore += 0.5;
      mgDetails.push(`Lower promoter stake (${metrics.promoterHolding.toFixed(1)}%) or widely institutional`);
    }
    const managementScore: DimensionScore = {
      score: Math.min(5, Math.round(mgScore * 10) / 10),
      maxScore: 5,
      details: mgDetails.join('; ')
    };

    // 8. Competitive Moat (Max 5)
    // Inferred from market position, pricing power (high OPM), and high ROCE
    let mtScore = 0;
    const mtDetails: string[] = [];
    if (hasRoce && hasOperatingMargin && metrics.roce >= 20 && metrics.opm >= 18) {
      mtScore += 5;
      mtDetails.push(`High pricing power and durable economic moat indicated by superior ROCE & margins`);
    } else if (hasRoce && hasOperatingMargin && metrics.roce >= 15 && metrics.opm >= 12) {
      mtScore += 3.5;
      mtDetails.push(`Moderate economic moat / established brand power`);
    } else if (!hasRoce || !hasOperatingMargin) {
      mtDetails.push('ROCE or operating margin data unavailable');
    } else {
      mtScore += 2;
      mtDetails.push(`Narrow or commoditized moat`);
    }
    const moatScore: DimensionScore = {
      score: Math.min(5, Math.round(mtScore * 10) / 10),
      maxScore: 5,
      details: mtDetails.join('; ')
    };

    // Total Score
    const totalScore = Math.round(
      (businessQualityScore.score +
      growthScore.score +
      profitabilityScore.score +
      financialStrengthScore.score +
      cashFlowScore.score +
      valuationScore.score +
      managementScore.score +
      moatScore.score) * 10
    ) / 10;

    // AI Disruption Classification
    const { aiRisk, aiConfidence, aiReasoning } = this.classifyAiRisk(metrics);

    // Priority 10 Checks (10 Checks x 10 Points = 100 Point Quality Score)
    const epsGrowthVal = metrics.epsCagr5Y ?? 0;
    const hasPe = metricAvailable('P/E Ratio') && metrics.pe > 0;
    const hasPriorityValuation = hasPeg || hasPe;
    const valuationReasonable = hasPeg
      ? peg <= 1.8
      : (industryPe > 0 ? metrics.pe <= industryPe * 1.25 : metrics.pe <= 30);
    const valuationScoreItem = hasPeg
      ? (peg <= 1.2 ? 10 : peg <= 1.8 ? 8 : peg <= 2.5 ? 4 : 1)
      : hasPe
        ? (industryPe > 0 ? (metrics.pe <= industryPe * 0.95 ? 10 : metrics.pe <= industryPe * 1.25 ? 8 : 4) : (metrics.pe <= 20 ? 8 : metrics.pe <= 30 ? 6 : 2))
        : 0;
    const valuationDisplayVal = hasPeg
      ? `PEG ${peg.toFixed(2)} (P/E ${metrics.pe.toFixed(1)})`
      : hasPe
        ? `P/E ${metrics.pe.toFixed(1)}${industryPe > 0 ? ` (Sector ${industryPe.toFixed(1)})` : ''}`
        : 'N/A';
    const valuationComment = !hasPriorityValuation
      ? 'PEG or P/E data unavailable'
      : valuationReasonable
        ? (hasPeg ? 'Reasonable valuation given growth' : 'P/E multiple within acceptable bounds')
        : 'Valuation appears stretched';

    const hasDmaTrend = metrics.priceAboveDma200 !== undefined;
    const priority10Checks: CheckItem[] = [
      {
        name: '5Y Sales CAGR > 10%',
        passed: hasSalesGrowth && metrics.salesCagr5Y >= 10,
        value: hasSalesGrowth ? `${metrics.salesCagr5Y.toFixed(1)}%` : 'N/A',
        threshold: '> 10%',
        score: !hasSalesGrowth ? 0 : metrics.salesCagr5Y >= 15 ? 10 : metrics.salesCagr5Y >= 10 ? 8 : metrics.salesCagr5Y >= 5 ? 4 : 1,
        maxScore: 10,
        weight: 10,
        dimension: 'Growth',
        comment: !hasSalesGrowth ? 'Sales growth data unavailable' : metrics.salesCagr5Y >= 10 ? 'Compounding sales comfortably' : 'Sales growth below target'
      },
      {
        name: '5Y Profit CAGR > 12%',
        passed: hasProfitGrowth && metrics.profitCagr5Y >= 12,
        value: hasProfitGrowth ? `${metrics.profitCagr5Y.toFixed(1)}%` : 'N/A',
        threshold: '> 12%',
        score: !hasProfitGrowth ? 0 : metrics.profitCagr5Y >= 18 ? 10 : metrics.profitCagr5Y >= 12 ? 8 : metrics.profitCagr5Y >= 5 ? 4 : 1,
        maxScore: 10,
        weight: 10,
        dimension: 'Growth',
        comment: !hasProfitGrowth ? 'Profit growth data unavailable' : metrics.profitCagr5Y >= 12 ? 'Robust bottom-line compounding' : 'Profit growth lagging hurdle'
      },
      {
        name: '5Y EPS CAGR / Momentum > 12%',
        passed: hasEpsGrowth && epsGrowthVal >= 12,
        value: hasEpsGrowth ? `${epsGrowthVal.toFixed(1)}%` : 'N/A',
        threshold: '> 12%',
        score: !hasEpsGrowth ? 0 : epsGrowthVal >= 15 ? 10 : epsGrowthVal >= 12 ? 8 : epsGrowthVal > 0 ? 4 : 0,
        maxScore: 10,
        weight: 10,
        dimension: 'Growth',
        comment: !hasEpsGrowth ? 'EPS growth data unavailable' : epsGrowthVal >= 12 ? 'Solid per-share compounding' : 'EPS momentum under hurdle'
      },
      {
        name: 'ROCE > 15%',
        passed: hasRoce && metrics.roce >= 15,
        value: hasRoce ? `${metrics.roce.toFixed(1)}%` : 'N/A',
        threshold: '> 15%',
        score: !hasRoce ? 0 : metrics.roce >= 22 ? 10 : metrics.roce >= 15 ? 8 : metrics.roce >= 10 ? 4 : 0,
        maxScore: 10,
        weight: 10,
        dimension: 'Business Quality',
        comment: !hasRoce ? 'ROCE data unavailable' : metrics.roce >= 15 ? 'Efficient capital deployment' : 'Capital return inadequate'
      },
      {
        name: 'ROE > 15%',
        passed: hasRoe && metrics.roe >= 15,
        value: hasRoe ? `${metrics.roe.toFixed(1)}%` : 'N/A',
        threshold: '> 15%',
        score: !hasRoe ? 0 : metrics.roe >= 20 ? 10 : metrics.roe >= 15 ? 8 : metrics.roe >= 10 ? 4 : 0,
        maxScore: 10,
        weight: 10,
        dimension: 'Profitability',
        comment: !hasRoe ? 'ROE data unavailable' : metrics.roe >= 15 ? 'Strong return on shareholder equity' : 'ROE below 15%'
      },
      {
        name: 'Debt / Equity < 0.5',
        passed: hasDebtEquity && metrics.debtEquity <= 0.5,
        value: hasDebtEquity ? metrics.debtEquity.toFixed(2) : 'N/A',
        threshold: '< 0.50',
        score: !hasDebtEquity ? 0 : metrics.debtEquity <= 0.1 ? 10 : metrics.debtEquity <= 0.5 ? 8 : metrics.debtEquity <= 0.8 ? 4 : 0,
        maxScore: 10,
        weight: 10,
        dimension: 'Financial Strength',
        comment: !hasDebtEquity ? 'Debt-to-equity data unavailable' : metrics.debtEquity <= 0.5 ? 'Conservative balance sheet' : 'Leverage exceeds preferred limit'
      },
      {
        name: 'Positive Free Cash Flow',
        passed: hasFreeCashFlow && metrics.fcfCr > 0,
        value: hasFreeCashFlow ? `₹${metrics.fcfCr.toFixed(0)} Cr` : 'N/A',
        threshold: '> ₹0 Cr',
        score: !hasFreeCashFlow ? 0 : metrics.fcfCr > 0 && metrics.fcfPositiveYears >= 4 ? 10 : metrics.fcfCr > 0 ? 7 : 0,
        maxScore: 10,
        weight: 10,
        dimension: 'Cash-Flow Quality',
        comment: !hasFreeCashFlow ? 'Free cash flow data unavailable' : metrics.fcfCr > 0 ? 'Cash generative business' : 'Free cash flow is negative'
      },
      {
        name: 'Promoter Pledge = 0%',
        passed: hasPromoterPledge && metrics.promoterPledge === 0,
        value: hasPromoterPledge ? `${metrics.promoterPledge.toFixed(1)}%` : 'N/A',
        threshold: '0.0%',
        score: !hasPromoterPledge ? 0 : metrics.promoterPledge === 0 ? 10 : metrics.promoterPledge <= 5 ? 5 : 0,
        maxScore: 10,
        weight: 10,
        dimension: 'Management & Governance',
        comment: !hasPromoterPledge ? 'Promoter pledge data unavailable' : metrics.promoterPledge === 0 ? 'Clean promoter holding without encumbrance' : 'Promoter shares pledged'
      },
      {
        name: 'Reasonable Valuation (PEG <= 1.8)',
        passed: hasPriorityValuation && valuationReasonable,
        value: valuationDisplayVal,
        threshold: 'PEG <= 1.8',
        score: valuationScoreItem,
        maxScore: 10,
        weight: 10,
        dimension: 'Valuation',
        comment: valuationComment
      },
      {
        name: 'Competitive Moat & Technical Trend',
        passed: hasRoce && metrics.roce >= 15,
        value: !hasRoce ? 'N/A' : (hasDmaTrend && metrics.priceAboveDma200 === true ? `Moat Intact (ROCE ${metrics.roce.toFixed(1)}%) + Above 200-DMA` : `Moat Intact (ROCE ${metrics.roce.toFixed(1)}%)`),
        threshold: 'ROCE > 15%',
        score: !hasRoce ? 0 : (hasDmaTrend && metrics.priceAboveDma200 === true && metrics.roce >= 20 && metrics.opm >= 18) ? 10 : (hasDmaTrend && metrics.priceAboveDma200 === true && metrics.roce >= 15) ? 8 : metrics.roce >= 15 ? 6 : 2,
        maxScore: 10,
        weight: 10,
        dimension: 'Moat & Technicals',
        comment: !hasRoce ? 'ROCE data unavailable' : (hasDmaTrend && metrics.priceAboveDma200 === true ? 'Durable economic moat & positive technical momentum' : 'Durable economic moat; consolidation below 200-DMA')
      }
    ];

    // Priority 10 Quality Score out of 100
    const priority10Score = Math.round(
      priority10Checks.reduce((sum, c) => sum + (c.score || 0), 0) * 10
    ) / 10;

    const passedChecks = priority10Checks.filter(c => c.passed).map(c => c.name);
    const failedChecks = priority10Checks.filter(c => !c.passed).map(c => `${c.name}: ${c.value} (target ${c.threshold})`);

    // Warnings
    const warnings: string[] = [];
    if (metrics.promoterPledge > 0) {
      warnings.push(`Promoter shares pledged: ${metrics.promoterPledge.toFixed(1)}%`);
    }
    if (metrics.debtEquity > 0.8) {
      warnings.push(`High debt-to-equity ratio of ${metrics.debtEquity.toFixed(2)}`);
    }
    if (metrics.fcfCr < 0) {
      warnings.push(`Negative free cash flow of ₹${metrics.fcfCr.toFixed(0)} Cr`);
    }
    if (cfoRatio < 0.7 && metrics.patCr > 0) {
      warnings.push(`CFO significantly trailing PAT (CFO/PAT = ${cfoRatio.toFixed(2)})`);
    }
    if (metrics.priceAboveDma200 === false) {
      warnings.push(`Trading below 200-DMA (₹${metrics.price} vs DMA ₹${metrics.dma200?.toFixed(1)})`);
    }
    if (aiRisk === 'VULNERABLE') {
      warnings.push(`AI Disruption Vulnerability: ${aiReasoning}`);
    }

    // Suitability Category
    let suitability: 'EXCELLENT' | 'GOOD' | 'RESEARCH_REQUIRED' | 'AVOID';
    if (totalScore >= 80 && failedChecks.length <= 2 && aiRisk !== 'VULNERABLE') {
      suitability = 'EXCELLENT';
    } else if (totalScore >= 70 && failedChecks.length <= 3) {
      suitability = 'GOOD';
    } else if (totalScore >= 60) {
      suitability = 'RESEARCH_REQUIRED';
    } else {
      suitability = 'AVOID';
    }

    // Investment Attractiveness Index
    // Conceptual formula: Quality x Growth x Moat x Future Potential / Valuation (normalized)
    const qualityNorm = (businessQualityScore.score + profitabilityScore.score + financialStrengthScore.score + cashFlowScore.score) / 60;
    const growthNorm = growthScore.score / 20;
    const moatNorm = (moatScore.score + managementScore.score) / 10;
    const valuationRatio = metrics.pe > 0 && hasIndustryPe ? metrics.pe / industryPe : null;
    const valDivisor = valuationRatio !== null ? Math.max(0.5, Math.min(2.5, valuationRatio)) : 1;
    const rawAttractiveness = (qualityNorm * 1.5 + growthNorm * 1.2 + moatNorm * 1.0) / valDivisor;
    const investmentAttractivenessIndex = Math.min(100, Math.max(10, Math.round(rawAttractiveness * 25 * 10) / 10));

    // Thesis & Key Risks
    const thesis = `${metrics.name} (${metrics.symbol}) scores ${totalScore}/100 with ${passedChecks.length}/10 priority checks passed. ` +
      `It exhibits ${metrics.roce >= 15 ? 'superior' : 'modest'} capital return (ROCE ${metrics.roce.toFixed(1)}%) and ` +
      `${metrics.debtEquity <= 0.5 ? 'prudent debt management' : 'elevated leverage'}. ` +
      `Classified as ${aiRisk} regarding AI disruption risk.`;

    const keyRisks: string[] = [];
    if (hasIndustryPe && metrics.pe > industryPe * 1.3) keyRisks.push(`Valuation multiple (P/E ${metrics.pe.toFixed(1)}) is well above sector average (${industryPe.toFixed(1)})`);
    if (metrics.debtEquity > 0.5) keyRisks.push(`Debt-to-equity of ${metrics.debtEquity.toFixed(2)} may restrict reinvestment capacity`);
    if (metrics.fcfCr <= 0) keyRisks.push(`Company is consuming cash (FCF negative) rather than self-funding expansion`);
    if (aiRisk === 'VULNERABLE') keyRisks.push(`Core business operations risk commoditization or substitution by AI technologies`);
    if (keyRisks.length === 0) keyRisks.push(`General market volatility, sector cyclicality, and raw material or regulatory price changes`);

    // Price Target Range Recommendation (Buy & Sell Price Ranges)
    const priceTargetRange = this.calculatePriceTargetRange(metrics, totalScore);

    const result: StockAnalysis = {
      id: `ANL-${metrics.symbol}-${Date.now()}`,
      symbol: metrics.symbol,
      name: metrics.name,
      analysisDate: new Date().toISOString(),
      metrics,
      businessQualityScore,
      growthScore,
      profitabilityScore,
      financialStrengthScore,
      cashFlowScore,
      valuationScore,
      managementScore,
      moatScore,
      totalScore,
      priority10Score,
      priceTargetRange,
      aiRisk,
      aiConfidence,
      aiReasoning,
      priority10Checks,
      passedChecks,
      failedChecks,
      warnings,
      suitability,
      investmentAttractivenessIndex,
      thesis,
      keyRisks,
      dataAsOf: metrics.snapshotDate
    };

    // Record in audit trail
    auditTrail.record(
      'STOCK_ANALYSIS',
      metrics.sourceUrl,
      metrics.symbol,
      {
        price: metrics.price,
        pe: metrics.pe,
        roce: metrics.roce,
        roe: metrics.roe,
        debtEquity: metrics.debtEquity,
        fcfCr: metrics.fcfCr,
        promoterPledge: metrics.promoterPledge
      },
      totalScore,
      suitability === 'EXCELLENT' || suitability === 'GOOD' ? 'PASS' : suitability === 'RESEARCH_REQUIRED' ? 'WARNING' : 'FAIL'
    );

    return result;
  }

  /**
   * Deterministic AI Disruption assessment based on sector, product, and tech integration
   */
  private static classifyAiRisk(metrics: StockMetricsSnapshot): {
    aiRisk: AiRiskClassification;
    aiConfidence: number;
    aiReasoning: string;
  } {
    const sector = (metrics.sector || '').toLowerCase();
    const industry = (metrics.industry || '').toLowerCase();
    const name = metrics.name.toLowerCase();

    // Red flag / vulnerable sectors: pure routine BPO, entry-level coding services without IP
    if (industry.includes('bpo') || industry.includes('call center') || industry.includes('data entry')) {
      return {
        aiRisk: 'VULNERABLE',
        aiConfidence: 0.85,
        aiReasoning: 'Core workflows of routine customer service and data entry face direct automation by generative AI agents.'
      };
    }

    // Green / AI Beneficiaries: Tech leaders with deep enterprise IP, semiconductor, cloud infrastructure, AI platform engineering, proprietary data
    if (
      sector.includes('information technology') ||
      industry.includes('software') ||
      name.includes('tcs') ||
      name.includes('infosys') ||
      name.includes('hcl') ||
      name.includes('tech mahindra') ||
      name.includes('l&t technology') ||
      industry.includes('telecom')
    ) {
      return {
        aiRisk: 'BENEFICIARY',
        aiConfidence: 0.82,
        aiReasoning: 'Significant proprietary client context, enterprise migration budgets, and massive productivity leverage from enterprise AI co-pilots.'
      };
    }

    // Physical, asset-heavy, FMCG, banking, energy, manufacturing are predominantly AI Neutral
    if (
      sector.includes('fmcg') ||
      sector.includes('energy') ||
      sector.includes('finance') ||
      sector.includes('bank') ||
      sector.includes('auto') ||
      sector.includes('pharmaceutical') ||
      sector.includes('chemical') ||
      sector.includes('metals')
    ) {
      return {
        aiRisk: 'NEUTRAL',
        aiConfidence: 0.90,
        aiReasoning: 'Physical assets, regulatory moats, and consumer brands cannot be substituted by AI; AI acts as an internal efficiency booster.'
      };
    }

    return {
      aiRisk: 'NEUTRAL',
      aiConfidence: 0.70,
      aiReasoning: 'Operational efficiency gains without existential threat to core product delivery.'
    };
  }

  /**
   * Deterministically calculate better price ranges to BUY and SELL
   * according to portfolio rules and fundamental support/resistance.
   */
  public static calculatePriceTargetRange(metrics: StockMetricsSnapshot, totalScore: number): StockPriceTargetRange {
    const price = metrics.price;
    const dma200 = metrics.dma200 || (metrics.priceAboveDma200 !== false ? Math.round(price * 0.95) : Math.round(price * 1.05));
    const nseHigh52 = metrics.nseQuote?.high52 || metrics.bseQuote?.high52;
    const nseLow52 = metrics.nseQuote?.low52 || metrics.bseQuote?.low52;
    const high52 = nseHigh52 || Math.round(price * 1.25);
    const low52 = nseLow52 || Math.round(price * 0.75);
    const isLargeCap = metrics.marketCapCategory === 'LARGE_CAP';
    const isMidSmallCap = metrics.marketCapCategory === 'MID_CAP' || metrics.marketCapCategory === 'SMALL_CAP';

    // 1. Buy Range Calculation:
    // For high quality stocks (score >= 75):
    let buyRangeMin: number;
    let buyRangeMax: number;

    if (totalScore >= 75) {
      if (metrics.priceAboveDma200 !== false) {
        // Trading above 200-DMA: Buy zone between 200-DMA / 6% pullback and current price
        buyRangeMin = Math.round(Math.max(dma200 * 0.98, price * 0.92));
        buyRangeMax = Math.round(Math.min(price * 1.02, Math.max(price * 0.98, buyRangeMin * 1.08)));
      } else {
        // Trading below 200-DMA: Value accumulation zone between support and 200-DMA test
        buyRangeMin = Math.round(Math.max(low52 * 1.05, price * 0.90));
        buyRangeMax = Math.round(price * 0.98);
      }
    } else {
      // Moderate / Lower quality stock: Require steeper margin of safety
      buyRangeMin = Math.round(Math.max(low52, price * 0.85));
      buyRangeMax = Math.round(price * 0.93);
    }

    if (buyRangeMin >= buyRangeMax) {
      buyRangeMin = Math.round(buyRangeMax * 0.92);
    }

    // 2. Sell Range Calculation:
    // Mid/Small cap rule from docs/INVESTMENT_RULES.md: sell on 10-15% return to reduce risk
    // Large cap rule from docs/INVESTMENT_RULES.md: long-term hold, compounding target 15-25%
    let sellRangeMin: number;
    let sellRangeMax: number;

    if (isMidSmallCap) {
      sellRangeMin = Math.round(price * 1.10); // +10% profit booking trigger
      sellRangeMax = Math.round(price * 1.15); // +15% target profit hurdle
    } else {
      sellRangeMin = Math.round(price * 1.15); // +15% medium-term milestone
      sellRangeMax = Math.round(Math.max(high52, price * 1.25)); // +25% or 52W high test
    }

    if (sellRangeMax <= sellRangeMin) {
      sellRangeMax = Math.round(sellRangeMin * 1.08);
    }

    const stopLoss = Math.round(Math.min(price * 0.92, dma200 ? dma200 * 0.96 : price * 0.92));
    const target1 = sellRangeMin;
    const target2 = sellRangeMax;
    const supportLevel = Math.round(Math.min(buyRangeMin, dma200));
    const resistanceLevel = Math.round(Math.max(sellRangeMax, high52));

    let buyStatus: 'IN_BUY_ZONE' | 'DEEP_VALUE' | 'WAIT_FOR_PULLBACK';
    let buyStatusLabel: string;
    if (price >= buyRangeMin && price <= buyRangeMax) {
      buyStatus = 'IN_BUY_ZONE';
      buyStatusLabel = '🟢 Currently in Optimal Buy Zone';
    } else if (price < buyRangeMin) {
      buyStatus = 'DEEP_VALUE';
      buyStatusLabel = '💎 Deep Value / Discount Zone';
    } else {
      buyStatus = 'WAIT_FOR_PULLBACK';
      buyStatusLabel = `⏳ Wait for Pullback (${((price - buyRangeMax) / buyRangeMax * 100).toFixed(1)}% above entry)`;
    }

    const industryPe = metrics.industryPe ?? 0;
    const isValuationExtreme = (metrics.pe > 75) ||
      (industryPe > 0 && metrics.pe > industryPe * 1.8) ||
      (metrics.peg !== undefined && metrics.peg >= 2.5);
    const isNearResistance = high52 > 0 && price >= high52 * 0.98;

    let sellStatus: 'IN_SELL_ZONE' | 'UPSIDE_AHEAD' | 'OVERVALUED_EXTREME';
    let sellStatusLabel: string;
    if (isValuationExtreme) {
      sellStatus = 'OVERVALUED_EXTREME';
      sellStatusLabel = '⚠️ Valuation Stretched — Consider Trimming';
    } else if (price >= sellRangeMin || isNearResistance) {
      sellStatus = 'IN_SELL_ZONE';
      sellStatusLabel = '🎯 In Profit Booking Zone / Resistance';
    } else {
      sellStatus = 'UPSIDE_AHEAD';
      sellStatusLabel = `📈 Room to Run (+${((sellRangeMin - price) / price * 100).toFixed(1)}% to Target 1)`;
    }

    const buyStrategy = isLargeCap
      ? `Large-cap accumulation: Stagger buys in 3 tranches between ₹${buyRangeMin.toLocaleString('en-IN')} and ₹${buyRangeMax.toLocaleString('en-IN')}. Strong compounding horizon (3-10 years).`
      : `Value Accumulation: Enter selectively between ₹${buyRangeMin.toLocaleString('en-IN')} and ₹${buyRangeMax.toLocaleString('en-IN')} on dips towards support with tight stop-loss.`;

    const sellStrategy = isMidSmallCap
      ? `Portfolio Rule: Small/Mid-cap 10–15% profit rule active. Book 50% partial profit at ₹${sellRangeMin.toLocaleString('en-IN')} (+10%) and full profit near ₹${sellRangeMax.toLocaleString('en-IN')} (+15%) to reduce volatility.`
      : `Portfolio Rule: Large-cap long-term holding rule. Core holding for multi-year compounding. Consider trimming only above ₹${sellRangeMax.toLocaleString('en-IN')} or on extreme valuation stretch.`;

    const upsidePercentMin = Math.round(((sellRangeMin - price) / price) * 1000) / 10;
    const upsidePercentMax = Math.round(((sellRangeMax - price) / price) * 1000) / 10;

    return {
      buyRangeMin,
      buyRangeMax,
      buyStatus,
      buyStatusLabel,
      buyStrategy,
      sellRangeMin,
      sellRangeMax,
      sellStatus,
      sellStatusLabel,
      sellStrategy,
      target1,
      target2,
      stopLoss,
      supportLevel,
      resistanceLevel,
      upsidePercentMin,
      upsidePercentMax
    };
  }
}
