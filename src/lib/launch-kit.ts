import type { TokenResearch } from "./research";

export const METEORA_DBC_PROGRAM = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export interface LaunchKit {
  generatedAt: string;
  note: string;
  underlying: {
    symbol: string;
    name: string;
    mint: string;
    quotePrice: number;
    markPrice: number;
    premiumPct: number;
    verdict: TokenResearch["verdict"];
    image: string;
    externalUrl: string;
  };
  suggestedMetadata: {
    name: string;
    symbol: string;
    description: string;
    image: string;
    external_url: string;
  };
  meteoraDbc: {
    program: string;
    quoteMintOptions: { label: string; mint: string }[];
    notes: string[];
  };
  research: {
    score: number;
    change: TokenResearch["change"];
    signals: TokenResearch["signals"];
    summary: string;
  };
  links: {
    prestocks: string;
    geckoterminal: string;
    solscan: string;
    dataApi: string;
  };
}

export function buildLaunchKit(t: TokenResearch, appUrl: string): LaunchKit {
  const base = appUrl.replace(/\/$/, "");
  const tokenUrl = `${base}/token/${encodeURIComponent(t.symbol)}`;
  return {
    generatedAt: new Date().toISOString(),
    note: "Suggestions only — review parameters, simulate, and confirm all transaction details before launching.",
    underlying: {
      symbol: t.symbol,
      name: t.name,
      mint: t.mint,
      quotePrice: t.quotePrice,
      markPrice: t.markPrice,
      premiumPct: t.premiumPct,
      verdict: t.verdict,
      image: t.image,
      externalUrl: t.externalUrl,
    },
    suggestedMetadata: {
      name: `${t.name.replace(/ PreStocks$/, "")} Runner`,
      symbol: `${t.symbol.slice(0, 6)}RUN`,
      description: `${t.summary} Data: ${tokenUrl}`,
      image: t.image,
      external_url: tokenUrl,
    },
    meteoraDbc: {
      program: METEORA_DBC_PROGRAM,
      quoteMintOptions: [
        { label: "USDC", mint: USDC_MINT },
        { label: `${t.symbol} (PreStocks)`, mint: t.mint },
      ],
      notes: [
        "Quote the pool in the underlying PreStocks mint to tie the agent token to the pre-IPO asset, or USDC for simplicity.",
        "Use the Meteora DBC SDK (@meteora-ag/dynamic-bonding-curve-sdk) buildCurve → createConfig → createPool; simulate before sending.",
      ],
    },
    research: {
      score: t.score,
      change: t.change,
      signals: t.signals,
      summary: t.summary,
    },
    links: {
      prestocks: t.externalUrl,
      geckoterminal: `https://www.geckoterminal.com/solana/tokens/${t.mint}`,
      solscan: `https://solscan.io/token/${t.mint}`,
      dataApi: `${base}/api/v1/tokens/${encodeURIComponent(t.symbol)}`,
    },
  };
}
