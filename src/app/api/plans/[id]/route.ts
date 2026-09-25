import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { setPlanActive } from "@/lib/broker";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ active: z.boolean() });

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/plans/[id]">,
) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const planId = Number(id);
  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!Number.isInteger(planId) || !body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  await setPlanActive(userId, planId, body.data.active);
  return NextResponse.json({ ok: true });
}
