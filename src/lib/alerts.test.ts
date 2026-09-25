import { describe, expect, it } from "vitest";
import { triggerableAlertIds, type AlertRow } from "./alerts";

const tokens = [{ symbol: "OPENAI", premiumPct: 31.8 }];
const now = Date.now();
const h = 60 * 60 * 1000;

function alert(over: Partial<AlertRow>): AlertRow {
  return {
    id: 1,
    symbol: "OPENAI",
    direction: "below",
    threshold_pct: 10,
    telegram_chat_id: "123",
    last_triggered_at: null,
    ...over,
  };
}

describe("triggerableAlertIds", () => {
  it("fires when premium crosses below threshold", () => {
    const t = [{ symbol: "OPENAI", premiumPct: 8.2 }];
    expect(triggerableAlertIds([alert({})], t, now)).toEqual([1]);
  });
  it("does not fire when not crossed", () => {
    expect(triggerableAlertIds([alert({})], tokens, now)).toEqual([]);
  });
  it("suppresses alerts inside the 6h cooldown", () => {
    const t = [{ symbol: "OPENAI", premiumPct: 8.2 }];
    const a = alert({ last_triggered_at: new Date(now - 2 * h).toISOString() });
    expect(triggerableAlertIds([a], t, now)).toEqual([]);
  });
  it("re-arms after the cooldown", () => {
    const t = [{ symbol: "OPENAI", premiumPct: 8.2 }];
    const a = alert({ last_triggered_at: new Date(now - 7 * h).toISOString() });
    expect(triggerableAlertIds([a], t, now)).toEqual([1]);
  });
  it("above direction fires when premium exceeds threshold", () => {
    const a = alert({ direction: "above", threshold_pct: 30 });
    expect(triggerableAlertIds([a], tokens, now)).toEqual([1]);
  });
});
