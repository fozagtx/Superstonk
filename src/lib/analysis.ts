import type { Candle } from "./dex";
import type { Verdict } from "./metrics";

export type Window = "1d" | "7d" | "30d";
export const WINDOWS: Window[] = ["1d", "7d", "30d"];
export const WINDOW_DAYS: Record<Window, number> = { "1d": 1, "7d": 7, "30d": 30 };

export function changePct(candles: Candle[], days: number): number | null {
  if (candles.length < 2) return null;
  const start = candles[Math.max(0, candles.length - 1 - days)]!.c;
  const last = candles[candles.length - 1]!.c;
  return start === 0 ? null : ((last - start) / start) * 100;
}

export function volatilityPct(candles: Candle[], days: number): number | null {
  if (candles.length < 3) return null;
  const closes = candles.slice(-(Math.min(candles.length, days + 1))).map((c) => c.c);
  const returns = closes
    .slice(1)
    .map((close, index) => Math.log(close / closes[index]!))
    .filter(Number.isFinite);
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

export function rangePosition(candles: Candle[], days: number): number | null {
  if (candles.length < 2) return null;
  const window = candles.slice(-Math.max(2, days));
  const lows = window.map((c) => c.l);
  const highs = window.map((c) => c.h);
  const minLow = Math.min(...lows);
  const maxHigh = Math.max(...highs);
  if (maxHigh === minLow) return null;
  return Math.min(1, Math.max(0, (window[window.length - 1]!.c - minLow) / (maxHigh - minLow)));
}

export interface Signal {
  kind: "momentum" | "premium" | "liquidity" | "divergence" | "volatility" | "flow";
  tone: "bullish" | "bearish" | "neutral" | "caution";
  text: string;
}

export interface AnalysisInput {
  symbol: string;
  quotePrice: number;
  markPrice: number;
  premiumPct: number;
  verdict: Verdict;
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  dexPriceUsd: number | null;
  dexDivergencePct: number | null;
  volatility7d: number | null;
  rangePos30d: number | null;
  buys24h: number | null;
  sells24h: number | null;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const pct = (n: number) => `${n.toFixed(1)}%`;
const magnitude = (n: number) => `${Math.abs(n).toFixed(1)}%`;
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function buildSignals(i: AnalysisInput): Signal[] {
  const signals: Signal[] = [];
  if (i.change7d != null && i.change7d > 10) {
    signals.push({ kind: "momentum", tone: "bullish", text: `Up ${magnitude(i.change7d)} over 7d — strong weekly runner` });
  } else if (i.change7d != null && i.change7d < -10) {
    signals.push({ kind: "momentum", tone: "bearish", text: `Down ${magnitude(i.change7d)} over 7d — weekly momentum is weak` });
  } else if (i.change1d != null && i.change1d > 5) {
    signals.push({ kind: "momentum", tone: "bullish", text: `Up ${magnitude(i.change1d)} today — daily runner` });
  } else if (i.change1d != null && i.change1d < -5) {
    signals.push({ kind: "momentum", tone: "bearish", text: `Down ${magnitude(i.change1d)} today — daily momentum is weak` });
  }
  if (i.verdict === "discount") {
    signals.push({ kind: "premium", tone: "bullish", text: `Trades ${magnitude(i.premiumPct)} below mark price — discount to private-market value` });
  } else if (i.verdict === "overpriced") {
    signals.push({ kind: "premium", tone: "caution", text: `${pct(i.premiumPct)} premium over mark price` });
  } else {
    signals.push({ kind: "premium", tone: "neutral", text: "Trades near mark price — fair private-market value" });
  }
  if (i.liquidityUsd != null && i.liquidityUsd < 50_000) {
    signals.push({ kind: "liquidity", tone: "caution", text: `Thin liquidity (${usd(i.liquidityUsd)}) — size positions small` });
  } else if (i.liquidityUsd != null && i.liquidityUsd >= 250_000) {
    signals.push({ kind: "liquidity", tone: "neutral", text: "Deep liquidity" });
  }
  if (i.dexDivergencePct != null && Math.abs(i.dexDivergencePct) > 10 && i.dexPriceUsd != null) {
    signals.push({ kind: "divergence", tone: "caution", text: `DEX price ${usd(i.dexPriceUsd)} diverges ${magnitude(i.dexDivergencePct)} from PreStocks quote` });
  }
  if (i.volatility7d != null && i.volatility7d > 8) {
    signals.push({ kind: "volatility", tone: "caution", text: `7d volatility is ${i.volatility7d.toFixed(1)}% — expect larger moves` });
  }
  if (i.buys24h != null && i.sells24h != null && i.buys24h + i.sells24h >= 5) {
    if (i.buys24h > i.sells24h * 1.5) {
      signals.push({ kind: "flow", tone: "bullish", text: `Net buying: ${i.buys24h} buys vs ${i.sells24h} sells (24h)` });
    } else if (i.sells24h > i.buys24h * 1.5) {
      signals.push({ kind: "flow", tone: "bearish", text: `Net selling: ${i.buys24h} buys vs ${i.sells24h} sells (24h)` });
    }
  }
  return signals;
}

export function score(i: AnalysisInput): number {
  let value = 50;
  value += clamp(i.change7d ?? 0, -15, 15);
  value += clamp((i.change30d ?? 0) / 2, -10, 10);
  value += i.verdict === "discount" ? 10 : i.verdict === "overpriced" ? -10 : 0;
  if (i.liquidityUsd != null && i.liquidityUsd < 50_000) value -= 10;
  if (i.dexDivergencePct != null && Math.abs(i.dexDivergencePct) > 10) value -= 10;
  if (i.buys24h != null && i.sells24h != null) {
    if (i.buys24h > i.sells24h * 1.5) value += 5;
    else if (i.sells24h > i.buys24h * 1.5) value -= 5;
  }
  return Math.round(clamp(value, 0, 100));
}

export function summarize(i: AnalysisInput, signals: Signal[]): string {
  const lead = signals.find((signal) => signal.kind === "momentum")?.text ??
    `${i.symbol} is still building a price history for momentum analysis.`;
  const valuation = i.verdict === "discount"
    ? `The PreStocks quote is ${Math.abs(i.premiumPct).toFixed(1)}% below its mark price.`
    : i.verdict === "overpriced"
      ? `The PreStocks quote carries a ${i.premiumPct.toFixed(1)}% premium to its mark price.`
      : "The PreStocks quote is close to its mark price.";
  const risk = i.liquidityUsd != null && i.liquidityUsd < 50_000
    ? "Liquidity is thin, so size positions carefully."
    : i.dexDivergencePct != null && Math.abs(i.dexDivergencePct) > 10
      ? "DEX pricing diverges materially from the canonical quote; compare both before acting."
      : "Use the DEX flow and liquidity data as context, not as a guarantee.";
  return `${i.symbol}: ${lead.replace(/[.!?]+$/, "")}. ${valuation} ${risk}`;
}
