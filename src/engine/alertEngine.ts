import { Alert, AlertSeverity, Holding, StockAnalysis, PortfolioAnalysis } from '../domain/types';

class AlertService {
  private alerts: Alert[] = [];
  private maxAlerts = 200;

  public createAlert(
    type: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    suggestedAction?: string,
    portfolioId?: string
  ): Alert {
    const alert: Alert = {
      id: `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      portfolioId,
      type,
      severity,
      title,
      message,
      suggestedAction,
      createdAt: new Date().toISOString()
    };

    // Avoid duplicate unacknowledged alerts of same title
    const exists = this.alerts.some(a => a.title === title && !a.acknowledgedAt);
    if (!exists) {
      this.alerts.unshift(alert);
      if (this.alerts.length > this.maxAlerts) {
        this.alerts.pop();
      }
    }

    return alert;
  }

  public getAlerts(unacknowledgedOnly = false): Alert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledgedAt);
    }
    return this.alerts;
  }

  public acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.alerts = [];
  }

  /**
   * Monitor analyzed stock and trigger alerts if rules or safety standards are broken
   */
  public evaluateStockAlerts(analysis: StockAnalysis): Alert[] {
    const created: Alert[] = [];

    if (analysis.totalScore < 60) {
      created.push(this.createAlert(
        'QUALITY_DETERIORATION',
        'CRITICAL',
        `Low Quality Score: ${analysis.symbol} (${analysis.totalScore}/100)`,
        `${analysis.name} scored ${analysis.totalScore}/100, falling into the AVOID tier.`,
        'Re-evaluate holding thesis or consider exiting position.'
      ));
    }

    if (analysis.metrics.promoterPledge > 5) {
      created.push(this.createAlert(
        'PROMOTER_PLEDGE_HIGH',
        'CRITICAL',
        `High Promoter Pledge: ${analysis.symbol} (${analysis.metrics.promoterPledge.toFixed(1)}%)`,
        `Promoter pledged shares exceed safe threshold of 0%. Severe encumbrance risk.`,
        'Avoid new purchases; monitor promoter deleveraging closely.'
      ));
    }

    if (analysis.metrics.debtEquity > 1.0) {
      created.push(this.createAlert(
        'LEVERAGE_HIGH',
        'WARNING',
        `Excessive Debt: ${analysis.symbol} (D/E ${analysis.metrics.debtEquity.toFixed(2)})`,
        `Debt to equity is significantly higher than preferred limit of 0.50.`,
        'Verify interest coverage and free cash flow generation capacity.'
      ));
    }

    if (analysis.aiRisk === 'VULNERABLE') {
      created.push(this.createAlert(
        'AI_DISRUPTION_RISK',
        'WARNING',
        `AI Vulnerability: ${analysis.symbol}`,
        analysis.aiReasoning,
        'Assess whether the company possesses proprietary IP or switching costs.'
      ));
    }

    return created;
  }

  /**
   * Sync portfolio analysis alerts
   */
  public syncPortfolioAlerts(analysis: PortfolioAnalysis): void {
    for (const alt of analysis.alerts) {
      this.createAlert(
        alt.type,
        alt.severity,
        alt.title,
        alt.message,
        alt.suggestedAction,
        analysis.portfolioId
      );
    }
  }
}

export const alertService = new AlertService();
