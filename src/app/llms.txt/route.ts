export const dynamic = "force-static";

export async function GET() {
  return new Response(
    "Superstonk Pre-IPO Research Terminal\n\nAgent guide: /api/v1/skill.md\nOpenAPI: /api/v1/openapi.json\n",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
