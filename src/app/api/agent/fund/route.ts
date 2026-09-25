import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { recordFunding } from "@/lib/broker";
import { z } from "zod";

export const dynamic = "force-dynamic";

const fundSchema = z.object({
  amountUsdc: z.number().positive().max(1_000_000),
  tx: z.string().max(120).optional(),
});

// Records a funding event after the user's USDC transfer confirms on-chain.
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = fundSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  await recordFunding(userId, body.data.amountUsdc, body.data.tx ?? null);
  return NextResponse.json({ ok: true });
}
