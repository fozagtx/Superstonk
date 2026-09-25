import { ImageResponse } from "next/og";
import { fetchPreStocks } from "@/lib/prestocks";
import { fmtUsd } from "@/lib/format";
import { OG_COLORS, imageToDataUrl, loadOgFonts, verdictColor } from "@/lib/og";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const fonts = await loadOgFonts();

  let token;
  try {
    const { tokens } = await fetchPreStocks();
    token = tokens.find(
      (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
    );
  } catch {
    token = undefined;
  }
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const logo = token.image ? await imageToDataUrl(token.image) : null;
  const vColor = verdictColor(token.verdict);
  const pctStr = `${token.premiumPct >= 0 ? "+" : "−"}${Math.abs(token.premiumPct).toFixed(1)}%`;
  const headline =
    token.premiumPct >= 0
      ? `${pctStr} above fair value`
      : `${pctStr.replace("−", "")} below fair value`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "preipo-xray";

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
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            width={84}
            height={84}
            style={{ borderRadius: "50%" }}
            alt=""
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{token.name}</div>
          <div
            style={{
              fontSize: 22,
              color: OG_COLORS.secondary,
              fontFamily: "JetBrains Mono",
            }}
          >
            {token.symbol}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 999,
            padding: "10px 22px",
            color: vColor,
            backgroundColor: `${vColor}20`,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: token.verdict === "fair" ? "50%" : 4,
              backgroundColor: vColor,
            }}
          />
          {token.verdict}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 40,
          fontSize: 68,
          fontWeight: 700,
          color: vColor,
          fontFamily: "JetBrains Mono",
        }}
      >
        {headline}
      </div>

      <div style={{ display: "flex", gap: 48, marginTop: 48 }}>
        {[
          ["Token price", fmtUsd(token.tokenPrice)],
          ["Mark price", fmtUsd(token.markPrice)],
          ["Market size", fmtUsd(token.marketSize)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: OG_COLORS.surface,
              borderRadius: 16,
              padding: "20px 28px",
              border: `1px solid ${OG_COLORS.border}`,
            }}
          >
            <div style={{ fontSize: 20, color: OG_COLORS.secondary }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 34,
                fontFamily: "JetBrains Mono",
                marginTop: 6,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: "auto",
          fontSize: 20,
          color: OG_COLORS.secondary,
          justifyContent: "space-between",
        }}
      >
        <div>preipo-xray · data from PreStocks · not financial advice</div>
        <div>{appUrl}</div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts },
  );
}
