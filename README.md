# After-Hours Broker

An AI agent that invests a worker's paycheck into tokenized pre-IPO stocks on Solana — 24/7, while they are at work or asleep.

**Problem.** US markets are open 9:30am–4pm ET, the same hours 9–5 workers are busy. They invest in leftover minutes, or not at all. Pre-IPO names like SpaceX and OpenAI are out of reach at a normal broker.

**Solution.** Each user gets their own Clawpump agent with its own Solana wallet. It takes USDC in, buys PreStocks tokens on a schedule the user sets, and trades nights and weekends. The agent's own token trades in a Meteora DBC pool quoted in SPACEX, and its trading fees pay the agent's running costs.

Built for the [Stocklana hackathon](https://hackathons.solana.com/hackathons/stocklana) (main track; PreStocks, Meteora DBC, Clawpump and Pyth bounties). Data only, not financial advice.

## Demo mode

Every screen and API route works **without any keys**: the app runs a demo worker with a simulated agent and simulated buys, all clearly tagged `demo` in the UI and database. Set the environment variables below and the same code paths go live — a real Clawpump agent is provisioned on first login and scheduled buys become real `swap_execute` calls.

- No `CLAWPUMP_API_KEY` → demo agent, demo wallet, buys simulated at the live PreStocks price.
- No `NEXT_PUBLIC_PRIVY_APP_ID` / `PRIVY_APP_ID` + `PRIVY_APP_SECRET` → a single shared demo user, no sign-in wall.
- No `AGENT_TOKEN_MINT` / `METEORA_POOL_ADDRESS` → the `/agent` page shows the "not launched yet" state.

## Screens

| Route | Screen | What is on it |
| --- | --- | --- |
| `/` | Dashboard | Product pitch, agent card (wallet, balance), plan summary, recent activity. Sign-in CTA when Privy is configured. |
| `/fund` | Funding | Agent wallet address with QR code, USDC/SOL balances from `get_wallet_summaries`, "I sent it" recorder. |
| `/plan` | Plan builder | Token picker with live PreStocks prices, premium and verdict; amount, frequency, premium-guard slider. Pause/resume existing plans. |
| `/activity` | Activity feed | Every buy, skip, funding and withdrawal with price, amount and a one-line plain-language reason. |
| `/agent` | Agent token | The agent-token pool on Meteora DBC (quoted in SPACEX), trading fees earned, and what they pay for. |

Every page carries the market-hours badge: **"Wall St closed — agent still trading"** after hours, "US markets open" during 9:30–16:00 ET weekdays.

## How it works

```
Privy sign-in ──> broker_users (privyUserId → agentId, agentWallet)
                     │  first login: Clawpump create_agent + whitelist
                     ▼
Plan (symbol, USDC, frequency, premium cap) ──> broker_plans
                     │
        /api/cron/run-buys (every 5 min, CRON_SECRET)
                     │  for each due plan:
                     │    premium = (tokenPrice − markPrice) / markPrice
                     │    premium > cap  → log "skipped" + reschedule
                     │    else           → Clawpump swap_execute USDC→mint
                     │                     (or simulated buy in demo mode)
                     ▼
              broker_activity ──> Activity feed
```

Three money flows stay strictly separate:

| Flow | Money in | Money out | Rule |
| --- | --- | --- | --- |
| User savings | USDC + a little SOL from the user | PreStocks tokens in the user's own agent wallet | Never buys the agent token |
| Running costs | Agent fee revenue, or team SOL at first | AI credits, swap fees, hosting | Paid from the fee wallet only |
| Agent token | SPACEX from buyers on the DBC curve | Graduates into a DAMM v2 pool | Fees go to the agent's fee wallet |

## Project structure

```
src/
  app/
    page.tsx                Dashboard (landing + agent card, plans, activity preview)
    fund/page.tsx           Funding screen
    plan/page.tsx           Plan builder
    activity/page.tsx       Activity feed
    agent/page.tsx          Agent token pool + revenue
    api/
      market/route.ts       US market open/closed status for the badge
      agent/route.ts        GET agent + wallet summaries; POST bootstrap (+external wallet)
      agent/fund/route.ts   Record a funding event
      plans/route.ts        List/create plans
      plans/[id]/route.ts   Pause/resume a plan
      activity/route.ts     Activity feed
      earnings/route.ts     Clawpump fee earnings + agent-token pool info
      cron/run-buys/route.ts Scheduler: executes due plans (CRON_SECRET)
      prestocks/route.ts    PreStocks token list with computed metrics
      snapshot/route.ts     Price snapshots + token cache refresh (CRON_SECRET)
  components/
    auth-provider.tsx       Privy-gated auth; demo user when unconfigured
    dashboard.tsx, funding-card.tsx, plan-builder.tsx
    activity-feed.tsx, earnings-panel.tsx, market-badge.tsx
    verdict-chip.tsx, site-header.tsx, ui/
  lib/
    clawpump.ts             Clawpump REST client (create_agent, wallets, swap, dca, limit orders, whitelist, earnings)
    market-hours.ts (+test) US market hours, NYSE holidays, badge label
    schedule.ts (+test)     Plan frequencies + next-run computation
    broker.ts               Users, plans, activity, runDuePlans scheduler
    auth.ts                 Privy token verification / demo user
    prestocks.ts            PreStocks API + metrics + snapshot fallback
    metrics.ts (+test)      premiumPct, marketSize, verdict
    format.ts, db.ts, utils.ts
vercel.json                 crons: /api/snapshot + /api/cron/run-buys every 5 min
```

## API routes

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/market` | none | `{open, label, checkedAt}` — the badge's data. |
| GET | `/api/agent` | user | `{user, wallets, walletError, demo}` — broker record + live wallet balances. |
| POST | `/api/agent` | user | Bootstrap: provision agent, optional `{externalWallet}` whitelisting. |
| POST | `/api/agent/fund` | user | `{amountUsdc, tx?}` — record a funding event. |
| GET/POST | `/api/plans` | user | List plans / create `{symbol, amountUsdc, frequency, maxPremiumPct}`. |
| PATCH | `/api/plans/[id]` | user | `{active}` — pause or resume a plan. |
| GET | `/api/activity` | user | The user's activity feed. |
| GET | `/api/earnings` | user | Clawpump fee earnings + agent-token pool info. |
| GET | `/api/cron/run-buys` | `Bearer $CRON_SECRET` or `?secret=` | Runs all due plans once. |
| GET | `/api/prestocks` | none | Token list with `premiumPct`, `marketSize`, `verdict`. |
| GET | `/api/snapshot` | `Bearer $CRON_SECRET` or `?secret=` | Price snapshot rows + token cache refresh. |

"User" auth is the Privy access token as a Bearer header when Privy is configured; in demo mode every request resolves to the shared demo worker.

## Database schema

Postgres (Neon or any `postgres://` URL), created once by hand (no migration tool).

```sql
CREATE TABLE broker_users (
  user_id         text PRIMARY KEY,            -- Privy user id, or "demo-worker"
  agent_id        text,                        -- Clawpump agent id
  agent_wallet    text,
  external_wallet text,                        -- whitelisted Privy wallet
  demo            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE broker_plans (
  id              bigserial PRIMARY KEY,
  user_id         text NOT NULL REFERENCES broker_users(user_id),
  symbol          text NOT NULL,
  amount_usdc     double precision NOT NULL,
  frequency       text NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  max_premium_pct double precision NOT NULL DEFAULT 10,
  next_run_at     timestamptz NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX broker_plans_due_idx ON broker_plans (next_run_at) WHERE active;

CREATE TABLE broker_activity (
  id           bigserial PRIMARY KEY,
  user_id      text NOT NULL REFERENCES broker_users(user_id),
  kind         text NOT NULL CHECK (kind IN ('create','fund','buy','skip','withdraw')),
  symbol       text,
  amount_usdc  double precision,
  token_amount double precision,
  price        double precision,
  reason       text NOT NULL,
  tx           text,
  demo         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX broker_activity_user_idx ON broker_activity (user_id, created_at DESC);

-- Price snapshots + raw payload cache (PreStocks fallback and history)
CREATE TABLE snapshots (
  id          bigserial PRIMARY KEY,
  symbol      text NOT NULL,
  taken_at    timestamptz NOT NULL DEFAULT now(),
  token_price double precision NOT NULL,
  mark_price  double precision NOT NULL,
  premium_pct double precision NOT NULL,
  supply      double precision NOT NULL
);
CREATE INDEX snapshots_symbol_taken_at_idx ON snapshots (symbol, taken_at DESC);

CREATE TABLE token_cache (
  symbol     text PRIMARY KEY,
  payload    jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (Neon works). |
| `CRON_SECRET` | yes | Bearer secret for `/api/snapshot` and `/api/cron/run-buys`. |
| `NEXT_PUBLIC_APP_URL` | yes | Absolute app URL. |
| `CLAWPUMP_API_KEY` | no | `cpk_` key from the Clawpump dashboard. Absent → demo agent and simulated buys. |
| `CLAWPUMP_API_URL` | no | Override the Clawpump API base (defaults to the production deployment). |
| `NEXT_PUBLIC_PRIVY_APP_ID` | no | Privy App ID — enables sign-in + embedded Solana wallets. |
| `PRIVY_APP_ID`, `PRIVY_APP_SECRET` | no | Server-side Privy verification for API calls. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | no | RPC for Privy wallet ops; use a paid provider on mainnet. |
| `AGENT_TOKEN_MINT` | no | Agent token mint — set after the DBC launch so `/agent` shows the pool. |
| `METEORA_POOL_ADDRESS`, `METEORA_DBC_CONFIG` | no | Pool + config addresses for the agent page links. |

## Key addresses

| What | Address |
| --- | --- |
| Meteora DBC program | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` |
| SPACEX PreStocks mint (pool quote token) | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` |
| USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

## Launch runbook (mainnet)

One-time setup, mostly from a laptop — the deploy keypair never goes on a server. ~0.04–0.07 SOL total (fund the deploy wallet with 0.1 SOL).

1. Create a deploy keypair and fund it with 0.1 SOL.
2. Get a `cpk_` key from [Clawpump](https://clawpump.tech/dashboard/api) and a Privy App ID/secret; set the env vars on the host.
3. Confirm Jupiter routes to each PreStocks mint (`POST /swap/quote` for $1).
4. Create the project's Clawpump agent via the app's bootstrap (`POST /api/agent` provisions one per user on first login).
5. Launch the agent token on a Meteora DBC pool quoted in SPACEX
   (`@meteora-ag/dynamic-bonding-curve-sdk`: `buildCurve` → partner `createConfig` → `createPool`, migration target DAMM v2). Set the fee claimer to the agent's fee wallet. Simulate first to read exact rent.
   - *Open question for Clawpump:* whether their launch path can emit a custom Meteora quote token, which would satisfy the Clawpump bounty directly — ask in their Discord/Telegram.
6. Set `AGENT_TOKEN_MINT`, `METEORA_POOL_ADDRESS`, `METEORA_DBC_CONFIG`.
7. Smoke test: sign in, fund the agent with $1, let one scheduled buy run, withdraw.
8. Record agent wallet, token mint, DBC config and pool addresses for the submission.

## Local setup

Requirements: Node 20+, pnpm 10.

```bash
pnpm install
cp .env.example .env.local
# fill in DATABASE_URL, CRON_SECRET, NEXT_PUBLIC_APP_URL=http://localhost:3000
pnpm dev
```

Without `DATABASE_URL` the demo mode still needs the tables above — the app stores plans/activity in Postgres either way.

## Testing

```bash
pnpm vitest run     # unit tests: market hours, plan scheduling, metrics
pnpm tsc --noEmit   # type check
pnpm lint           # eslint
pnpm build          # production build
```

## Known limitations

- Buys execute through our own scheduler (`/api/cron/run-buys`) so the premium guard applies per buy; `dca_create`/`limit_order_create` wrappers exist in `src/lib/clawpump.ts` for the P1 limit-order feature but are not wired into the UI yet.
- US persons may be restricted from PreStocks tokens — check their terms and geo-gate if needed before a real launch.
- Funding is the QR/address path (send USDC directly); in-app Privy `fundWallet` on-ramp is not wired.
- The `/api/snapshot` price-history cron is kept from the previous build and feeds the PreStocks fallback; a premium-history chart on the plan picker is a nice-to-have.
