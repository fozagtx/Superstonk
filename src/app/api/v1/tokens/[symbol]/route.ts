import { json, options } from "@/lib/api";
import { buildResearch } from "@/lib/research";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  try {
    const report = await buildResearch();
    const token = report.tokens.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());
    if (!token) {
      return json({ error: "Unknown symbol", symbols: report.tokens.map((item) => item.symbol) }, { status: 404 });
    }
    return json({ token });
  } catch {
    return json({ error: "Research data unavailable" }, { status: 502 });
  }
}

export function OPTIONS() {
  return options();
}
