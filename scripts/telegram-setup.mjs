const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token || !secret || !appUrl) {
  console.error(
    "Need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_APP_URL set.",
  );
  process.exit(1);
}

const api = `https://api.telegram.org/bot${token}`;
const webhookUrl = `${appUrl}/api/telegram/webhook`;

const set = await fetch(`${api}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
});
console.log("setWebhook:", await set.json());

const info = await fetch(`${api}/getWebhookInfo`);
console.log("getWebhookInfo:", JSON.stringify(await info.json(), null, 2));
