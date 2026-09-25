import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { z } from "zod";
import { fetchPreStocks } from "@/lib/prestocks";
import { fmtUsd } from "@/lib/format";
import { OG_COLORS, imageToDataUrl, loadMonoFont } from "@/lib/og";

export const runtime = "nodejs";

const querySchema = z.object({
  v: z.coerce.number().min(0).max(1e12).default(0),
  f: z.coerce.number().min(0).max(1e12).default(0),
  s: z
    .string()
    .max(80)
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 4),
    ),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse({
    v: req.nextUrl.searchParams.get("v") ?? undefined,
    f: req.nextUrl.searchParams.get("f") ?? undefined,
    s: req.nextUrl.searchParams.get("s") ?? undefined,
  });
  if (!parsed.success) return new Response("Bad query", { status: 400 });
  const { v: totalValue, f: fairValue, s: symbols } = parsed.data;

  const mono = await loadMonoFont();
  const fonts = mono
    ? [{ name: "JetBrains Mono", data: mono, weight: 400 as const }]
    : [];

  const hidden = totalValue - fairValue;
  const fairShare = totalValue > 0 ? (fairValue / totalValue) * 100 : 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "preipo-xray";

  let logos: (string | null)[] = [];
  try {
    const { tokens } = await fetchPreStocks();
    logos = await Promise.all(
      symbols.map(async (sym) => {
        const t = tokens.find((x) => x.symbol === sym);
        return t?.image ? await imageToDataUrl(t.image) : null;
      }),
    );
  } catch {
    logos = [];
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.bg,
        color: OG_COLORS.text,
        padding: 56,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 26, color: OG_COLORS.secondary }}>
        My Pre-IPO X-Ray
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 24,
          fontSize: 60,
          lineHeight: 1.15,
          fontWeight: 700,
          fontFamily: "JetBrains Mono",
          color: hidden >= 0 ? OG_COLORS.overpriced : OG_COLORS.discount,
        }}
      >
        {hidden >= 0
          ? `${fmtUsd(hidden)} hidden premium`
          : `${fmtUsd(Math.abs(hidden))} below fair value`}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 16,
          fontSize: 28,
          color: OG_COLORS.secondary,
          fontFamily: "JetBrains Mono",
        }}
      >
        {fmtUsd(totalValue)} total · {fmtUsd(fairValue)} fair value
      </div>

      <div
        style={{
          display: "flex",
          height: 28,
          marginTop: 48,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{ width: `${fairShare}%`, backgroundColor: OG_COLORS.discount }}
        />
        <div
          style={{ flex: 1, backgroundColor: OG_COLORS.overpriced }}
        />
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 12,
          fontSize: 20,
          color: OG_COLORS.secondary,
          fontFamily: "JetBrains Mono",
        }}
      >
        {Math.round(fairShare)}% fair value · {Math.round(100 - fairShare)}% hype
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 40,
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {logos.map(
          (logo, i) =>
            logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={logo}
                width={72}
                height={72}
                style={{ borderRadius: "50%" }}
                alt=""
              />
            ),
        )}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 20,
          color: OG_COLORS.secondary,
          justifyContent: "space-between",
          marginTop: "auto",
        }}
      >
        <div>preipo-xray · data from PreStocks · not financial advice</div>
        <div>{appUrl}</div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts },
  );
}
