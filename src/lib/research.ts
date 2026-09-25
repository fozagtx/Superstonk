import "server-only";

import {
  buildSignals,
  changePct,
  summarize,
  score,
  volatilityPct,
  rangePosition,
  WINDOWS,
  WINDOW_DAYS,
  type Signal,
  type Window,
  type AnalysisInput,
} from "./analysis";
import { fetchDexStats, type DexStats } from "./dex";
import { marketStatus } from "./market-hours";
import { fetchPreStocks } from "./prestocks";
import type { Verdict } from "./metrics";

export interface TokenResearch {
  symbol: string;
  name: string;
  description: string;
  image: string;
  externalUrl: string;
  mint: string;
  quotePrice: number;
  markPrice: number;
  premiumPct: number;
  verdict: Verdict;
  supply: number;
  marketSize: number;
  dex: DexStats | null;
  change: Record<Window, number | null>;
  volatility7d: number | null;
  rangePos30d: number | null;
  dexDivergencePct: number | null;
  score: number;
  signals: Signal[];
  summary: string;
}

export interface Runner {
  symbol: string;
  name: string;
  image: string;
  changePct: number;
  volume24hUsd: number | null;
  premiumPct: number;
  verdict: Verdict;
  score: number;
}

export interface ResearchReport {
  updatedAt: string;
  source: "live" | "snapshot";
  market: { open: boolean; label: string };
  tokens: TokenResearch[];
  runners: Record<Window, Runner[]>;
}

function inputFor(
  token: Awaited<ReturnType<typeof fetchPreStocks>>["tokens"][number],
  dex: DexStats | null,
  change: Record<Window, number | null>,
  volatility7d: number | null,
  rangePos30d: number | null,
  dexDivergencePct: number | null,
): AnalysisInput {
  return {
    symbol: token.symbol,
    quotePrice: token.tokenPrice,
    markPrice: token.markPrice,
    premiumPct: token.premiumPct,
    verdict: token.verdict,
    change1d: change["1d"],
    change7d: change["7d"],
    change30d: change["30d"],
    volume24hUsd: dex?.volume24hUsd ?? null,
    liquidityUsd: dex?.liquidityUsd ?? null,
    dexPriceUsd: dex?.priceUsd ?? null,
    dexDivergencePct,
    volatility7d,
    rangePos30d,
    buys24h: dex?.topPool?.buys24h ?? null,
    sells24h: dex?.topPool?.sells24h ?? null,
  };
}

export async function buildResearch(): Promise<ResearchReport> {
  const prestocks = await fetchPreStocks();
  const tokens = await Promise.all(
    prestocks.tokens.map(async (token): Promise<TokenResearch> => {
      const dex = await fetchDexStats(token.contract_address);
      const candles = dex?.candles ?? [];
      const change = Object.fromEntries(
        WINDOWS.map((window) => [
          window,
          changePct(candles, WINDOW_DAYS[window]),
        ]),
      ) as Record<Window, number | null>;
      const volatility7d = volatilityPct(candles, WINDOW_DAYS["7d"]);
      const rangePos30d = rangePosition(candles, WINDOW_DAYS["30d"]);
      const dexDivergencePct =
        dex?.priceUsd != null && token.tokenPrice !== 0
          ? ((dex.priceUsd - token.tokenPrice) / token.tokenPrice) * 100
          : null;
      const input = inputFor(
        token,
        dex,
        change,
        volatility7d,
        rangePos30d,
        dexDivergencePct,
      );
      const signals = buildSignals(input);
      return {
        symbol: token.symbol,
        name: token.name,
        description: token.description,
        image: token.image,
        externalUrl: token.external_url,
        mint: token.contract_address,
        quotePrice: token.tokenPrice,
        markPrice: token.markPrice,
        premiumPct: token.premiumPct,
        verdict: token.verdict,
        supply: token.supply,
        marketSize: token.marketSize,
        dex,
        change,
        volatility7d,
        rangePos30d,
        dexDivergencePct,
        score: score(input),
        signals,
        summary: summarize(input, signals),
      };
    }),
  );
  const runners = Object.fromEntries(
    WINDOWS.map((window) => [
      window,
      tokens
        .filter((token) => token.change[window] != null)
        .sort((a, b) => b.change[window]! - a.change[window]!)
        .map((token): Runner => ({
          symbol: token.symbol,
          name: token.name,
          image: token.image,
          changePct: token.change[window]!,
          volume24hUsd: token.dex?.volume24hUsd ?? null,
          premiumPct: token.premiumPct,
          verdict: token.verdict,
          score: token.score,
        })),
    ]),
  ) as Record<Window, Runner[]>;
  return {
    updatedAt: prestocks.updatedAt,
    source: prestocks.source,
    market: marketStatus(new Date()),
    tokens,
    runners,
  };
}
