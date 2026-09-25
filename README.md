# Superstonk — Pre-IPO Research Terminal

Superstonk is a dark research terminal for **PreStocks tokenized pre-IPO stocks** on Solana. It ranks daily, weekly, and monthly runners, combines canonical PreStocks quotes with public DEX context, and gives each token deterministic signals, a score, and an agent-facing launch kit for a suggested Meteora Dynamic Bonding Curve launch.

This app does not use Privy, wallets, authentication, or Clawpump client calls. The API is informational and suggestion-only: it never launches a token or signs a transaction.

## Screens

- **Research (`/`)** — runner board and a full token research table.
- **Token detail (`/token/SPACEX`)** — quote/mark comparison, DEX price divergence, liquidity and flow, OHLCV chart, signals, summary, and launch-kit JSON.
- **Agents API (`/agents`)** — endpoint cards, copyable curl examples, and the runner-to-launch-kit flow.

## Data sources

- **PreStocks** (`https://prestocks.com/api/prestocks`) supplies the canonical `tokenPrice`, mark price, metadata, supply, and mint.
- **GeckoTerminal** supplies public Solana DEX price, liquidity, 24h volume, pool flow, and daily OHLCV candles.

PreStocks `tokenPrice` is the canonical quote. DEX price can diverge substantially (for example, SPACEX can show a very different DEX price), so the UI and API expose both `dex.priceUsd` and `dexDivergencePct`. GeckoTerminal failures return null data and do not break the UI. Candle history can be empty while it warms up.

## Agent API v1

All v1 JSON responses include CORS (`Access-Control-Allow-Origin: *`) and `Cache-Control: s-maxage=60, stale-while-revalidate=300`.

| Endpoint | Purpose | Example |
| --- | --- | --- |
| `GET /api/v1/research` | Full report, all tokens, runners, source, and market status | `curl https://YOUR_APP/api/v1/research` |
| `GET /api/v1/runners?window=1d\|7d\|30d` | Ranked runners; default is `7d` | `curl 'https://YOUR_APP/api/v1/runners?window=7d'` |
| `GET /api/v1/tokens` | Lightweight list without candles | `curl https://YOUR_APP/api/v1/tokens` |
| `GET /api/v1/tokens/{symbol}` | Full token research including candles | `curl https://YOUR_APP/api/v1/tokens/SPACEX` |
| `GET /api/v1/tokens/{symbol}/launch-kit` | Suggested metadata, mints, links, and research | `curl https://YOUR_APP/api/v1/tokens/SPACEX/launch-kit` |
| `GET /api/v1/openapi.json` | OpenAPI 3.1 reference | `curl https://YOUR_APP/api/v1/openapi.json` |
| `GET /api/v1/skill.md` | Agent-facing usage guide | `curl https://YOUR_APP/api/v1/skill.md` |
| `GET /llms.txt` | Discovery pointers | `curl https://YOUR_APP/llms.txt` |

## Runner → launch kit → Meteora DBC

1. Call `/api/v1/runners?window=7d` and pick a runner. Use `/api/v1/tokens/{symbol}` to inspect signals, score, liquidity, flow, and DEX-versus-quote divergence.
2. Call `/api/v1/tokens/{symbol}/launch-kit`. It returns suggested token metadata, the underlying PreStocks mint, USDC and underlying quote-mint options, research, and useful links.
3. Review the suggestions and use the Meteora DBC SDK (`buildCurve → createConfig → createPool`). Simulate and verify all parameters before any wallet signs. The kit is not an instruction to launch and Superstonk does not execute the launch.

## Scoring and signal rules

The composite score starts at 50:

- Add `clamp(change7d, -15, 15)`.
- Add `clamp(change30d / 2, -10, 10)`.
- Discount +10; overpriced −10; fair +0.
- Liquidity below $50,000 −10.
- Absolute DEX divergence above 10% −10.
- Net buying flow +5; net selling flow −5.
- Clamp to 0–100 and round.

Signals use these exact thresholds:

- Momentum: `change7d > 10` → bullish strong weekly runner; `< -10` → bearish; otherwise `change1d > 5` → bullish daily runner; `< -5` → bearish.
- Premium: discount → bullish discount to private-market value; overpriced → caution premium over mark; fair → neutral.
- Liquidity: below $50,000 → caution thin liquidity; at least $250,000 → neutral deep liquidity.
- Divergence: absolute DEX divergence above 10% → caution.
- Volatility: 7d volatility above 8% → caution.
- Flow: at least 5 total trades and buys greater than 1.5× sells → bullish net buying; sells greater than 1.5× buys → bearish net selling.

## Environment

Copy `.env.example` to `.env.local`.

- `DATABASE_URL` — optional. Used for snapshot fallback and history cron; the live app works without a database when the public PreStocks API is available.
- `CRON_SECRET` — bearer/query secret for `/api/snapshot`.
- `NEXT_PUBLIC_APP_URL` — absolute deployed URL used in launch-kit links.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. Public PreStocks and GeckoTerminal APIs are fetched server-side.

## Tests and checks

```bash
pnpm vitest run
pnpm next typegen && pnpm tsc --noEmit
pnpm lint
pnpm build
```

## Database snapshots

Only the existing `snapshots` and `token_cache` tables are needed for optional history and fallback:

```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL,
  token_price NUMERIC NOT NULL,
  mark_price NUMERIC NOT NULL,
  premium_pct NUMERIC NOT NULL,
  supply NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS snapshots_symbol_taken_at_idx
  ON snapshots (symbol, taken_at DESC);

CREATE TABLE IF NOT EXISTS token_cache (
  symbol TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
