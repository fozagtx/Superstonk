import { json, options } from "@/lib/api";
import { buildLaunchKit } from "@/lib/launch-kit";
import { buildResearch } from "@/lib/research";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  try {
    const report = await buildResearch();
    const token = report.tokens.find(
      (item) => item.symbol.toLowerCase() === symbol.toLowerCase(),
    );
    if (!token) {
      return json(
        {
          error: "Unknown symbol",
          symbols: report.tokens.map((item) => item.symbol),
        },
        { status: 404 },
      );
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    return json(buildLaunchKit(token, appUrl));
  } catch {
    return json({ error: "Research data unavailable" }, { status: 502 });
  }
}

export function OPTIONS() {
  return options();
}
