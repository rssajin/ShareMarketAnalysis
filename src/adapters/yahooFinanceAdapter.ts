export interface YahooStockQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  volume: number;
  currency: string;
  dma200?: number;
  priceAboveDma200?: boolean;
  historyCloses?: { date: string; close: number }[];
}

export class YahooFinanceAdapter {
  /**
   * Fetch live quote & 1-year historical prices from Yahoo Finance
   */
  public static async getStockQuote(symbol: string): Promise<YahooStockQuote> {
    const cleanSymbol = symbol.toUpperCase().replace('.NS', '').replace('.BO', '');
    const yahooSymbol = `${cleanSymbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1y`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result) {
        throw new Error(`No quote data returned for ${symbol}`);
      }

      const meta = result.meta;
      const timestamps = result.timestamp || [];
      const quoteObj = result.indicators?.quote?.[0] || {};
      const rawCloses = quoteObj.close || [];

      // Clean valid closes with dates
      const historyCloses: { date: string; close: number }[] = [];
      const validCloses: number[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const c = rawCloses[i];
        if (c !== null && c !== undefined && !isNaN(c)) {
          validCloses.push(c);
          historyCloses.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            close: Math.round(c * 100) / 100
          });
        }
      }

      const currentPrice = meta.regularMarketPrice ?? (validCloses.length > 0 ? validCloses[validCloses.length - 1] : 0);
      let dma200: number | undefined = undefined;
      let priceAboveDma200: boolean | undefined = undefined;

      if (validCloses.length >= 50) {
        const sliceLen = Math.min(validCloses.length, 200);
        const recent = validCloses.slice(-sliceLen);
        const sum = recent.reduce((acc, val) => acc + val, 0);
        dma200 = Math.round((sum / sliceLen) * 100) / 100;
        priceAboveDma200 = currentPrice >= dma200;
      }

      return {
        symbol: cleanSymbol,
        name: meta.longName || meta.shortName || cleanSymbol,
        price: currentPrice,
        change: meta.fulldayChange ?? 0,
        changePercent: meta.regularMarketChangePercent ?? 0,
        dayHigh: meta.regularMarketDayHigh ?? currentPrice,
        dayLow: meta.regularMarketDayLow ?? currentPrice,
        yearHigh: meta.fiftyTwoWeekHigh ?? currentPrice,
        yearLow: meta.fiftyTwoWeekLow ?? currentPrice,
        volume: meta.regularMarketVolume ?? 0,
        currency: meta.currency || 'INR',
        dma200,
        priceAboveDma200,
        historyCloses: historyCloses.slice(-90) // return last 90 trading days
      };
    } catch (err: any) {
      console.warn(`Yahoo Finance quote fetch failed for ${symbol}: ${err.message}`);
      // Fallback response with placeholder values if Yahoo is temporarily blocked
      return {
        symbol: cleanSymbol,
        price: 0,
        change: 0,
        changePercent: 0,
        dayHigh: 0,
        dayLow: 0,
        yearHigh: 0,
        yearLow: 0,
        volume: 0,
        currency: 'INR'
      };
    }
  }
}
