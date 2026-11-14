import { ExchangeQuote } from '../domain/types';

export class BseAdapter {
  private static userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Curated BSE Scrip Code directory for standard Indian stocks
  private static scripCodeMap: Record<string, string> = {
    // Large Cap
    TCS: '532540',
    INFY: '500209',
    HDFCBANK: '500180',
    ICICIBANK: '532174',
    RELIANCE: '500325',
    TATAMOTORS: '500570',
    ITC: '500875',
    LT: '500510',
    BHARTIARTL: '532454',
    SUNPHARMA: '524715',
    TITAN: '500114',
    BEL: '500049',
    SBIN: '500112',
    KOTAKBANK: '500247',
    HINDUNILVR: '500696',
    BAJFINANCE: '500034',
    ASIANPAINT: '500820',
    MARUTI: '532500',
    AXISBANK: '532215',
    WIPRO: '507685',
    HCLTECH: '532281',
    ULTRACEMCO: '532538',
    NTPC: '532555',
    POWERGRID: '532898',
    ONGC: '500312',
    COALINDIA: '533278',
    // Mid Cap
    POLYCAB: '542652',
    PERSISTENT: '533179',
    COFORGE: '532541',
    DIXON: '540699',
    TATAELXSI: '500408',
    ASTRAL: '532830',
    DEEPAKNTR: '506401',
    CUMMINSIND: '500480',
    // Small Cap
    KAYNES: '543664',
    CDSL: '542651',
    CAMS: '543232',
    ANGELONE: '543235',
    KPITTECH: '542651',
    SONACOMS: '543300',
    HBLPOWER: '517271',
    CLEAN: '543318'
  };

  /**
   * Fetch official BSE (Bombay Stock Exchange) previous trading date market data.
   * First tries official BSE India direct API (getScripHeaderData), then falls back to BSE exchange feed.
   */
  public static async getQuote(symbol: string): Promise<ExchangeQuote | null> {
    const cleanSymbol = symbol.toUpperCase().replace('.NS', '').replace('.BO', '');
    const scripCode = this.scripCodeMap[cleanSymbol];

    // Attempt 1: Official BSE India API if scrip code is known
    if (scripCode) {
      try {
        const bseApiUrl = `https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=${scripCode}`;
        const res = await fetch(bseApiUrl, {
          headers: {
            'User-Agent': this.userAgent,
            'Referer': 'https://www.bseindia.com/',
            'Origin': 'https://www.bseindia.com',
            'Accept': 'application/json, text/plain, */*'
          }
        });

        if (res.ok) {
          const data: any = await res.json();
          const header = data?.Header;
          const currRate = data?.CurrRate;

          if (header && (header.PrevClose || header.LTP)) {
            const parse = (val: any): number => {
              if (!val) return 0;
              const n = parseFloat(String(val).replace(/,/g, '').trim());
              return isNaN(n) ? 0 : n;
            };

            const previousClose = parse(header.PrevClose);
            const closePrice = parse(header.LTP || currRate?.LTP || previousClose);
            const openPrice = parse(header.Open) || previousClose;
            const dayHigh = parse(header.High) || closePrice;
            const dayLow = parse(header.Low) || closePrice;
            const change = parse(currRate?.Chg) || Math.round((closePrice - previousClose) * 100) / 100;
            const changePercent = parse(currRate?.PcChg) || (previousClose > 0 ? Math.round(((closePrice - previousClose) / previousClose) * 10000) / 100 : 0);

            // Trading Date from header.Ason e.g. "05 Oct 26 | 16:00"
            const ason = header.Ason || '';
            const tradingDate = ason.includes('|') ? ason.split('|')[0].trim() : (ason || new Date().toISOString().split('T')[0]);

            return {
              exchange: 'BSE',
              symbol: cleanSymbol,
              scripCode,
              previousClose: Math.round(previousClose * 100) / 100,
              closePrice: Math.round(closePrice * 100) / 100,
              openPrice: Math.round(openPrice * 100) / 100,
              dayHigh: Math.round(dayHigh * 100) / 100,
              dayLow: Math.round(dayLow * 100) / 100,
              change,
              changePercent,
              tradingDate,
              dataTimestamp: new Date().toISOString(),
              status: 'PREV_DAY'
            };
          }
        }
      } catch (err: any) {
        console.warn(`[BseAdapter] BSE direct API failed for ${cleanSymbol}: ${err.message}`);
      }
    }

    // Attempt 2: BSE Exchange feed (.BO)
    try {
      const bseTicker = `${cleanSymbol}.BO`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${bseTicker}?interval=1d&range=5d`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) throw new Error(`BSE feed status ${res.status}`);

      const json: any = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error(`No BSE quote for ${cleanSymbol}`);

      const meta = result.meta || {};
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const closes: number[] = quote.close || [];
      const opens: number[] = quote.open || [];
      const highs: number[] = quote.high || [];
      const lows: number[] = quote.low || [];
      const volumes: number[] = quote.volume || [];

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

      const latest = validCandles.length > 0 ? validCandles[validCandles.length - 1] : null;
      const prev = validCandles.length > 1 ? validCandles[validCandles.length - 2] : null;

      const previousClose = meta.chartPreviousClose ?? (prev ? prev.close : (latest ? latest.open : 0));
      const closePrice = meta.regularMarketPrice ?? (latest ? latest.close : previousClose);
      const tradingDate = latest
        ? new Date(latest.time * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const change = Math.round((closePrice - previousClose) * 100) / 100;
      const changePercent = previousClose > 0 ? Math.round(((closePrice - previousClose) / previousClose) * 10000) / 100 : 0;

      return {
        exchange: 'BSE',
        symbol: cleanSymbol,
        scripCode,
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
      console.warn(`[BseAdapter] Failed to fetch BSE quote for ${cleanSymbol}: ${err.message}`);
      return null;
    }
  }
}
