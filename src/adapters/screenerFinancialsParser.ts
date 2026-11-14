interface FinancialRow {
  label: string;
  values: Array<number | undefined>;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)));
}

function textContent(html: string): string {
  return decodeHtml(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFinancialLabel(label: string): string {
  return label.replace(/\s*\+\s*$/, '').trim();
}

function parseCellNumber(cell: string): number | undefined {
  const dataValue = cell.match(/\bdata-value\s*=\s*["'](-?[\d,]+(?:\.\d+)?)["']/i);
  const text = dataValue?.[1] ?? textContent(cell);
  const match = text.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return undefined;

  const value = Number(match[0].replace(/,/g, ''));
  if (!Number.isFinite(value)) return undefined;
  return !dataValue && /^\s*\(\s*\d/.test(text) ? -value : value;
}

function elementWithId(html: string, id: string): string | undefined {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const openingTag = new RegExp(
    `<([a-z][\\w:-]*)\\b(?=[^>]*\\bid\\s*=\\s*["']${escapedId}["'])[^>]*>`,
    'i'
  ).exec(html);
  if (!openingTag) return undefined;

  const tagName = openingTag[1];
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = openingTag.index;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html)) !== null) {
    if (/^<\//.test(match[0])) {
      depth--;
      if (depth === 0) return html.slice(openingTag.index, tagPattern.lastIndex);
    } else if (!/\/>$/.test(match[0])) {
      depth++;
    }
  }
  return undefined;
}

function getFinancialRows(html: string, sectionId: string): FinancialRow[] {
  const section = elementWithId(html, sectionId);
  if (!section) return [];

  const headerRow = section.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)?.[1] ?? '';
  const headers = Array.from(headerRow.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi), match => textContent(match[1]));
  const excludesTrailingTtm = headers.length > 0 && /\bTTM\b/i.test(headers[headers.length - 1]);
  const rows: FinancialRow[] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(section)) !== null) {
    const cells = Array.from(rowMatch[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi), match => match[1]);
    if (cells.length < 2) continue;

    const label = normalizeFinancialLabel(textContent(cells[0]));
    if (!label) continue;

    let values = cells.slice(1).map(parseCellNumber);
    if (excludesTrailingTtm && values.length >= headers.length - 1) values = values.slice(0, -1);
    rows.push({ label, values });
  }

  return rows;
}

export function extractAnnualMetricSeries(
  html: string,
  sectionId: string,
  label: RegExp
): Array<number | undefined> | undefined {
  const row = getFinancialRows(html, sectionId).find(candidate => label.test(candidate.label));
  if (!row) return undefined;
  return row.values.some(value => value !== undefined) ? row.values : undefined;
}

export function calculateFiveYearCagr(values: Array<number | undefined> | undefined): number | undefined {
  if (!values || values.length < 6) return undefined;
  const first = values[values.length - 6];
  const latest = values[values.length - 1];
  if (first === undefined || latest === undefined) return undefined;
  if (first <= 0 || latest <= 0) return undefined;
  return (Math.pow(latest / first, 1 / 5) - 1) * 100;
}

export function calculateFreeCashFlow(
  operatingCashFlow: Array<number | undefined> | undefined,
  capitalExpenditure: Array<number | undefined> | undefined
): { latest: number; positiveYears: number; yearsAvailable: number } | undefined {
  if (!operatingCashFlow?.length || !capitalExpenditure?.length) return undefined;

  const periods = Math.min(5, operatingCashFlow.length, capitalExpenditure.length);
  if (periods === 0) return undefined;
  const cashFlows = Array.from({ length: periods }, (_, index) => {
    const operating = operatingCashFlow[operatingCashFlow.length - periods + index];
    const capex = capitalExpenditure[capitalExpenditure.length - periods + index];
    return operating === undefined || capex === undefined
      ? undefined
      : operating - Math.abs(capex);
  });
  const latest = cashFlows[cashFlows.length - 1];
  if (latest === undefined || !Number.isFinite(latest)) return undefined;
  const availableCashFlows = cashFlows.filter((value): value is number => value !== undefined);
  return {
    latest,
    positiveYears: availableCashFlows.filter(value => value > 0).length,
    yearsAvailable: availableCashFlows.length
  };
}

export function summarizeFreeCashFlow(
  values: Array<number | undefined> | undefined
): { latest: number; positiveYears: number; yearsAvailable: number } | undefined {
  if (!values?.length) return undefined;
  const latest = values[values.length - 1];
  if (latest === undefined || !Number.isFinite(latest)) return undefined;
  const recentValues = values.slice(-5).filter((value): value is number => value !== undefined);
  return {
    latest,
    positiveYears: recentValues.filter(value => value > 0).length,
    yearsAvailable: recentValues.length
  };
}

export function calculateDebtToEquity(html: string): number | undefined {
  const rows = getFinancialRows(html, 'balance-sheet');
  const latestValue = (pattern: RegExp) => {
    const row = rows.find(candidate => pattern.test(candidate.label));
    if (!row) return undefined;
    return [...row.values].reverse().find((value): value is number => value !== undefined);
  };

  const totalBorrowings = latestValue(/^borrowings$/i);
  const borrowings = totalBorrowings ?? (() => {
    const longTerm = latestValue(/^long term borrowings$/i);
    const shortTerm = latestValue(/^(?:short term|current) borrowings$/i);
    return longTerm !== undefined || shortTerm !== undefined
      ? (longTerm ?? 0) + (shortTerm ?? 0)
      : undefined;
  })();
  const equityCapital = latestValue(/^(?:equity share capital|equity capital)$/i);
  const reserves = latestValue(/^reserves$/i);

  if (borrowings !== undefined && equityCapital !== undefined && reserves !== undefined) {
    const equity = equityCapital + reserves;
    if (equity > 0) return borrowings / equity;
  }

  return undefined;
}

