import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getMint,
  getTransferFeeConfig,
} from "@solana/spl-token";
import { unstable_cache } from "next/cache";

export function publicRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "/api/rpc";
}

export function serverRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  }
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  return "https://api.mainnet-beta.solana.com";
}

export interface Holding {
  mint: string;
  amount: number;
}

export async function getHoldings(
  owner: PublicKey,
  mints: string[],
  rpcUrl = serverRpcUrl(),
): Promise<Holding[]> {
  const connection = new Connection(rpcUrl, "confirmed");
  const wanted = new Set(mints);
  const totals = new Map<string, number>();

  for (const programId of [TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID]) {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId,
    });
    for (const { account } of accounts.value) {
      const info = account.data.parsed?.info;
      if (!info || !wanted.has(info.mint)) continue;
      const uiAmount: number = info.tokenAmount?.uiAmount ?? 0;
      if (uiAmount <= 0) continue;
      totals.set(info.mint, (totals.get(info.mint) ?? 0) + uiAmount);
    }
  }

  return [...totals.entries()].map(([mint, amount]) => ({ mint, amount }));
}

async function fetchOnChainSupply(mint: string): Promise<number> {
  const connection = new Connection(serverRpcUrl(), "confirmed");
  const res = await connection.getTokenSupply(new PublicKey(mint));
  return res.value.uiAmount ?? 0;
}

export const getOnChainSupply = (mint: string) =>
  unstable_cache(
    () => fetchOnChainSupply(mint),
    ["onchain-supply", mint],
    { revalidate: 300 },
  )();

async function fetchTransferFeeBps(mint: string): Promise<number | null> {
  try {
    const connection = new Connection(serverRpcUrl(), "confirmed");
    const info = await getMint(
      connection,
      new PublicKey(mint),
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
    const cfg = getTransferFeeConfig(info);
    if (!cfg) return null;
    return Number(
      cfg.newerTransferFee.transferFeeBasisPoints ??
        cfg.olderTransferFee.transferFeeBasisPoints,
    );
  } catch {
    return null;
  }
}

export const getTransferFeeBps = (mint: string) =>
  unstable_cache(
    () => fetchTransferFeeBps(mint),
    ["transfer-fee-bps", mint],
    { revalidate: 300 },
  )();
