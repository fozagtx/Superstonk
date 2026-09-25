import { NextResponse } from "next/server";
import { marketStatus } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    ...marketStatus(now),
    checkedAt: now.toISOString(),
  });
}
