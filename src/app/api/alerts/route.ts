import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { fetchPreStocks } from "@/lib/prestocks";
import { sendMessage } from "@/lib/telegram";
import { fmtPct } from "@/lib/format";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  symbol: z.string().min(1).max(20),
  direction: z.enum(["below", "above"]),
  thresholdPct: z.number().min(-90).max(300),
  code: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { direction, thresholdPct, code } = body.data;
  const symbol = body.data.symbol.toUpperCase();

  const { tokens } = await fetchPreStocks();
  const token = tokens.find((t) => t.symbol === symbol);
  if (!token) {
    return NextResponse.json({ error: "Unknown symbol" }, { status: 400 });
  }

  const links = (await sql`
    SELECT chat_id FROM telegram_links WHERE code = ${code}
  `) as { chat_id: string | null }[];
  const chatId = links[0]?.chat_id;
  if (!chatId) {
    return NextResponse.json(
      { error: "Telegram not linked" },
      { status: 400 },
    );
  }

  const rows = (await sql`
    INSERT INTO alerts (symbol, direction, threshold_pct, telegram_chat_id, created_at, active)
    VALUES (${symbol}, ${direction}, ${thresholdPct}, ${chatId}, now(), true)
    RETURNING id
  `) as { id: number }[];

  await sendMessage(
    chatId,
    `Alert set: ${symbol} premium ${direction} ${fmtPct(thresholdPct)}. ` +
      `Current: ${fmtPct(token.premiumPct)}.`,
  );

  return NextResponse.json({ id: rows[0].id });
}
