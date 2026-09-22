import { describe, expect, it } from "vitest";
import { GRACE_SEC, priceKrw, remainingSec, turnGate } from "@/lib/billing/meter";

describe("priceKrw", () => {
  it("prices at 1,000 KRW per hour, pro-rated", () => {
    expect(priceKrw(60)).toBe(1000);
    expect(priceKrw(30)).toBe(500);
    expect(priceKrw(20)).toBe(333);
    expect(priceKrw(10)).toBe(167);
  });
});

describe("clock", () => {
  const start = 1_000_000;
  const clock = { startedAt: start, durationMin: 20 };

  it("counts down from the first turn", () => {
    expect(remainingSec({ startedAt: null, durationMin: 20 })).toBe(1200);
    expect(remainingSec(clock, start)).toBe(1200);
    expect(remainingSec(clock, start + 10 * 60_000)).toBe(600);
    expect(remainingSec(clock, start + 30 * 60_000)).toBe(0);
  });

  it("opens, then allows one goodbye turn in the grace window, then closes", () => {
    const end = start + 20 * 60_000;
    expect(turnGate(clock, end - 1)).toBe("open");
    expect(turnGate(clock, end)).toBe("grace");
    expect(turnGate(clock, end + GRACE_SEC * 1000 - 1)).toBe("grace");
    expect(turnGate(clock, end + GRACE_SEC * 1000)).toBe("closed");
  });
});
