import { NextResponse } from "next/server";
import { fetchPreStocks } from "@/lib/prestocks";

export async function GET() {
  try {
    const data = await fetchPreStocks();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load tokens" },
      { status: 502 },
    );
  }
}
