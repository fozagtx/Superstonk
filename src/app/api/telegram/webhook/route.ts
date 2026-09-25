import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (
    !process.env.TELEGRAM_WEBHOOK_SECRET ||
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update?.message;
    const text: string = message?.text ?? "";
    const chatId: number | string | undefined = message?.chat?.id;
    if (chatId === undefined) return NextResponse.json({ ok: true });

    const startMatch = text.match(/^\/start(?:@\w+)?\s+(\S+)$/);
    if (startMatch) {
      const code = startMatch[1];
      const rows = (await sql`
        UPDATE telegram_links SET chat_id = ${String(chatId)}
        WHERE code = ${code} AND chat_id IS NULL
        RETURNING code
      `) as { code: string }[];
      if (rows.length > 0) {
        await sendMessage(
          chatId,
          "Linked to Pre-IPO X-Ray. You'll get a message when your alert triggers.",
        );
      } else {
        await sendMessage(
          chatId,
          "That link code is invalid or already used. Generate a new one from the app.",
        );
      }
    } else {
      await sendMessage(
        chatId,
        "Send /start &lt;code&gt; to link alerts, or set an alert from the token page.",
      );
    }
  } catch (e) {
    console.error("[telegram webhook]", e);
  }
  return NextResponse.json({ ok: true });
}
