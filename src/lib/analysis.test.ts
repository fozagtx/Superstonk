import { describe, expect, it } from "vitest";
import { buildSignals, changePct, rangePosition, score, summarize, volatilityPct, type AnalysisInput } from "./analysis";
import type { Candle } from "./dex";

const candles: Candle[] = [
  { t: 1, o: 10, h: 12, l: 8, c: 10, v: 1 },
  { t: 2, o: 12, h: 14, l: 10, c: 12, v: 1 },
  { t: 3, o: 11, h: 13, l: 9, c: 11, v: 1 },
  { t: 4, o: 14, h: 16, l: 12, c: 14, v: 1 },
];

const input = (overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
  symbol: "TEST",
  quotePrice: 10,
  markPrice: 12,
  premiumPct: -16.67,
  verdict: "discount",
  change1d: 6,
  change7d: 12,
  change30d: 20,
  volume24hUsd: 100_000,
  liquidityUsd: 300_000,
  dexPriceUsd: 14,
  dexDivergencePct: 40,
  volatility7d: 10,
  rangePos30d: 0.8,
  buys24h: 8,
  sells24h: 2,
  ...overrides,
});

describe("analysis", () => {
  it("calculates exact and partial changes", () => {
    expect(changePct(candles, 1)).toBeCloseTo(27.27, 2);
    expect(changePct(candles.slice(0, 2), 30)).toBeCloseTo(20);
    expect(changePct(candles.slice(0, 1), 1)).toBeNull();
  });
  it("calculates volatility and range positions", () => {
    expect(volatilityPct(candles, 7)).toBeGreaterThan(0);
    expect(rangePosition(candles, 30)).toBeCloseTo(0.75);
    expect(rangePosition([{ ...candles[0], c: 8 }, { ...candles[1], c: 8, h: 8, l: 8 }], 30)).toBe(0);
    expect(rangePosition([{ ...candles[0], h: 10, l: 10, c: 10 }, { ...candles[1], h: 10, l: 10, c: 10 }], 30)).toBeNull();
  });
  it("fires signal rules and summarizes", () => {
    const signals = buildSignals(input());
    expect(signals.map((s) => s.kind)).toEqual(expect.arrayContaining(["momentum", "premium", "liquidity", "divergence", "volatility", "flow"]));
    expect(summarize(input(), signals)).toContain("TEST");
  });
  it("clamps scores", () => {
    expect(score(input())).toBeLessThanOrEqual(100);
    expect(score(input({ change7d: -100, change30d: -100, verdict: "overpriced", liquidityUsd: 1, dexDivergencePct: 100, buys24h: 1, sells24h: 10 }))).toBeGreaterThanOrEqual(0);
  });
});
