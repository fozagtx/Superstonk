import { NextResponse, type NextRequest } from "next/server";

const PRESTOCK_SYMBOLS = new Set([
  "ANDURIL",
  "ANTHROPIC",
  "FIGUREAI",
  "KALSHI",
  "NEURALINK",
  "OPENAI",
  "POLYMARKET",
  "SPACEX",
]);

export function proxy(request: NextRequest) {
  const symbol = request.nextUrl.pathname.split("/")[2]?.toUpperCase();
  if (symbol && !PRESTOCK_SYMBOLS.has(symbol)) {
    return NextResponse.json(
      { error: "Unknown symbol", symbols: [...PRESTOCK_SYMBOLS] },
      { status: 404 },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/token/:path*"],
};
