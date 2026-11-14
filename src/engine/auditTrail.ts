import { AuditRecord, RuleStatus } from '../domain/types';

class AuditTrailService {
  private records: AuditRecord[] = [];
  private maxRecords = 1000;

  public record(
    operation: string,
    sourceUrl: string,
    targetSymbolOrCode: string,
    rawMetricsSnapshot: any,
    calculatedScore?: number,
    ruleStatus?: RuleStatus
  ): AuditRecord {
    const entry: AuditRecord = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      operation,
      sourceUrl,
      targetSymbolOrCode,
      rawMetricsSnapshot,
      calculatedScore,
      ruleStatus
    };

    this.records.unshift(entry);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }
    return entry;
  }

  public getRecords(limit = 100): AuditRecord[] {
    return this.records.slice(0, limit);
  }

  public getRecordsForTarget(target: string): AuditRecord[] {
    return this.records.filter(r => r.targetSymbolOrCode.toUpperCase() === target.toUpperCase());
  }

  public clear(): void {
    this.records = [];
  }
}

export const auditTrail = new AuditTrailService();
