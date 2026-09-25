import { json, options } from "@/lib/api";
import { WINDOWS, type Window } from "@/lib/analysis";
import { buildResearch } from "@/lib/research";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const window = new URL(req.url).searchParams.get("window") ?? "7d";
  if (!WINDOWS.includes(window as Window)) {
    return json({ error: "Invalid window", windows: WINDOWS }, { status: 400 });
  }
  try {
    const report = await buildResearch();
    return json({
      window,
      updatedAt: report.updatedAt,
      market: report.market,
      runners: report.runners[window as Window],
    });
  } catch {
    return json({ error: "Research data unavailable" }, { status: 502 });
  }
}

export function OPTIONS() {
  return options();
}
