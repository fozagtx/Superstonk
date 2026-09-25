export function isConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME,
  );
}

export type TelegramSender = (
  chatId: string | number,
  text: string,
) => Promise<void>;

export const sendMessage: TelegramSender = async (chatId, text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`[telegram] not configured; would send to ${chatId}: ${text}`);
    return;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!res.ok) {
      console.error(`[telegram] sendMessage failed: ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.error("[telegram] sendMessage error:", e);
  }
};
