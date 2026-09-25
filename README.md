# Pre-IPO X-Ray

Know what you hold. Pre-IPO X-Ray shows PreStocks holders what their tokens are really worth, what they actually own, and how hard it would be to sell.

PreStocks tokens are Solana tokens that track private companies (OpenAI, SpaceX, Anthropic, Anduril, Neuralink, Kalshi, Polymarket, Figure AI). They often trade far from fair value. On the day this was built, OpenAI traded about 32% above its mark price and SpaceX about 22% below it, and every market was under $8M in size. A wallet shows none of this. This app does.

Built for the Stocklana hackathon (main track plus the PreStocks bounty). Data only, not financial advice.

## Table of contents

1. [What it shows](#what-it-shows)
2. [Screens](#screens)
3. [Formulas](#formulas)
4. [On-chain findings](#on-chain-findings)
5. [Architecture](#architecture)
6. [Project structure](#project-structure)
7. [API routes](#api-routes)
8. [Database schema](#database-schema)
9. [Environment variables](#environment-variables)
10. [Local setup](#local-setup)
11. [Deploying to Vercel](#deploying-to-vercel)
12. [Telegram alerts setup](#telegram-alerts-setup)
13. [Testing and verification](#testing-and-verification)
14. [Design system](#design-system)
15. [Demo script](#demo-script)
16. [Known limitations](#known-limitations)

## What it shows

For every PreStocks token:

1. **Premium or discount.** How far the token price sits above or below the company's latest valuation (the "mark price", which we call fair value). One word verdict: Overpriced, Fair, or Discount.
2. **What you actually own.** SPV price exposure only. No voting rights, no dividends, no company information rights, redemption only for large holders. Plus two facts read directly from the mint on-chain: a 3% transfer fee on every transfer and a permanent delegate held by the issuer.
3. **Exit risk.** How big a position is compared to the whole market, and what a sale of that size implies. Every market is small, so large sales move the price.

For a connected wallet (or any pasted Solana address):

- Total value, total fair value, and the gap ("$340 of your $1,200 is premium").
- One row per holding with amount, value, fair value, hidden premium, and an exit-risk tier.
- A shareable card with the numbers and no wallet address.

Nothing is ever signed. The wallet connection is read-only.

## Screens

| Route | Screen | What is on it |
| --- | --- | --- |
| `/` | Leaderboard | All tokens sorted by premium, highest first. Logo, name, verdict chip, premium %, market size. Explainer line above the list. Link to Discount watch below it. Footer shows "PreStocks, updated N min ago". |
| `/token/[symbol]` | Token X-Ray | Verdict chip, big premium number, gauge from -40% to +40% with the fair zone marked, token price vs mark price, company valuation vs implied valuation, exit-risk sentence, "What you own" checklist, premium history chart (24h / 7d / 30d), "Verified on Solana" supply badge, buttons for Set alert, Share, and Buy on PreStocks. |
| `/me` | My X-Ray | Connect Phantom or Solflare (read-only) or paste any Solana address. Headline gap, split bar (fair value vs hype), per-holding rows, Share my X-Ray. Empty state when the wallet holds no PreStocks tokens. Written error states for wallet rejection, RPC failure, and API failure. |
| `/discount` | Discount watch | Tokens currently below fair value with a neutral explanation of what a discount can mean. Empty state names the closest token. |
| `/share?v=&f=&s=` | Portfolio share page | Landing page for a shared portfolio card. Carries Open Graph metadata so X and Telegram render the card. |

Every page has a designed loading state (skeleton rows, no spinners) and a stale-data banner if the app is serving snapshot data because the PreStocks API is down.

## Formulas

All formulas live in `src/lib/metrics.ts` as pure functions and are covered by unit tests.

Per token:

```
premiumPct  = (tokenPrice - markPrice) / markPrice * 100
marketSize  = tokenPrice * supply
verdict     = discount   if premiumPct < -5
              fair       if -5 <= premiumPct <= 5
              overpriced if premiumPct > 5
```

Per holding (`amount` is the number of tokens in the wallet):

```
value          = amount * tokenPrice
fairValue      = amount * markPrice
hiddenPremium  = amount * (tokenPrice - markPrice)
exitShare      = value / marketSize
exitTier       = low    if exitShare < 1%
                 medium if 1% <= exitShare <= 5%
                 high   if exitShare > 5%
```

Percentages are always shown with a sign (+31.8%, -21.9%).

## On-chain findings

While building this we checked the PreStocks mints directly on Solana mainnet. They are **Token-2022** mints with 9 decimals and three extensions that matter to holders:

| Extension | What it means for you | Where it shows in the app |
| --- | --- | --- |
| `transferFeeConfig` (currently 300 basis points) | 3% of every transfer is withheld. Selling or moving tokens costs 3% on top of price impact. | "What you own" checklist. The rate is read live from the mint, not hard-coded. |
| `permanentDelegate` | The issuer holds a delegate on the mint that can move or burn tokens from any account without the holder's signature. | "What you own" checklist. |
| `defaultAccountState` | New token accounts start in the initialized state (no freeze on creation). | Not surfaced, informational only. |

The app also calls `getTokenSupply` for each mint and compares it to the supply the PreStocks API reports. If they match within 0.1% the token page shows "Verified on Solana". If they do not, it shows both numbers as a warning. If the RPC call fails, it says so instead of hiding the badge.

Because the mints are Token-2022, wallet holdings are fetched with `getParsedTokenAccountsByOwner` against the Token-2022 program id. The legacy Token program is queried too and merged, as cheap insurance.

## Architecture

One Next.js app on Vercel. The server talks to the PreStocks API and the database. The browser talks to Solana for wallet holdings, through a small server proxy so the RPC key never reaches the client.

```
PreStocks API  -->  fetchPreStocks() (server, 5 min cache)  -->  pages and /api/prestocks
                        |
                        v
             /api/snapshot (Vercel cron, every 5 min)
                        |
                        v
             Neon Postgres: snapshots, token_cache, alerts, telegram_links
                        |
                        +--> /api/history (chart)
                        +--> evaluateAlerts() --> Telegram sendMessage

Browser wallet  -->  /me  -->  /api/holdings  -->  Solana RPC via /api/rpc (Helius or public)
```

Key decisions:

- **PreStocks API only.** Every price, mark, valuation, supply, logo, description, and buy link comes from `GET https://prestocks.com/api/prestocks`. The token list is read from the API on every poll rather than hard-coded, so new PreStocks tokens appear automatically.
- **Server-side fetch.** Avoids CORS issues and lets us cache for 5 minutes with `next: { revalidate: 300 }`.
- **Snapshot fallback.** If the API is down, `fetchPreStocks()` rebuilds each token from the latest `snapshots` row joined with the raw payload cached in `token_cache`, and sets `source: "snapshot"` so the UI shows a stale-data banner.
- **No smart contract, no swaps.** Buying opens the token's PreStocks page in a new tab.
- **Read-only wallet.** `autoConnect` is off, we never request a signature, and the button says so.

## Project structure

```
src/
  app/
    page.tsx                      Leaderboard
    loading.tsx                   Skeleton for the leaderboard
    layout.tsx                    Fonts, dark theme, toaster
    globals.css                   Design tokens and shadcn variable mapping
    token/[symbol]/page.tsx       Token X-Ray page and Open Graph metadata
    me/page.tsx                   My X-Ray (client page, wallet adapter)
    discount/page.tsx             Discount watch
    share/page.tsx                Portfolio share landing page
    api/
      prestocks/route.ts          Token list with computed metrics
      holdings/route.ts           Wallet positions merged with metrics
      history/[symbol]/route.ts   Premium history for the chart
      snapshot/route.ts           Cron target: store snapshots, evaluate alerts
      rpc/route.ts                Solana RPC proxy (keeps the Helius key server-side)
      alerts/route.ts             Create an alert
      telegram/link/route.ts      Create and poll a Telegram pairing code
      telegram/webhook/route.ts   Receive /start <code> from the bot
      og/token/[symbol]/route.tsx Token share card (1200x630 PNG)
      og/portfolio/route.tsx      Portfolio share card (1200x630 PNG)
  components/
    verdict-chip.tsx              Word + icon chip, never color alone
    premium-gauge.tsx             Horizontal -40% to +40% gauge
    premium-chart.tsx             recharts area chart with fair zone
    supply-badge.tsx              On-chain supply verification badge
    alert-dialog.tsx              Telegram pairing and alert creation
    share-token-dialog.tsx        Share dialog for a token
    share-xray-dialog.tsx         Share dialog for a portfolio
    wallet-provider.tsx           Solana wallet adapter providers
    site-header.tsx, stale-banner.tsx, updated-ago.tsx, anim-num.tsx
    ui/                           shadcn/ui components
  lib/
    metrics.ts (+ .test.ts)       Pure formulas
    format.ts                     Money, percent, token amount, relative time
    prestocks.ts                  API fetch, zod validation, snapshot fallback
    solana.ts                     Holdings, supply, transfer fee, RPC URL selection
    alerts.ts (+ .test.ts)        evaluateAlerts with injectable sender
    telegram.ts                   sendMessage and isConfigured
    db.ts                         Neon client (lazy init)
    og.tsx                        Shared fonts and helpers for share cards
scripts/
  telegram-setup.mjs              Registers the bot webhook
vercel.json                       Cron: /api/snapshot every 5 minutes
.env.example                      All environment variables with empty values
```

## API routes

All routes are under `/api`. Responses are JSON unless noted.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/prestocks` | none | `{ tokens, updatedAt, source }`. Each token has the raw API fields plus `premiumPct`, `marketSize`, `verdict`. `source` is `live` or `snapshot`. Cached 60s at the edge. |
| GET | `/api/holdings?owner=<pubkey>` | none | Positions for a wallet: `amount`, `value`, `fairValue`, `hiddenPremium`, `exitShare`, `exitTier` per token, plus totals. Returns 400 for an invalid address. |
| GET | `/api/history/[symbol]?range=24h\|7d\|30d` | none | Array of `{ t, premiumPct, tokenPrice, markPrice }` ascending. 24h returns raw points; 7d and 30d return hourly averages. Default range is 7d. |
| GET | `/api/snapshot` | `Authorization: Bearer $CRON_SECRET` or `?secret=` | Fetches the API fresh, inserts one `snapshots` row per token, upserts `token_cache`, runs `evaluateAlerts`. Returns `{ inserted, takenAt }`. 401 without the secret. |
| POST | `/api/rpc` | none | JSON-RPC passthrough to Helius (if `HELIUS_API_KEY` is set) or the public mainnet endpoint. |
| POST | `/api/telegram/link` | none | Creates a pairing code. Returns `{ code, url }` where `url` is a `t.me/<bot>?start=<code>` deep link. 503 if Telegram is not configured. |
| GET | `/api/telegram/link?code=` | none | `{ linked: boolean }`. Never returns the chat id. |
| POST | `/api/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` header | Telegram calls this. Handles `/start <code>` by attaching the chat id to the pairing code and replies with a confirmation. 401 on a wrong secret. |
| POST | `/api/alerts` | none | Body `{ symbol, direction: "below" \| "above", thresholdPct, code }`. Validates the symbol against the live token list and the threshold range (-90 to 300). Resolves the chat id from the pairing code, stores the alert, sends a confirmation message. |
| GET | `/api/og/token/[symbol]` | none | 1200x630 PNG share card for a token. |
| GET | `/api/og/portfolio?v=&f=&s=` | none | 1200x630 PNG share card for a portfolio. `v` total value, `f` fair value, `s` comma separated symbols (max 4 logos). No wallet address is ever included. |

## Database schema

Neon Postgres. Created once by hand; there is no migration tool in the repo.

```sql
CREATE TABLE snapshots (
  id            bigserial PRIMARY KEY,
  symbol        text NOT NULL,
  taken_at      timestamptz NOT NULL DEFAULT now(),
  token_price   double precision NOT NULL,
  mark_price    double precision NOT NULL,
  premium_pct   double precision NOT NULL,
  supply        double precision NOT NULL
);
CREATE INDEX snapshots_symbol_taken_at_idx ON snapshots (symbol, taken_at DESC);

CREATE TABLE token_cache (
  symbol      text PRIMARY KEY,
  payload     jsonb NOT NULL,          -- raw PreStocks API object
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
  id                 bigserial PRIMARY KEY,
  symbol             text NOT NULL,
  direction          text NOT NULL CHECK (direction IN ('below', 'above')),
  threshold_pct      double precision NOT NULL,
  telegram_chat_id   text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_triggered_at  timestamptz,
  active             boolean NOT NULL DEFAULT true
);
CREATE INDEX alerts_active_symbol_idx ON alerts (symbol) WHERE active;

CREATE TABLE telegram_links (
  code        text PRIMARY KEY,
  chat_id     text,                     -- null until the user presses Start
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

Run these statements against a fresh database to set up your own instance.

## Environment variables

Copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same variables in the project settings.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon Postgres connection string. Used for snapshots, token cache, alerts, Telegram links. |
| `CRON_SECRET` | yes | Bearer secret for `GET /api/snapshot`. Vercel cron sends it automatically when this variable is set. |
| `NEXT_PUBLIC_APP_URL` | yes | Absolute app URL, for example `https://your-app.vercel.app`. Used in Open Graph metadata, share links, and alert messages. |
| `HELIUS_API_KEY` | no | If set, `/api/rpc` routes Solana calls through Helius. Otherwise the public mainnet endpoint is used, which may rate-limit. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | no | A public RPC URL for the browser to call directly. Leave empty to use the `/api/rpc` proxy. |
| `TELEGRAM_BOT_TOKEN` | no | Bot token from @BotFather. Without it the alert dialog says alerts are not switched on. |
| `TELEGRAM_BOT_USERNAME` | no | Bot username (without @) for the `t.me` deep link. |
| `TELEGRAM_WEBHOOK_SECRET` | no | Random string. Telegram sends it back in a header and the webhook rejects requests without it. |

## Local setup

Requirements: Node 20 or newer, pnpm 10.

```bash
pnpm install
cp .env.example .env.local
# fill in DATABASE_URL, CRON_SECRET, NEXT_PUBLIC_APP_URL=http://localhost:3000

pnpm dev          # http://localhost:3000
```

Seed some history so the chart has points:

```bash
curl "http://localhost:3000/api/snapshot?secret=$CRON_SECRET"
```

Run that a few times a minute apart. The chart shows "History starts today" until at least two snapshots exist.

Useful addresses for testing `/me` without buying tokens: paste `WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc` (the PreStocks fee authority, which holds several positions).

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add every environment variable from the table above. Set `NEXT_PUBLIC_APP_URL` to the production URL.
3. Deploy. `vercel.json` registers the cron that hits `/api/snapshot` every 5 minutes. Vercel adds the `Authorization: Bearer $CRON_SECRET` header on its own.
4. Check the Vercel Cron logs after 5 minutes. You should see `{ "inserted": 8 }`.
5. If you use Telegram alerts, run the setup script below after the first deploy.

## Telegram alerts setup

1. Open [@BotFather](https://t.me/BotFather) in Telegram, send `/newbot`, and follow the prompts. Copy the bot token and the bot username.
2. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and a random `TELEGRAM_WEBHOOK_SECRET` in `.env.local` and in Vercel.
3. With `NEXT_PUBLIC_APP_URL` pointing at a public URL (production deploy or a tunnel), run:

   ```bash
   pnpm telegram:setup
   ```

   This calls `setWebhook` for `/api/telegram/webhook` with the secret and prints `getWebhookInfo` so you can confirm it took.

How an alert works end to end:

1. On a token page the user opens "Set alert". The app calls `POST /api/telegram/link`, receives a code and a `t.me` deep link, and opens it.
2. The user presses Start in Telegram. Telegram calls our webhook with `/start <code>`. We store the chat id against that code and reply "Linked".
3. The app polls `GET /api/telegram/link?code=` until `linked` is true, then shows the alert form (direction below or above, threshold %).
4. `POST /api/alerts` stores the alert and sends a confirmation message with the current premium.
5. Every snapshot run calls `evaluateAlerts`. When a token crosses a threshold, the bot sends a message with the new premium, the prices, and a link to the token page. The alert stays active and re-arms after a 6 hour cooldown so one crossing does not produce a flood.

The pairing code is kept in the browser's localStorage so a returning user does not need to link again.

## Testing and verification

```bash
pnpm vitest run     # 17 unit tests: formula boundaries, exit tiers, alert crossing and cooldown
pnpm tsc --noEmit   # type check
pnpm lint           # eslint
pnpm build          # production build
```

Manual checks that were run on every phase:

- `curl /api/prestocks` returns 8 tokens with `source: "live"`.
- `curl /api/holdings?owner=notakey` returns 400.
- `curl /api/snapshot` returns 401 without the secret and `{ inserted: 8 }` with it.
- `curl /api/telegram/webhook` returns 401 without the header.
- Screenshots at 375px and 1280px for every page, with zero browser console errors.
- Share cards render as valid 1200x630 PNGs.

## Design system

The rule is answer first, numbers second, details last. Each screen leads with a one word verdict, then the numbers, then the fine print.

- **Fonts.** Satoshi (Fontshare) for text, JetBrains Mono for every number so columns line up and NumberFlow animations do not jump. Share cards use Inter plus JetBrains Mono because Satori cannot load Fontshare's woff2 files.
- **Colors.** Defined in OKLCH in `globals.css`. Dark mode is the default. Neutral grey base, one blue accent, and green / grey / red only for verdicts. Warning amber for exit risk and stale data.
- **Verdict chips.** Always a word plus an icon (triangle up for Overpriced, circle for Fair, triangle down for Discount) on a 12% tinted background. Never color alone, so they work for colorblind users.
- **Provenance.** Every price shows "PreStocks, updated N min ago". Supply shows "Verified on Solana".
- **Wallet safety.** The connect button reads "View my holdings (read-only)" and the page says "We never ask you to sign anything."
- **States.** Skeleton loading, written empty states, written error states, stale-data banner.
- **Mobile first.** Layout is built for 375px wide first.

Components come from shadcn/ui (Base UI primitives), charts from recharts through the shadcn chart wrapper, animated numbers from NumberFlow, transitions from Motion, icons from Lucide.

## Demo script

About two minutes:

1. Open the leaderboard. "OpenAI and Neuralink are about 30% above fair value. SpaceX is 22% below."
2. Open `/me` and paste a wallet that holds OpenAI. "This holder has $73,000 of hidden premium and their wallet never told them."
3. Open the OpenAI X-Ray. Point at the gauge, the $3.8M market size, and the "What you own" list. "3% fee on every transfer, and the issuer can move tokens. All read from the mint."
4. Point at "Verified on Solana".
5. Press Share. The card appears, ready for X.
6. End on the SpaceX page. "Trading at a discount. Buy on PreStocks."

Pitch line: everyone wants OpenAI exposure. Nobody tells you that you are paying 30% over fair value. We do.

## Known limitations

- `/api/rpc` is an open passthrough. Once a Helius key is set, anyone who finds the deployment can spend its quota. Add an origin check or rate limit before a public launch.
- History only exists from the moment the cron starts. Deploy early so the chart has data by demo time.
- The snapshot fallback rebuilds tokens from cached payloads, so if the API is down before the first snapshot ever ran, pages will error.
- Alerts depend on the 5 minute cron, so a crossing can be noticed up to 5 minutes late.
- `markPrice` update cadence is not documented by PreStocks. We describe it as "the company's latest valuation" and nothing more.
- No investment advice anywhere. Verdicts are labels for a number, not recommendations.

## License

MIT
