import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sql } from "@/lib/db";
import { isConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "alerts_not_configured" },
      { status: 503 },
    );
  }
  const code = randomBytes(9).toString("base64url").slice(0, 12);
  await sql`INSERT INTO telegram_links (code, chat_id, created_at) VALUES (${code}, NULL, now())`;
  const username = process.env.TELEGRAM_BOT_USERNAME;
  return NextResponse.json({
    code,
    url: `https://t.me/${username}?start=${code}`,
  });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  const rows = (await sql`
    SELECT chat_id FROM telegram_links WHERE code = ${code}
  `) as { chat_id: string | null }[];
  return NextResponse.json({ linked: Boolean(rows[0]?.chat_id) });
}
