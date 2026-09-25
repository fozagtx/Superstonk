# Pre-IPO X-Ray

A read-only lens on PreStocks — the pre-IPO equity tokens on Solana. For every
token it shows:

1. **Premium or discount** — how far the token price sits above or below the
   company's latest valuation (the "mark" or fair price).
2. **What you actually own** — price exposure via an SPV, without voting
   rights, dividends, or information rights.
3. **Exit risk** — how large your position is relative to the whole (thin)
   market, and what a sale of that size implies.

Connect a wallet or paste any Solana address on `/me` for a personal X-Ray:
total value vs fair value, the hidden premium you're paying, and per-token
exit risk. Nothing is ever signed.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · shadcn/ui ·
Neon Postgres (`@neondatabase/serverless`) · Solana web3.js + SPL Token
(Token-2022) · recharts · `next/og` share cards · vitest.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string (snapshots, alerts, telegram links) |
| `CRON_SECRET` | yes | Bearer secret for `GET /api/snapshot` (Vercel cron sends it automatically) |
| `NEXT_PUBLIC_APP_URL` | yes | Absolute app URL, used in OG metadata and alert messages |
| `HELIUS_API_KEY` | no | Routes Solana RPC through Helius via the `/api/rpc` proxy |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | no | Public RPC endpoint (falls back to `/api/rpc` → Helius or mainnet-beta) |
| `TELEGRAM_BOT_TOKEN` | no | Bot token for premium alerts; alerts UI disables itself without it |
| `TELEGRAM_BOT_USERNAME` | no | Bot username for `t.me` deep links |
| `TELEGRAM_WEBHOOK_SECRET` | no | Secret verified on `POST /api/telegram/webhook` |

Copy `.env.example` to `.env.local`.

## Local setup

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL + CRON_SECRET
pnpm dev                     # http://localhost:3000
pnpm vitest run              # unit tests (metrics + alerts)
pnpm build                   # production build
```

## Data & cron

Prices come from `https://prestocks.com/api/prestocks` (revalidated every
5 min, zod-validated — never hard-coded). `GET /api/snapshot` writes one row
per token to `snapshots` and upserts the raw payload to `token_cache`; it is
scheduled every 5 minutes via `vercel.json` and requires
`Authorization: Bearer $CRON_SECRET` (or `?secret=` for manual testing). When
the upstream API is down, pages fall back to the latest snapshot rows and show
a stale-data banner.

`GET /api/history/[symbol]?range=24h|7d|30d` serves the premium-history chart.

## Telegram alerts

1. Create a bot with [@BotFather](https://t.me/BotFather), note the token and
   username.
2. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and a random
   `TELEGRAM_WEBHOOK_SECRET` in `.env.local`.
3. Deploy (or expose a tunnel), then run `pnpm telegram:setup` — it calls
   `setWebhook` for `/api/telegram/webhook` and prints `getWebhookInfo`.
4. "Set alert" on any token page generates a `t.me/…?start=<code>` deep link;
   pressing Start links the chat (`telegram_links`), then `POST /api/alerts`
   stores the threshold. `evaluateAlerts` runs after every snapshot insert and
   notifies on crossings with a 6-hour re-arm cooldown.

## Formulas

- `premiumPct = (tokenPrice − markPrice) / markPrice × 100`
- `marketSize = tokenPrice × supply`
- verdict: `discount` below −5%, `fair` in ±5%, `overpriced` above +5%
- `hiddenPremium(amount) = amount × (tokenPrice − markPrice)`
- exit share `= amount × tokenPrice / marketSize` → low <1%, medium 1–5%, high >5%

## On-chain findings

PreStocks mints are **Token-2022** tokens (9 decimals) with real extension
risk that holders rarely see:

- **3% transfer fee** on every transfer (`transferFeeConfig`, read live
  on-chain per token page — `getMint` + `getTransferFeeConfig`)
- A **permanent delegate** held by the issuer, who can move or burn tokens
  from any account without consent
- Supply is cross-checked against `getTokenSupply` and flagged when the API
  and chain disagree

Data, not financial advice.
