import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { ensureUser } from "@/lib/broker";
import { getEarnings, listTokens } from "@/lib/clawpump";

export const dynamic = "force-dynamic";

// Agent revenue: Clawpump fee earnings plus the agent-token pool metadata
// (configured via env after the Meteora DBC pool is launched).
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await ensureUser(userId);

  let earnings: unknown = null;
  let earningsError: string | null = null;
  if (!user.demo && user.agent_id) {
    try {
      earnings = await getEarnings(user.agent_id);
    } catch (e) {
      earningsError = e instanceof Error ? e.message : "earnings lookup failed";
    }
  }

  const tokenMint = process.env.AGENT_TOKEN_MINT ?? null;
  let token = null;
  if (tokenMint) {
    try {
      token =
        (await listTokens()).find((t) => t.mintAddress === tokenMint) ?? null;
    } catch {
      // Pool card falls back to the bare mint link.
    }
  }

  return NextResponse.json({
    earnings,
    earningsError,
    agentToken: {
      mint: tokenMint,
      pool: process.env.METEORA_POOL_ADDRESS ?? null,
      dbcConfig: process.env.METEORA_DBC_CONFIG ?? null,
      info: token,
    },
    demo: user.demo,
  });
}
