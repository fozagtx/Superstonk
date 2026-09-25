import "server-only";
import { sql } from "./db";
import {
  addToWhitelist,
  clawpumpConfigured,
  createAgent,
  swapExecute,
  USDC_MINT,
} from "./clawpump";
import { fetchPreStocks } from "./prestocks";
import { marketStatus } from "./market-hours";
import { nextRunAt, type Frequency } from "./schedule";

export interface BrokerUser {
  user_id: string;
  agent_id: string | null;
  agent_wallet: string | null;
  external_wallet: string | null;
  demo: boolean;
  created_at: string;
}

export interface Plan {
  id: number;
  user_id: string;
  symbol: string;
  amount_usdc: number;
  frequency: Frequency;
  max_premium_pct: number;
  next_run_at: string;
  active: boolean;
  created_at: string;
}

export interface Activity {
  id: number;
  user_id: string;
  kind: "create" | "fund" | "buy" | "skip" | "withdraw";
  symbol: string | null;
  amount_usdc: number | null;
  token_amount: number | null;
  price: number | null;
  reason: string;
  tx: string | null;
  demo: boolean;
  created_at: string;
}

// A plausible-looking base58 address used only in demo mode. Deterministic so
// the demo is stable; clearly not a real funded wallet.
const DEMO_WALLET = "DmoAgntW4LLet1111111111111111111111111111";

async function logActivity(
  userId: string,
  entry: Omit<Activity, "id" | "user_id" | "created_at">,
): Promise<void> {
  await sql`
    INSERT INTO broker_activity (user_id, kind, symbol, amount_usdc, token_amount, price, reason, tx, demo)
    VALUES (${userId}, ${entry.kind}, ${entry.symbol}, ${entry.amount_usdc},
            ${entry.token_amount}, ${entry.price}, ${entry.reason}, ${entry.tx}, ${entry.demo})
  `;
}

// Get or lazily provision the user's broker record. With a Clawpump key the
// first call creates a real agent + wallet; without one the user gets a demo
// agent so the whole product flow is exercisable.
export async function ensureUser(userId: string): Promise<BrokerUser> {
  const rows = (await sql`
    SELECT user_id, agent_id, agent_wallet, external_wallet, demo, created_at
    FROM broker_users WHERE user_id = ${userId}
  `) as BrokerUser[];
  const existing = rows[0];
  if (existing) {
    // Upgrade a demo user to a real agent once a Clawpump key appears.
    if (!existing.demo || !clawpumpConfigured()) return existing;
  }

  const demo = !clawpumpConfigured();
  let agentId: string;
  let wallet: string;
  if (demo) {
    agentId = `demo-${userId.slice(0, 8)}`;
    wallet = DEMO_WALLET;
  } else {
    const agent = await createAgent(`after-hours-${userId.slice(0, 8)}`);
    agentId = agent.id;
    wallet = agent.wallet_address ?? "";
  }

  const upserted = (await sql`
    INSERT INTO broker_users (user_id, agent_id, agent_wallet, demo)
    VALUES (${userId}, ${agentId}, ${wallet}, ${demo})
    ON CONFLICT (user_id)
    DO UPDATE SET agent_id = EXCLUDED.agent_id,
                  agent_wallet = EXCLUDED.agent_wallet,
                  demo = EXCLUDED.demo
    RETURNING user_id, agent_id, agent_wallet, external_wallet, demo, created_at
  `) as BrokerUser[];
  const user = upserted[0];

  if (!existing) {
    await logActivity(userId, {
      kind: "create",
      symbol: null,
      amount_usdc: null,
      token_amount: null,
      price: null,
      reason: demo
        ? "Demo agent created — set CLAWPUMP_API_KEY to provision a real one"
        : "Your agent was created and got its own Solana wallet",
      tx: null,
      demo,
    });
  }
  return user;
}

export async function setExternalWallet(
  userId: string,
  wallet: string,
): Promise<void> {
  const user = await ensureUser(userId);
  if (!user.demo && user.agent_id) {
    await addToWhitelist(user.agent_id, wallet, "user-privy-wallet");
  }
  await sql`
    UPDATE broker_users SET external_wallet = ${wallet} WHERE user_id = ${userId}
  `;
}

