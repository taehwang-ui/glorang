import { describe, expect, it } from "vitest";
import { balanceStore } from "@/lib/entry/balance";

describe("balance store", () => {
  it("sets once per nonce, consumes, and refuses overdraft", async () => {
    await balanceStore.set("u1", 30, "n1");
    await balanceStore.set("u1", 999, "n1"); // 같은 nonce 재사용은 무시
    expect(await balanceStore.get("u1")).toBe(30);
    expect(await balanceStore.consume("u1", 20)).toBe(true);
    expect(await balanceStore.consume("u1", 20)).toBe(false);
    expect(await balanceStore.get("u1")).toBe(10);
  });
});
