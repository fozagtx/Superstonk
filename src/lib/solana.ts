import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
