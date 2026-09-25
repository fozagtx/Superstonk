import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { listActivity } from "@/lib/broker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ activity: await listActivity(userId) });
}
