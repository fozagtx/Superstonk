import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { createPlan, listPlans } from "@/lib/broker";
import { fetchPreStocks } from "@/lib/prestocks";
import { FREQUENCIES } from "@/lib/schedule";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ plans: await listPlans(userId) });
}

const planSchema = z.object({
  symbol: z.string().min(1).max(20),
  amountUsdc: z.number().positive().max(100_000),
  frequency: z.enum(FREQUENCIES as [string, ...string[]]),
  maxPremiumPct: z.number().min(0).max(100).default(10),
});

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = planSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const { tokens } = await fetchPreStocks();
  const symbol = body.data.symbol.toUpperCase();
  if (!tokens.some((t) => t.symbol.toUpperCase() === symbol)) {
    return NextResponse.json({ error: "Unknown token" }, { status: 400 });
  }
  const plan = await createPlan(userId, {
    symbol,
    amountUsdc: body.data.amountUsdc,
    frequency: body.data.frequency as never,
    maxPremiumPct: body.data.maxPremiumPct,
  });
  return NextResponse.json({ plan });
}