export async function listPlans(userId: string): Promise<Plan[]> {
  return (await sql`
    SELECT id, user_id, symbol, amount_usdc, frequency, max_premium_pct,
           next_run_at, active, created_at
    FROM broker_plans WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as Plan[];
}

export async function createPlan(
  userId: string,
  input: {
    symbol: string;
    amountUsdc: number;
    frequency: Frequency;
    maxPremiumPct: number;
  },
): Promise<Plan> {
  await ensureUser(userId);
  const rows = (await sql`
    INSERT INTO broker_plans (user_id, symbol, amount_usdc, frequency, max_premium_pct, next_run_at)
    VALUES (${userId}, ${input.symbol}, ${input.amountUsdc}, ${input.frequency},
            ${input.maxPremiumPct}, ${nextRunAt(input.frequency, new Date()).toISOString()})
    RETURNING id, user_id, symbol, amount_usdc, frequency, max_premium_pct,
              next_run_at, active, created_at
  `) as Plan[];
  return rows[0];
}

export async function setPlanActive(
  userId: string,
  planId: number,
  active: boolean,
): Promise<void> {
  await sql`
    UPDATE broker_plans SET active = ${active}
    WHERE id = ${planId} AND user_id = ${userId}
  `;
}

export async function recordFunding(
  userId: string,
  amountUsdc: number,
  tx: string | null,
): Promise<void> {
  const user = await ensureUser(userId);
  await logActivity(userId, {
    kind: "fund",
    symbol: null,
    amount_usdc: amountUsdc,
    token_amount: null,
    price: null,
    reason: `Funded agent wallet with ${amountUsdc} USDC`,
    tx,
    demo: user.demo,
  });
}

export async function listActivity(
  userId: string,
  limit = 100,
): Promise<Activity[]> {
  return (await sql`
    SELECT id, user_id, kind, symbol, amount_usdc, token_amount, price, reason,
           tx, demo, created_at
    FROM broker_activity WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT ${limit}
  `) as Activity[];
}

export interface RunResult {
  planId: number;
  outcome: "bought" | "skipped" | "failed";
  reason: string;
}

// Runs every due plan once: premium check, then the buy. Real swaps go through
// Clawpump; in demo mode the buy is simulated at the live PreStocks price.
export async function runDuePlans(now = new Date()): Promise<RunResult[]> {
  const due = (await sql`
    SELECT id, user_id, symbol, amount_usdc, frequency, max_premium_pct,
           next_run_at, active, created_at
    FROM broker_plans
    WHERE active AND next_run_at <= ${now.toISOString()}
  `) as Plan[];
  if (due.length === 0) return [];

  const { tokens } = await fetchPreStocks();
  const results: RunResult[] = [];

  for (const plan of due) {
    const next = nextRunAt(plan.frequency, now).toISOString();
    const users = (await sql`
      SELECT agent_id, demo FROM broker_users WHERE user_id = ${plan.user_id}
    `) as Pick<BrokerUser, "agent_id" | "demo">[];
    const user = users[0];
    const token = tokens.find(
      (t) => t.symbol.toUpperCase() === plan.symbol.toUpperCase(),
    );

    const finish = async (outcome: RunResult["outcome"], reason: string) => {
      await sql`UPDATE broker_plans SET next_run_at = ${next} WHERE id = ${plan.id}`;
      results.push({ planId: plan.id, outcome, reason });
    };

    if (!user || !token) {
      await finish("failed", user ? `unknown token ${plan.symbol}` : "no agent");
      continue;
    }

    const { open } = marketStatus(now);
    const pct = token.premiumPct;

    if (pct > plan.max_premium_pct) {
      const reason = `Skipped — ${plan.symbol} premium ${pct.toFixed(1)}% is above your ${plan.max_premium_pct}% cap`;
      await logActivity(plan.user_id, {
        kind: "skip",
        symbol: plan.symbol,
        amount_usdc: plan.amount_usdc,
        token_amount: null,
        price: token.tokenPrice,
        reason,
        tx: null,
        demo: user.demo,
      });
      await finish("skipped", reason);
      continue;
    }

    if (user.demo) {
      const reason = `Scheduled ${plan.frequency} buy while US markets were ${open ? "open" : "closed"} — premium ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% within ${plan.max_premium_pct}% cap (simulated)`;
      await logActivity(plan.user_id, {
        kind: "buy",
        symbol: plan.symbol,
        amount_usdc: plan.amount_usdc,
        token_amount: plan.amount_usdc / token.tokenPrice,
        price: token.tokenPrice,
        reason,
        tx: null,
        demo: true,
      });
      await finish("bought", reason);
      continue;
    }

    try {
      const res = await swapExecute({
        agentId: user.agent_id!,
        inputMint: USDC_MINT,
        outputMint: token.contract_address,
        amount: String(Math.round(plan.amount_usdc * 1e6)),
      });
      const tx = res.tx ?? res.signature ?? null;
      const reason = `Scheduled ${plan.frequency} buy while US markets were ${open ? "open" : "closed"} — premium ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% within ${plan.max_premium_pct}% cap`;
      await logActivity(plan.user_id, {
        kind: "buy",
        symbol: plan.symbol,
        amount_usdc: plan.amount_usdc,
        token_amount: plan.amount_usdc / token.tokenPrice,
        price: token.tokenPrice,
        reason,
        tx,
        demo: false,
      });
      await finish("bought", reason);
    } catch (e) {
      await finish(
        "failed",
        e instanceof Error ? e.message : "swap failed",
      );
    }
  }
  return results;
}
