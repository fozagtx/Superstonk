import { json, options } from "@/lib/api";
import { buildResearch } from "@/lib/research";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await buildResearch());
  } catch {
    return json({ error: "Research data unavailable" }, { status: 502 });
  }
}

export function OPTIONS() {
  return options();
}
