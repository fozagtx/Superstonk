import { describe, expect, it } from "vitest";
import { nextRunAt } from "./schedule";

describe("nextRunAt", () => {
  const from = new Date("2026-09-25T19:23:00Z");

  it("schedules daily one day out", () => {
    const d = nextRunAt("daily", from);
    expect(d.toISOString()).toBe("2026-09-26T20:00:00.000Z");
  });

  it("schedules weekly one week out", () => {
    const d = nextRunAt("weekly", from);
    expect(d.toISOString()).toBe("2026-10-02T20:00:00.000Z");
  });

  it("schedules monthly one month out", () => {
    const d = nextRunAt("monthly", from);
    expect(d.toISOString()).toBe("2026-10-25T20:00:00.000Z");
  });

  it("always lands in the future", () => {
    expect(nextRunAt("daily", from).getTime()).toBeGreaterThan(from.getTime());
  });
});
