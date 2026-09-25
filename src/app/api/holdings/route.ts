import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { fetchPreStocks } from "@/lib/prestocks";
import { getHoldings } from "@/lib/solana";
import { exitRisk, hiddenPremium } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ownerParam = req.nextUrl.searchParams.get("owner");
  if (!ownerParam) {
    return NextResponse.json({ error: "Missing owner param" }, { status: 400 });
  }
  let owner: PublicKey;
  try {
    owner = new PublicKey(ownerParam);
  } catch {
    return NextResponse.json(
      { error: "Invalid Solana address" },
      { status: 400 },
    );
  }

  try {
    const { tokens, source, updatedAt } = await fetchPreStocks();
    const mints = tokens.map((t) => t.contract_address).filter(Boolean);
    const holdings = await getHoldings(owner, mints);
    const byMint = new Map(tokens.map((t) => [t.contract_address, t]));

    const positions = holdings
      .map((h) => {
        const t = byMint.get(h.mint);
        if (!t) return null;
        const value = h.amount * t.tokenPrice;
        const fairValue = h.amount * t.markPrice;
        const hp = hiddenPremium(h.amount, t.tokenPrice, t.markPrice);
        const risk = exitRisk(h.amount, t.tokenPrice, t.marketSize);
        return {
          mint: h.mint,
          symbol: t.symbol,
          name: t.name,
          image: t.image,
          amount: h.amount,
          tokenPrice: t.tokenPrice,
          markPrice: t.markPrice,
          premiumPct: t.premiumPct,
          verdict: t.verdict,
          value,
          fairValue,
          hiddenPremium: hp,
          exitShare: risk.share,
          exitTier: risk.tier,
        };
      })
      .filter((p) => p !== null);

    const totalValue = positions.reduce((s, p) => s + p.value, 0);
    const totalFairValue = positions.reduce((s, p) => s + p.fairValue, 0);

    return NextResponse.json({
      owner: ownerParam,
      positions,
      totalValue,
      totalFairValue,
      totalHiddenPremium: totalValue - totalFairValue,
      source,
      updatedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load holdings" },
      { status: 502 },
    );
  }
}
