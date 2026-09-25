import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { premiumPct } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const RANGES = {
  "24h": { interval: "24 hours", bucket: null },
  "7d": { interval: "7 days", bucket: "hour" },
  "30d": { interval: "30 days", bucket: "hour" },
} as const;

type Range = keyof typeof RANGES;

interface Point {
  t: string;
  premiumPct: number;
  tokenPrice: number;
  markPrice: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const range = (req.nextUrl.searchParams.get("range") ?? "7d") as Range;
  const cfg = RANGES[range] ?? RANGES["7d"];
  const sym = symbol.toUpperCase();

  try {
    let points: Point[];
    if (cfg.bucket) {
      const rows = (await sql`
        SELECT date_trunc(${cfg.bucket}, taken_at) AS t,
               avg(token_price) AS token_price,
               avg(mark_price) AS mark_price
        FROM snapshots
        WHERE symbol = ${sym}
          AND taken_at > now() - ${cfg.interval}::interval
        GROUP BY 1
        ORDER BY 1 ASC
      `) as { t: string; token_price: number; mark_price: number }[];
      points = rows.map((r) => ({
        t: new Date(r.t).toISOString(),
        premiumPct: premiumPct(Number(r.token_price), Number(r.mark_price)),
        tokenPrice: Number(r.token_price),
        markPrice: Number(r.mark_price),
      }));
    } else {
      const rows = (await sql`
        SELECT taken_at AS t, token_price, mark_price
        FROM snapshots
        WHERE symbol = ${sym}
          AND taken_at > now() - ${cfg.interval}::interval
        ORDER BY taken_at ASC
      `) as { t: string; token_price: number; mark_price: number }[];
      points = rows.map((r) => ({
        t: new Date(r.t).toISOString(),
        premiumPct: premiumPct(Number(r.token_price), Number(r.mark_price)),
        tokenPrice: Number(r.token_price),
        markPrice: Number(r.mark_price),
      }));
    }
    return NextResponse.json(points, {
      headers: { "Cache-Control": "s-maxage=120" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "History failed" },
      { status: 502 },
    );
  }
}
