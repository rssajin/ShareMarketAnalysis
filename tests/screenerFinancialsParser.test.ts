import { describe, expect, it } from 'vitest';
import {
  calculateDebtToEquity,
  calculateFiveYearCagr,
  calculateFreeCashFlow,
  extractAnnualMetricSeries,
  summarizeFreeCashFlow
} from '../src/adapters/screenerFinancialsParser';

describe('Screener financial statement parsing', () => {
  it('extracts annual EPS values and excludes trailing TTM data', () => {
    const html = `
      <section id="profit-loss">
        <table>
          <thead><tr><th></th><th>Mar 2019</th><th>Mar 2020</th><th>Mar 2021</th><th>Mar 2022</th><th>Mar 2023</th><th>Mar 2024</th><th>TTM</th></tr></thead>
          <tbody><tr><td class="text">EPS in Rs</td>
            <td class="number">10</td><td class="number">11</td><td class="number">12</td>
            <td class="number">13</td><td class="number">14</td><td class="number">15</td><td class="number">20</td>
          </tr></tbody>
        </table>
      </section>
    `;

    const series = extractAnnualMetricSeries(html, 'profit-loss', /^EPS in Rs$/i);
    expect(series).toEqual([10, 11, 12, 13, 14, 15]);
    expect(calculateFiveYearCagr(series)).toBeCloseTo((Math.pow(1.5, 1 / 5) - 1) * 100);
  });

  it('preserves missing statement periods instead of shifting older values forward', () => {
    const html = `
      <section id="cash-flow">
        <table>
          <thead><tr><th></th><th>Mar 2023</th><th>Mar 2024</th></tr></thead>
          <tbody><tr><td>Cash from Operating Activity</td><td>100</td><td>—</td></tr></tbody>
        </table>
      </section>
    `;

    expect(extractAnnualMetricSeries(html, 'cash-flow', /^Cash from Operating Activity$/i))
      .toEqual([100, undefined]);
  });

  it('parses source labels that include expandable plus markers', () => {
    const html = `
      <section id="cash-flow">
        <table>
          <thead><tr><th></th><th>Mar 2023</th><th>Mar 2024</th></tr></thead>
          <tbody>
            <tr><td><button>Cash from Operating Activity&nbsp;<span>+</span></button></td><td>100</td><td>120</td></tr>
            <tr><td>Free Cash Flow</td><td>80</td><td>90</td></tr>
          </tbody>
        </table>
      </section>
    `;

    expect(extractAnnualMetricSeries(html, 'cash-flow', /^Cash from Operating Activity$/i))
      .toEqual([100, 120]);
    expect(summarizeFreeCashFlow(extractAnnualMetricSeries(html, 'cash-flow', /^Free Cash Flow$/i)))
      .toEqual({ latest: 90, positiveYears: 2, yearsAvailable: 2 });
  });

  it('does not calculate EPS CAGR when endpoints are missing or non-positive', () => {
    expect(calculateFiveYearCagr([1, 2, 3, 4, 5])).toBeUndefined();
    expect(calculateFiveYearCagr([-1, 2, 3, 4, 5, 6])).toBeUndefined();
    expect(calculateFiveYearCagr([1, 2, 3, 4, 5, undefined])).toBeUndefined();
  });

  it('calculates free cash flow and its five-year positive count from CFO and capex', () => {
    const result = calculateFreeCashFlow([100, 120, 200], [20, 140, 60]);
    expect(result).toEqual({ latest: 140, positiveYears: 2, yearsAvailable: 3 });
    expect(calculateFreeCashFlow([100], undefined)).toBeUndefined();
    expect(calculateFreeCashFlow([100, undefined], [20, 20])).toBeUndefined();
  });

  it('derives debt-to-equity only from reported balance-sheet components', () => {
    const html = `
      <section id="balance-sheet">
        <table><tbody>
          <tr><td><button>Borrowings&nbsp;<span>+</span></button></td><td>150</td></tr>
          <tr><td>Short Term Borrowings</td><td>30</td></tr>
          <tr><td>Equity Capital</td><td>100</td></tr>
          <tr><td>Reserves</td><td>400</td></tr>
        </tbody></table>
      </section>
    `;

    expect(calculateDebtToEquity(html)).toBeCloseTo(0.3);
    expect(calculateDebtToEquity('<section id="balance-sheet"></section>')).toBeUndefined();
  });
});
