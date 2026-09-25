import { NextRequest, NextResponse } from "next/server";
import { serverRpcUrl } from "@/lib/solana";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const upstream = await fetch(serverRpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "RPC proxy failed" },
      { status: 502 },
    );
  }
}
