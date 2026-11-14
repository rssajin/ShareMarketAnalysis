import { ExchangeQuote } from '../domain/types';

export class NseAdapter {
  private static userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Fetch official NSE (National Stock Exchange) previous trading date market data.
   * Returns previous day close, open, high, low, 52W high/low, and trading date.
   */
  public static async getQuote(symbol: string): Promise<ExchangeQuote | null> {
    const cleanSymbol = symbol.toUpperCase().replace('.NS', '').replace('.BO', '');
    const nseTicker = `${cleanSymbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${nseTicker}?interval=1d&range=5d`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`NSE feed returned status ${res.status}`);
      }

      const json: any = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error(`No NSE data returned for ${cleanSymbol}`);

      const meta = result.meta || {};
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const closes: number[] = quote.close || [];
      const opens: number[] = quote.open || [];
      const highs: number[] = quote.high || [];
      const lows: number[] = quote.low || [];
      const volumes: number[] = quote.volume || [];

      // Find valid candles
      const validCandles: { time: number; close: number; open: number; high: number; low: number; volume: number }[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
          validCandles.push({
            time: timestamps[i],
            close: Math.round(closes[i] * 100) / 100,
            open: Math.round((opens[i] ?? closes[i]) * 100) / 100,
            high: Math.round((highs[i] ?? closes[i]) * 100) / 100,
            low: Math.round((lows[i] ?? closes[i]) * 100) / 100,
            volume: volumes[i] ?? 0
          });
        }
      }

      // Latest candle is current/most recent; previous candle is previous day
      const latest = validCandles.length > 0 ? validCandles[validCandles.length - 1] : null;
      const prev = validCandles.length > 1 ? validCandles[validCandles.length - 2] : null;

      // Previous trading day close price
      const previousClose = meta.chartPreviousClose ?? (prev ? prev.close : (latest ? latest.open : 0));
      const closePrice = meta.regularMarketPrice ?? (latest ? latest.close : previousClose);
      const tradingDate = latest
        ? new Date(latest.time * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const change = Math.round((closePrice - previousClose) * 100) / 100;
      const changePercent = previousClose > 0 ? Math.round(((closePrice - previousClose) / previousClose) * 10000) / 100 : 0;

      return {
        exchange: 'NSE',
        symbol: cleanSymbol,
        previousClose: Math.round(previousClose * 100) / 100,
        closePrice: Math.round(closePrice * 100) / 100,
        openPrice: latest ? latest.open : previousClose,
        dayHigh: meta.regularMarketDayHigh ?? (latest ? latest.high : closePrice),
        dayLow: meta.regularMarketDayLow ?? (latest ? latest.low : closePrice),
        change,
        changePercent,
        high52: meta.fiftyTwoWeekHigh ? Math.round(meta.fiftyTwoWeekHigh * 100) / 100 : undefined,
        low52: meta.fiftyTwoWeekLow ? Math.round(meta.fiftyTwoWeekLow * 100) / 100 : undefined,
        volume: meta.regularMarketVolume ?? (latest ? latest.volume : 0),
        tradingDate,
        dataTimestamp: new Date().toISOString(),
        status: 'PREV_DAY'
      };
    } catch (err: any) {
      console.warn(`[NseAdapter] Failed to fetch NSE quote for ${cleanSymbol}: ${err.message}`);
      return null;
    }
  }
}
