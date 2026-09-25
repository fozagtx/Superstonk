import { NextRequest, NextResponse } from "next/server";
import { resolveUserId, demoMode } from "@/lib/auth";
import { ensureUser, setExternalWallet } from "@/lib/broker";
import { clawpumpConfigured, getWalletSummaries } from "@/lib/clawpump";
import { z } from "zod";

export const dynamic = "force-dynamic";

// The user's broker record plus live wallet balances (when Clawpump is live).
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await ensureUser(userId);
  let wallets: unknown[] = [];
  let walletError: string | null = null;
  if (clawpumpConfigured() && !user.demo) {
    try {
      wallets = (await getWalletSummaries()).filter(
        (w) => w.agent_id === user.agent_id || w.wallet_address === user.agent_wallet,
      );
    } catch (e) {
      walletError = e instanceof Error ? e.message : "wallet lookup failed";
    }
  }
  return NextResponse.json({ user, wallets, walletError, demo: demoMode() });
}

const bootstrapSchema = z.object({
  externalWallet: z.string().min(32).max(44).optional(),
});

// First-login bootstrap: provision the agent and whitelist the user's wallet.
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = bootstrapSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }
  await ensureUser(userId);
  if (body.data.externalWallet) {
    await setExternalWallet(userId, body.data.externalWallet);
  }
  return NextResponse.json({ user: await ensureUser(userId) });
}
