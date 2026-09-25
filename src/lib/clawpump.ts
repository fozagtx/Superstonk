import "server-only";

// Clawpump API client. Endpoint paths and request shapes mirror @clawpump/agents
// (the MCP package). Base URL is the same default that package uses; override
// with CLAWPUMP_API_URL. Auth is `Authorization: Bearer $CLAWPUMP_API_KEY` (a cpk_ key).

const DEFAULT_BASE = "https://ai-agents-production-6ca0.up.railway.app";
const PUBLIC_API = "https://clawpump.tech";

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export function clawpumpConfigured(): boolean {
  return Boolean(process.env.CLAWPUMP_API_KEY);
}

function base(): string {
  return process.env.CLAWPUMP_API_URL || DEFAULT_BASE;
}

export class ClawpumpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T = unknown>(
  path: string,
  options: RequestInit & { auth?: "omit" } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (options.auth !== "omit" && process.env.CLAWPUMP_API_KEY) {
    headers.Authorization = `Bearer ${process.env.CLAWPUMP_API_KEY}`;
  }
  const res = await fetch(`${base()}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new ClawpumpError(
      res.status,
      body.error || body.message || `Clawpump API error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

// ---- Agents ---------------------------------------------------------------

export interface ClawpumpAgent {
  id: string;
  name: string;
  status?: string;
  wallet_address?: string;
  config?: { model?: string };
  enabled_skills?: string[];
  token_launch?: unknown;
}

export async function createAgent(name: string): Promise<ClawpumpAgent> {
  return api("/agents", {
    method: "POST",
    body: JSON.stringify({
      name,
      enabled_skills: ["defi-trading", "wallet-ops", "portfolio"],
    }),
  });
}

export async function getAgent(agentId: string): Promise<ClawpumpAgent> {
  return api(`/agents/${agentId}`);
}

// ---- Wallet ----------------------------------------------------------------

export interface WalletSummary {
  agent_id?: string;
  wallet_address?: string;
  sol_balance?: number;
  usdc_balance?: number;
  balances?: { mint?: string; symbol?: string; amount?: number }[];
  [k: string]: unknown;
}

export async function getWalletSummaries(): Promise<WalletSummary[]> {
  const res = await api<{ wallets: WalletSummary[] }>("/wallets/summary");
  return res.wallets ?? [];
}

export async function getWalletHistory(
  agentId: string,
  limit = 50,
): Promise<Record<string, unknown>[]> {
  const res = await api<{ transactions: Record<string, unknown>[] }>(
    `/wallets/${agentId}/history?limit=${limit}`,
  );
  return res.transactions ?? [];
}

export async function addToWhitelist(
  agentId: string,
  address: string,
  label?: string,
): Promise<unknown> {
  return api(`/whitelist/${agentId}`, {
    method: "POST",
    body: JSON.stringify({ address, label }),
  });
}

// `agent_send` in the MCP tools — transfer SOL/USDC out of the agent wallet.
export async function agentSend(
  agentId: string,
  to: string,
  amount: number,
  token: "SOL" | "USDC" = "USDC",
): Promise<unknown> {
  return api(`/wallets/${agentId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ to, amount, token }),
  });
}

// ---- Trading ---------------------------------------------------------------

export interface SwapResult {
  tx?: string;
  signature?: string;
  [k: string]: unknown;
}

export async function swapExecute(params: {
  agentId: string;
  inputMint: string;
  outputMint: string;
  amount: string; // smallest unit
  slippageBps?: number;
}): Promise<SwapResult> {
  return api("/swap/execute", {
    method: "POST",
    body: JSON.stringify({
      agent_id: params.agentId,
      input_mint: params.inputMint,
      output_mint: params.outputMint,
      amount: params.amount,
      ...(params.slippageBps !== undefined
        ? { slippage_bps: params.slippageBps }
        : {}),
    }),
  });
}

export async function dcaCreate(params: {
  agentId: string;
  inputMint: string;
  outputMint: string;
  amountPerCycle: string; // smallest unit
  cycleSeconds: number;
  numCycles: number;
}): Promise<Record<string, unknown>> {
  return api("/dca", {
    method: "POST",
    body: JSON.stringify({
      agent_id: params.agentId,
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amountPerCycle: params.amountPerCycle,
      cycleSeconds: params.cycleSeconds,
      numCycles: params.numCycles,
    }),
  });
}

export async function dcaCancel(dcaId: string): Promise<unknown> {
  return api(`/dca/${dcaId}/cancel`, { method: "POST" });
}

export async function limitOrderCreate(params: {
  agentId: string;
  inputMint: string;
  outputMint: string;
  amount: string;
  triggerPrice: string;
}): Promise<Record<string, unknown>> {
  return api("/limit-orders", {
    method: "POST",
    body: JSON.stringify({
      agent_id: params.agentId,
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      triggerPrice: params.triggerPrice,
    }),
  });
}

export async function syncBilling(): Promise<unknown> {
  return api("/billing/sync", { method: "POST" });
}

// ---- Fees & launches (public clawpump.tech API) -----------------------------

export interface FeeEarnings {
  total?: number;
  [k: string]: unknown;
}

export async function getEarnings(agentId: string): Promise<FeeEarnings> {
  const res = await fetch(
    `${PUBLIC_API}/api/fees/earnings?agentId=${encodeURIComponent(agentId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new ClawpumpError(res.status, `Earnings ${res.status}`);
  return res.json() as Promise<FeeEarnings>;
}

export interface LaunchedToken {
  mintAddress: string;
  name: string;
  symbol: string;
  marketCap?: number;
  price?: number;
  volume24h?: number;
  liquidity?: number;
  agentId?: string;
  claimAgentId?: string;
  quoteAsset?: { mint: string; symbol: string };
  [k: string]: unknown;
}

export async function listTokens(): Promise<LaunchedToken[]> {
  const res = await fetch(`${PUBLIC_API}/api/tokens`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new ClawpumpError(res.status, `Tokens ${res.status}`);
  const data = (await res.json()) as { tokens: LaunchedToken[] };
  return data.tokens ?? [];
}
