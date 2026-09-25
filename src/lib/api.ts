import { NextResponse } from "next/server";

const DEFAULT_HEADERS = {
  "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function json<T>(data: T, init: ResponseInit = {}): NextResponse<T> {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return NextResponse.json(data, { ...init, headers });
}

export function options(): Response {
  return new Response(null, { status: 204, headers: DEFAULT_HEADERS });
}
