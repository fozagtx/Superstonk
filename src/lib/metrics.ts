export type Verdict = "discount" | "fair" | "overpriced";
export type ExitRiskTier = "low" | "medium" | "high";

export function premiumPct(tokenPrice: number, markPrice: number): number {
  return ((tokenPrice - markPrice) / markPrice) * 100;
}

export function marketSize(tokenPrice: number, supply: number): number {
  return tokenPrice * supply;
}

export function verdict(premiumPct: number): Verdict {
  if (premiumPct < -5) return "discount";
  if (premiumPct > 5) return "overpriced";
  return "fair";
}

export function hiddenPremium(
  amount: number,
  tokenPrice: number,
  markPrice: number,
): number {
  return amount * (tokenPrice - markPrice);
}

export function exitRisk(
  amount: number,
  tokenPrice: number,
  marketSize: number,
): { share: number; tier: ExitRiskTier } {
  const share = marketSize > 0 ? (amount * tokenPrice) / marketSize : 0;
  const tier: ExitRiskTier =
    share < 0.01 ? "low" : share <= 0.05 ? "medium" : "high";
  return { share, tier };
}