export function extractRatioValue(html: string, labels: RegExp[]): string | undefined {
  const nameMatches = Array.from(html.matchAll(
    /<span\b[^>]*class\s*=\s*["'][^"']*\bname\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
  ));
  for (let index = 0; index < nameMatches.length; index++) {
    const nameMatch = nameMatches[index];
    const name = textContent(nameMatch[1]);
    if (!labels.some(label => label.test(name))) continue;
    const end = nameMatches[index + 1]?.index ?? html.length;
    const fragment = html.slice(nameMatch.index! + nameMatch[0].length, end);
    const numberMatch = /<span\b[^>]*class\s*=\s*["'][^"']*\bnumber\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(fragment);
    if (numberMatch) return textContent(numberMatch[1]);
  }
  return undefined;
}

export function extractOperatingProfitMargin(html: string): number | undefined {
  const ratioText = extractRatioValue(html, [/^OPM$/i, /^Operating Profit Margin$/i, /^OPM\s*%/i]);
  if (ratioText) {
    const num = parseFloat(ratioText.replace(/,/g, '').trim());
    if (Number.isFinite(num)) return num;
  }
  const plSeries = extractAnnualMetricSeries(html, 'profit-loss', /^OPM(?:\s*%)?$/i);
  if (plSeries && plSeries.length > 0) {
    const latest = [...plSeries].reverse().find((v): v is number => v !== undefined);
    if (latest !== undefined && Number.isFinite(latest)) return latest;
  }
  const qSeries = extractAnnualMetricSeries(html, 'quarters', /^OPM(?:\s*%)?$/i);
  if (qSeries && qSeries.length > 0) {
    const latest = [...qSeries].reverse().find((v): v is number => v !== undefined);
    if (latest !== undefined && Number.isFinite(latest)) return latest;
  }
  return undefined;
}

export function extractInterestCoverage(html: string): number | undefined {
  const ratioText = extractRatioValue(html, [/^Interest Coverage$/i, /^Int Coverage$/i]);
  if (ratioText) {
    const num = parseFloat(ratioText.replace(/,/g, '').trim());
    if (Number.isFinite(num)) return num;
  }
  const opSeries = extractAnnualMetricSeries(html, 'profit-loss', /^Operating Profit$/i);
  const intSeries = extractAnnualMetricSeries(html, 'profit-loss', /^Interest$/i);
  if (opSeries && opSeries.length > 0) {
    const latestOp = [...opSeries].reverse().find((v): v is number => v !== undefined);
    const latestInt = intSeries ? [...intSeries].reverse().find((v): v is number => v !== undefined) : 0;
    if (latestOp !== undefined && Number.isFinite(latestOp) && latestOp > 0) {
      if (latestInt === undefined || latestInt <= 0) {
        return 50; // Virtually debt-free
      }
      return Math.round((latestOp / latestInt) * 10) / 10;
    }
  }
  return undefined;
}

export function extractRoceConsistencyYears(html: string): number | undefined {
  const roceSeries = extractAnnualMetricSeries(html, 'ratios', /^ROCE(?:\s*%)?$/i);
  if (!roceSeries || roceSeries.length === 0) return undefined;
  const valid = roceSeries.filter((v): v is number => v !== undefined && Number.isFinite(v));
  if (valid.length === 0) return undefined;
  let count = 0;
  for (let i = valid.length - 1; i >= 0; i--) {
    if (valid[i] >= 15) count++;
    else break;
  }
  return count;
}

export function extractQuarterlyGrowth(html: string): { quarterlySalesGrowth?: number; quarterlyProfitGrowth?: number } {
  const salesSeries = extractAnnualMetricSeries(html, 'quarters', /^Sales$/i);
  const profitSeries = extractAnnualMetricSeries(html, 'quarters', /^Net Profit$/i);
  let quarterlySalesGrowth: number | undefined;
  let quarterlyProfitGrowth: number | undefined;

  if (salesSeries && salesSeries.length >= 5) {
    const latest = salesSeries[salesSeries.length - 1];
    const prevYearQuarter = salesSeries[salesSeries.length - 5];
    if (latest !== undefined && prevYearQuarter !== undefined && prevYearQuarter > 0) {
      quarterlySalesGrowth = Math.round(((latest - prevYearQuarter) / prevYearQuarter) * 1000) / 10;
    }
  }

  if (profitSeries && profitSeries.length >= 5) {
    const latest = profitSeries[profitSeries.length - 1];
    const prevYearQuarter = profitSeries[profitSeries.length - 5];
    if (latest !== undefined && prevYearQuarter !== undefined && prevYearQuarter > 0) {
      quarterlyProfitGrowth = Math.round(((latest - prevYearQuarter) / prevYearQuarter) * 1000) / 10;
    }
  }

  return { quarterlySalesGrowth, quarterlyProfitGrowth };
}

export function extractIndustryPe(html: string): number | undefined {
  const ratioText = extractRatioValue(html, [/^Industry P\/E$/i, /^Ind P\/E$/i, /^Sector P\/E$/i]);
  if (ratioText) {
    const num = parseFloat(ratioText.replace(/,/g, '').trim());
    if (Number.isFinite(num) && num > 0) return num;
  }
  const match = html.match(/Industry\s*P\/E\s*:?[\s\S]*?<span[^>]*class=["']number["'][^>]*>\s*([0-9.]+)\s*<\/span>/i);
  if (match) {
    const num = parseFloat(match[1]);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return undefined;
}
