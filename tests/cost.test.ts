import { describe, expect, it } from "vitest";
import { addUsage, emptyUsage, estimateHourKrw, estimateHourUsage, usageUsd } from "@/lib/billing/cost";
import { pricingFor } from "@/lib/tutor/config";
import { PRICE_KRW_PER_HOUR } from "@/lib/billing/meter";

describe("hour cost scenario", () => {
  it("stays under the 1,000 KRW/hour price for the default model with margin", () => {
    const opus = estimateHourKrw("claude-opus-5", 1400);
    expect(opus).toBeLessThan(PRICE_KRW_PER_HOUR * 0.6);
  });
  it("is far cheaper on Haiku 4.5", () => {
    const haiku = estimateHourKrw("claude-haiku-4-5", 1400);
    expect(haiku).toBeLessThan(PRICE_KRW_PER_HOUR * 0.15);
  });
  it("serves most input from cache", () => {
    const u = estimateHourUsage();
    const total = u.inputTokens + u.cacheReadTokens + u.cacheWriteTokens;
    expect(u.cacheReadTokens / total).toBeGreaterThan(0.8);
  });
});

describe("usage accounting", () => {
  it("accumulates API usage fields", () => {
    const u = addUsage(emptyUsage(), {
      input_tokens: 40,
      output_tokens: 90,
      cache_read_input_tokens: 3000,
      cache_creation_input_tokens: 120,
    });
    expect(u).toEqual({ inputTokens: 40, outputTokens: 90, cacheReadTokens: 3000, cacheWriteTokens: 120, requests: 1 });
    expect(usageUsd(u, pricingFor("claude-opus-5"))).toBeCloseTo(
      (40 * 5 + 90 * 25 + 3000 * 0.5 + 120 * 6.25) / 1e6,
      10,
    );
  });
  it("falls back to default pricing for unknown models", () => {
    expect(pricingFor("claude-something-new")).toEqual(pricingFor("claude-opus-5"));
  });
});
