import "server-only";

import { z } from "zod";

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface DexStats {
  mint: string;
  priceUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  topPool: {
    address: string;
    name: string;
    reserveUsd: number;
    buys24h: number;
    sells24h: number;
  } | null;
  candles: Candle[];
}

const numberish = z.union([z.number(), z.string()]).optional().nullable();
const tokenResponseSchema = z
  .object({
    data: z
      .object({
        attributes: z
          .object({
            price_usd: numberish,
            fdv_usd: numberish,
            total_reserve_in_usd: numberish,
            volume_usd: z.object({ h24: numberish }).optional().nullable(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    included: z
      .array(
        z
          .object({
            attributes: z
              .object({
                address: z.string().optional(),
                name: z.string().optional(),
                reserve_in_usd: numberish,
                volume_usd: z.object({ h24: numberish }).optional().nullable(),
                transactions: z
                  .object({
                    h24: z
                      .object({
                        buys: numberish,
                        sells: numberish,
                      })
                      .optional()
                      .nullable(),
                  })
                  .optional()
                  .nullable(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .optional()
      .default([]),
  })
  .passthrough();

const ohlcvSchema = z
  .object({
    data: z
      .object({
        attributes: z
          .object({
            ohlcv_list: z
              .array(z.array(z.union([z.number(), z.string()])))
              .optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function fetchDexStats(mint: string): Promise<DexStats | null> {
  try {
    const headers = { Accept: "application/json" };
    const tokenRes = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}?include=top_pools`,
      { headers, next: { revalidate: 300 } },
    );
    if (!tokenRes.ok) return null;
    const tokenParsed = tokenResponseSchema.safeParse(await tokenRes.json());
    if (!tokenParsed.success || !tokenParsed.data.data?.attributes) return null;
    const tokenAttrs = tokenParsed.data.data.attributes;
    const pools = tokenParsed.data.included
      .map((pool) => {
        const attrs = pool.attributes;
        const reserveUsd = numberOrNull(attrs.reserve_in_usd) ?? 0;
        const flow = attrs.transactions?.h24;
        return {
          address: attrs.address ?? "",
          name: attrs.name ?? "Unknown pool",
          reserveUsd,
          buys24h: numberOrNull(flow?.buys) ?? 0,
          sells24h: numberOrNull(flow?.sells) ?? 0,
        };
      })
      .filter((pool) => pool.address)
      .sort((a, b) => b.reserveUsd - a.reserveUsd);
    const topPool = pools[0] ?? null;
    let candles: Candle[] = [];
    if (topPool) {
      const ohlcvRes = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(topPool.address)}/ohlcv/day?limit=35&currency=usd`,
        { headers, next: { revalidate: 900 } },
      );
      if (ohlcvRes.ok) {
        const parsed = ohlcvSchema.safeParse(await ohlcvRes.json());
        const list = parsed.success
          ? (parsed.data.data?.attributes?.ohlcv_list ?? [])
          : [];
        candles = list
          .map((row) => ({
            t: numberOrNull(row[0]) ?? 0,
            o: numberOrNull(row[1]) ?? 0,
            h: numberOrNull(row[2]) ?? 0,
            l: numberOrNull(row[3]) ?? 0,
            c: numberOrNull(row[4]) ?? 0,
            v: numberOrNull(row[5]) ?? 0,
          }))
          .filter((candle) => candle.t > 0 && candle.c > 0)
          .sort((a, b) => a.t - b.t);
      }
    }
    return {
      mint,
      priceUsd: numberOrNull(tokenAttrs.price_usd),
      fdvUsd: numberOrNull(tokenAttrs.fdv_usd),
      liquidityUsd: numberOrNull(tokenAttrs.total_reserve_in_usd),
      volume24hUsd: numberOrNull(tokenAttrs.volume_usd?.h24),
      topPool,
      candles,
    };
  } catch {
    return null;
  }
}
