import { describe, expect, it } from "vitest";
import { etNow, isUsMarketOpen, marketStatus } from "./market-hours";

// All fixtures are UTC; the lib converts to America/New_York.
const at = (iso: string) => new Date(iso);

describe("isUsMarketOpen", () => {
  it("is open on a weekday during hours", () => {
    // Mon Sep 21 2026 11:00 ET = 15:00 UTC (EDT, UTC-4)
    expect(isUsMarketOpen(at("2026-09-21T15:00:00Z"))).toBe(true);
  });

  it("opens at 9:30 ET and closes at 16:00 ET", () => {
    expect(isUsMarketOpen(at("2026-09-21T13:29:00Z"))).toBe(false); // 9:29
    expect(isUsMarketOpen(at("2026-09-21T13:30:00Z"))).toBe(true); // 9:30
    expect(isUsMarketOpen(at("2026-09-21T19:59:00Z"))).toBe(true); // 15:59
    expect(isUsMarketOpen(at("2026-09-21T20:00:00Z"))).toBe(false); // 16:00
  });

  it("is closed on weekends — the agent's whole reason to exist", () => {
    expect(isUsMarketOpen(at("2026-09-26T15:00:00Z"))).toBe(false); // Sat
    expect(isUsMarketOpen(at("2026-09-27T15:00:00Z"))).toBe(false); // Sun
  });

  it("is closed on NYSE holidays", () => {
    expect(isUsMarketOpen(at("2026-11-26T15:00:00Z"))).toBe(false); // Thanksgiving
    expect(isUsMarketOpen(at("2026-12-25T15:00:00Z"))).toBe(false); // Christmas
  });

  it("is open the day after a holiday", () => {
    expect(isUsMarketOpen(at("2026-11-27T15:00:00Z"))).toBe(true); // Fri after
  });
});

describe("marketStatus", () => {
  it("labels after-hours for the badge", () => {
    expect(marketStatus(at("2026-09-26T03:00:00Z")).label).toBe(
      "Wall St closed — agent still trading",
    );
    expect(marketStatus(at("2026-09-21T15:00:00Z")).label).toBe(
      "US markets open",
    );
  });
});

describe("etNow", () => {
  it("reports ET date and minutes", () => {
    const { date, weekday, minutes } = etNow(at("2026-09-21T13:30:00Z"));
    expect(date).toBe("2026-09-21");
    expect(weekday).toBe("Mon");
    expect(minutes).toBe(570);
  });
});
