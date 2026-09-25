import { NextRequest, NextResponse } from "next/server";
import { runDuePlans } from "@/lib/broker";
import { marketStatus } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

// Scheduler target — every 5 minutes from vercel.json crons.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const authorized =
    !!secret && (bearer === `Bearer ${secret}` || querySecret === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  try {
    const results = await runDuePlans(now);
    return NextResponse.json({
      ran: results.length,
      results,
      market: marketStatus(now),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "run failed" },
      { status: 502 },
    );
  }
}
