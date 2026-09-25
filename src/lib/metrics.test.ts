import { describe, expect, it } from "vitest";
import {
  exitRisk,
  hiddenPremium,
  marketSize,
  premiumPct,
  verdict,
} from "./metrics";

describe("premiumPct", () => {
  it("is positive when token trades above mark", () => {
    expect(premiumPct(1368.73, 1023.66)).toBeCloseTo(33.71, 1);
  });
  it("is negative when token trades below mark", () => {
    expect(premiumPct(900, 1000)).toBeCloseTo(-10, 5);
  });
});

describe("verdict boundaries", () => {
  it("-5 is fair", () => expect(verdict(-5)).toBe("fair"));
  it("5 is fair", () => expect(verdict(5)).toBe("fair"));
  it("-5.01 is discount", () => expect(verdict(-5.01)).toBe("discount"));
  it("5.01 is overpriced", () => expect(verdict(5.01)).toBe("overpriced"));
});

describe("marketSize", () => {
  it("is price * supply", () => {
    expect(marketSize(1368.73, 2826.33)).toBeCloseTo(1368.73 * 2826.33, 5);
  });
});

describe("hiddenPremium", () => {
  it("is negative for discount tokens", () => {
    expect(hiddenPremium(10, 900, 1000)).toBeCloseTo(-1000, 5);
  });
  it("is positive for premium tokens", () => {
    expect(hiddenPremium(2, 1100, 1000)).toBeCloseTo(200, 5);
  });
});

describe("exitRisk tiers", () => {
  // marketSize = 100 * 1000 = 100_000; 1% share = $1000 of value = 10 tokens
  it("share below 1% is low", () => {
    expect(exitRisk(9.99, 100, 100_000).tier).toBe("low");
    expect(exitRisk(10, 100, 100_000).tier).toBe("medium"); // exactly 1%
  });
  it("share 1–5% is medium", () => {
    expect(exitRisk(50, 100, 100_000).tier).toBe("medium"); // exactly 5%
    expect(exitRisk(50.01, 100, 100_000).tier).toBe("high");
  });
  it("computes share correctly", () => {
    expect(exitRisk(25, 100, 100_000).share).toBeCloseTo(0.025, 6);
  });
});
