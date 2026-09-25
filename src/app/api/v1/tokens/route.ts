import { json, options } from "@/lib/api";
import { buildResearch } from "@/lib/research";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await buildResearch();
    return json({
      updatedAt: report.updatedAt,
      source: report.source,
      tokens: report.tokens.map((token) => {
        if (!token.dex) return { ...token, dex: null };
        const dex = Object.fromEntries(
          Object.entries(token.dex).filter(([key]) => key !== "candles"),
        );
        return { ...token, dex };
      }),
    });
  } catch {
    return json({ error: "Research data unavailable" }, { status: 502 });
  }
}

export function OPTIONS() {
  return options();
}
