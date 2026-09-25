import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { upsertTokenCache } from "@/lib/prestocks";
import { premiumPct } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const rawTokenSchema = z.object({
  symbol: z.string(),
  markPrice: z.number(),
  tokenPrice: z.number(),
  supply: z.number(),
});

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const authorized =
    !!secret && (bearer === `Bearer ${secret}` || querySecret === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch("https://prestocks.com/api/prestocks", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`PreStocks API ${res.status}`);
    const raw = await res.json();
    const parsed = z.array(rawTokenSchema).parse(raw);
    const takenAt = new Date();

    await Promise.all(
      parsed.map(
        (t) => sql`
          INSERT INTO snapshots (symbol, taken_at, token_price, mark_price, premium_pct, supply)
          VALUES (${t.symbol}, ${takenAt.toISOString()}, ${t.tokenPrice}, ${t.markPrice},
                  ${premiumPct(t.tokenPrice, t.markPrice)}, ${t.supply})
        `,
      ),
    );
    await upsertTokenCache(raw);

    return NextResponse.json({
      inserted: parsed.length,
      takenAt: takenAt.toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Snapshot failed" },
      { status: 502 },
    );
  }
}
