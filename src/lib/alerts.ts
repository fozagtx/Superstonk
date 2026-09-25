import { sql } from "./db";
import type { TelegramSender } from "./telegram";
import { sendMessage } from "./telegram";
import { fmtPct, fmtUsd } from "./format";
import type { TokenMetrics } from "./prestocks";

export interface AlertRow {
  id: number;
  symbol: string;
  direction: "below" | "above";
  threshold_pct: number;
  telegram_chat_id: string;
  last_triggered_at: string | null;
}

export const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export function alertMessage(
  a: Pick<AlertRow, "symbol" | "direction" | "threshold_pct">,
  token: TokenMetrics,
  appUrl: string,
): string {
  const arrow = a.direction === "below" ? "▼" : "▲";
  return (
    `${arrow} <b>${a.symbol}</b> premium is now ${fmtPct(token.premiumPct)}, ` +
    `${a.direction} your ${fmtPct(Number(a.threshold_pct))} alert. ` +
    `Token ${fmtUsd(token.tokenPrice)} vs mark ${fmtUsd(token.markPrice)}.\n` +
    `${appUrl}/token/${a.symbol}`
  );
}

// Pure evaluation: returns ids of alerts that should fire now.
export function triggerableAlertIds(
  alerts: AlertRow[],
  tokens: Pick<TokenMetrics, "symbol" | "premiumPct">[],
  now = Date.now(),
): number[] {
  const ids: number[] = [];
  for (const a of alerts) {
    const token = tokens.find((t) => t.symbol === a.symbol);
    if (!token) continue;
    const crossed =
      a.direction === "below"
        ? token.premiumPct < Number(a.threshold_pct)
        : token.premiumPct > Number(a.threshold_pct);
    if (!crossed) continue;
    const last = a.last_triggered_at
      ? new Date(a.last_triggered_at).getTime()
      : null;
    if (last !== null && now - last < ALERT_COOLDOWN_MS) continue;
    ids.push(a.id);
  }
  return ids;
}

export async function evaluateAlerts(
  tokens: TokenMetrics[],
  sender: TelegramSender = sendMessage,
): Promise<number> {
  const alerts = (await sql`
    SELECT id, symbol, direction, threshold_pct, telegram_chat_id, last_triggered_at
    FROM alerts WHERE active = true
  `) as AlertRow[];

  const ids = triggerableAlertIds(alerts, tokens);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  for (const a of alerts) {
    if (!ids.includes(a.id)) continue;
    const token = tokens.find((t) => t.symbol === a.symbol)!;
    await sender(a.telegram_chat_id, alertMessage(a, token, appUrl));
    await sql`UPDATE alerts SET last_triggered_at = now() WHERE id = ${a.id}`;
  }
  return ids.length;
}
