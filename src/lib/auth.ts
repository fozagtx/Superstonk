import "server-only";

// Resolves the signed-in user for API requests. With Privy configured
// (PRIVY_APP_ID + PRIVY_APP_SECRET) the client sends the Privy access token as
// a Bearer token and we verify it server-side. Without Privy the app runs in
// demo mode under a single shared user so every screen and API route works.

export const DEMO_USER_ID = "demo-worker";

export function privyConfigured(): boolean {
  return Boolean(process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET);
}

export function demoMode(): boolean {
  return !privyConfigured();
}

let _client: { verifyAuthToken(t: string): Promise<{ userId: string }> } | null =
  null;

async function privyClient() {
  if (!_client) {
    const { PrivyClient } = await import("@privy-io/server-auth");
    _client = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!,
    ) as never;
  }
  return _client;
}

// Returns the user id, or null when auth is required but missing/invalid.
export async function resolveUserId(req: Request): Promise<string | null> {
  if (demoMode()) return DEMO_USER_ID;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const claims = await privyClient().then((c) => c.verifyAuthToken(token));
    return claims.userId;
  } catch {
    return null;
  }
}
