/**
 * /api/prices — server-side proxy for live gold & silver spot prices in AUD.
 *
 * Fetches from Yahoo Finance (GC=F, SI=F) + open.er-api.com for USD→AUD.
 * Because this runs on the server there are no CORS restrictions.
 *
 * Response shape:
 * {
 *   goldUSD:   number,
 *   silverUSD: number,
 *   audRate:   number,
 *   goldAUD:   number,
 *   silverAUD: number,
 *   source:    "live" | "simulated",
 *   ts:        number   // unix ms
 * }
 */

import type { Express } from "express";

const BASE_GOLD_USD   = 4029;
const BASE_SILVER_USD = 56.82;
const BASE_AUD_RATE   = 1.45;

let lastGoldUSD   = BASE_GOLD_USD;
let lastSilverUSD = BASE_SILVER_USD;
let lastAudRate   = BASE_AUD_RATE;

async function fetchYahooPrice(symbol: string): Promise<number> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1m&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PriceBot/1.0)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${symbol}`);
  const data = await res.json() as {
    chart: { result: Array<{ meta: { regularMarketPrice: number } }> };
  };
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number" || price <= 0) throw new Error(`Bad Yahoo price for ${symbol}`);
  return price;
}

async function fetchAudRate(): Promise<number> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`er-api HTTP ${res.status}`);
  const data = await res.json() as { rates: Record<string, number> };
  const rate = data?.rates?.AUD;
  if (typeof rate !== "number" || rate <= 0) throw new Error("No AUD rate");
  return rate;
}

export function registerPricesProxy(app: Express): void {
  app.get("/api/prices", async (_req, res) => {
    try {
      const [goldUSD, silverUSD, audRate] = await Promise.all([
        fetchYahooPrice("GC=F"),
        fetchYahooPrice("SI=F"),
        fetchAudRate(),
      ]);

      // Update last-known values for simulated fallback
      lastGoldUSD   = goldUSD;
      lastSilverUSD = silverUSD;
      lastAudRate   = audRate;

      res.json({
        goldUSD,
        silverUSD,
        audRate,
        goldAUD:   goldUSD   * audRate,
        silverAUD: silverUSD * audRate,
        source:    "live",
        ts:        Date.now(),
      });
    } catch (err) {
      console.warn("[prices] Live fetch failed, using simulated drift:", (err as Error).message);

      const drift = () => 1 + (Math.random() - 0.5) * 0.0008;
      const goldUSD   = lastGoldUSD   * drift();
      const silverUSD = lastSilverUSD * drift();
      const audRate   = lastAudRate;

      res.json({
        goldUSD,
        silverUSD,
        audRate,
        goldAUD:   goldUSD   * audRate,
        silverAUD: silverUSD * audRate,
        source:    "simulated",
        ts:        Date.now(),
      });
    }
  });
}
