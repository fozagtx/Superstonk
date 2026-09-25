import "server-only";
import { z } from "zod";
import { sql } from "./db";
import { marketSize, premiumPct, verdict, type Verdict } from "./metrics";

const PRESTOCKS_API = "https://prestocks.com/api/prestocks";

const rawTokenSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  description: z.string().optional().default(""),
  image: z.string().optional().default(""),
  external_url: z.string().optional().default(""),
  contract_address: z.string(),
  markPrice: z.number(),
  markValuation: z.number().optional().nullable().default(null),
  tokenPrice: z.number(),
  impliedValuation: z.number().optional().nullable().default(null),
  supply: z.number(),
});

export type RawToken = z.infer<typeof rawTokenSchema>;

export interface TokenMetrics extends RawToken {
  premiumPct: number;
  marketSize: number;
  verdict: Verdict;
}

export interface PreStocksResult {
  tokens: TokenMetrics[];
  updatedAt: string;
  source: "live" | "snapshot";
}

function withMetrics(t: RawToken): TokenMetrics {
  const pct = premiumPct(t.tokenPrice, t.markPrice);
  return {
    ...t,
    premiumPct: pct,
    marketSize: marketSize(t.tokenPrice, t.supply),
    verdict: verdict(pct),
  };
}

interface SnapshotRow {
  symbol: string;
  taken_at: string;
  token_price: number;
  mark_price: number;
  supply: number;
}

async function fetchSnapshotFallback(): Promise<PreStocksResult> {
  const rows = (await sql`
    SELECT DISTINCT ON (symbol) symbol, taken_at, token_price, mark_price, supply
    FROM snapshots
    ORDER BY symbol, taken_at DESC
  `) as SnapshotRow[];
  if (rows.length === 0) {
    throw new Error("PreStocks API unavailable and no snapshots in database");
  }
  const latest = rows.reduce((a, b) =>
    new Date(b.taken_at) > new Date(a.taken_at) ? b : a,
  );
  const tokens = rows.map((r) =>
    withMetrics({
      name: r.symbol,
      symbol: r.symbol,
      description: "",
      image: "",
      external_url: "",
      contract_address: "",
      markPrice: Number(r.mark_price),
      markValuation: null,
      tokenPrice: Number(r.token_price),
      impliedValuation: null,
      supply: Number(r.supply),
    }),
  );
  return {
    tokens,
    updatedAt: new Date(latest.taken_at).toISOString(),
    source: "snapshot",
  };
}

export async function fetchPreStocks(): Promise<PreStocksResult> {
  try {
    const res = await fetch(PRESTOCKS_API, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`PreStocks API ${res.status}`);
    const data = z.array(rawTokenSchema).parse(await res.json());
    return {
      tokens: data.map(withMetrics),
      updatedAt: new Date().toISOString(),
      source: "live",
    };
  } catch {
    return fetchSnapshotFallback();
  }
}
