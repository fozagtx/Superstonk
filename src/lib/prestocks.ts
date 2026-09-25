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
  payload: Record<string, unknown> | null;
}

export async function upsertTokenCache(
  tokens: { symbol: string }[],
): Promise<void> {
  try {
    await Promise.all(
      tokens.map(
        (t) => sql`
          INSERT INTO token_cache (symbol, payload, updated_at)
          VALUES (${t.symbol}, ${JSON.stringify(t)}, now())
          ON CONFLICT (symbol)
          DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
        `,
      ),
    );
  } catch (e) {
    console.error("token_cache upsert failed:", e);
  }
}

async function fetchSnapshotFallback(): Promise<PreStocksResult> {
  const rows = (await sql`
    SELECT s.symbol, s.taken_at, s.token_price, s.mark_price, s.supply,
           c.payload
    FROM (
      SELECT DISTINCT ON (symbol) symbol, taken_at, token_price, mark_price, supply
      FROM snapshots
      ORDER BY symbol, taken_at DESC
    ) s
    LEFT JOIN token_cache c ON c.symbol = s.symbol
  `) as SnapshotRow[];
  if (rows.length === 0) {
    throw new Error("PreStocks API unavailable and no snapshots in database");
  }
  const latest = rows.reduce((a, b) =>
    new Date(b.taken_at) > new Date(a.taken_at) ? b : a,
  );
  const tokens = rows.map((r) => {
    const cached = rawTokenSchema.partial().safeParse(r.payload ?? {});
    const base = cached.success ? cached.data : {};
    return withMetrics({
      name: base.name ?? r.symbol,
      symbol: r.symbol,
      description: base.description ?? "",
      image: base.image ?? "",
      external_url: base.external_url ?? "",
      contract_address: base.contract_address ?? "",
      markPrice: Number(r.mark_price),
      markValuation: base.markValuation ?? null,
      tokenPrice: Number(r.token_price),
      impliedValuation: base.impliedValuation ?? null,
      supply: Number(r.supply),
    });
  });
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
    await upsertTokenCache(data);
    return {
      tokens: data.map(withMetrics),
      updatedAt: new Date().toISOString(),
      source: "live",
    };
  } catch {
    return fetchSnapshotFallback();
  }
}
