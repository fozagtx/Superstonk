import { describe, expect, it } from "vitest";
import { buildLaunchKit } from "./launch-kit";
import type { TokenResearch } from "./research";

const token: TokenResearch = {
  symbol: "SPACEX",
  name: "SpaceX PreStocks",
  description: "Private-market research",
  image: "https://example.com/image.png",
  externalUrl: "https://prestocks.com/token/SPACEX",
  mint: "MintAddress",
  quotePrice: 117,
  markPrice: 120,
  premiumPct: -2.5,
  verdict: "fair",
  supply: 1000,
  marketSize: 117000,
  dex: null,
  change: { "1d": 1, "7d": 2, "30d": 3 },
  volatility7d: null,
  rangePos30d: null,
  dexDivergencePct: null,
  score: 51,
  signals: [],
  summary:
    "SPACEX is steady. The quote is close to its mark price. Use DEX data as context.",
};

describe("buildLaunchKit", () => {
  it("builds a suggested kit with suffixes and links", () => {
    const kit = buildLaunchKit(token, "https://terminal.example");
    expect(kit.suggestedMetadata.symbol).toBe("SPACEXRUN");
    expect(kit.suggestedMetadata.name).toBe("SpaceX Runner");
    expect(kit.links.geckoterminal).toContain("MintAddress");
    expect(kit.links.solscan).toContain("MintAddress");
    expect(kit.links.dataApi).toContain("SPACEX");
    expect(kit.note).toContain("Suggestions only");
  });
});
