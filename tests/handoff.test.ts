import { describe, expect, it } from "vitest";
import { HandoffPayload, VisitorCookie, sign, verify } from "@/lib/entry/handoff";

const secret = "test-secret-at-least-16-chars";
const now = 1_800_000_000;
const payload = {
  v: 1 as const,
  uid: "parent-1",
  child: { name: "Mina", age: 8, level: "starter" as const },
  minutes: 60,
  iat: now,
  exp: now + 600,
  nonce: "abcdefgh1234",
};

describe("handoff token", () => {
  it("round-trips a signed payload", () => {
    const token = sign(payload, secret);
    const r = verify(token, secret, HandoffPayload, now + 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.child.name).toBe("Mina");
  });
  it("rejects a tampered body", () => {
    const token = sign(payload, secret);
    const [body, sig] = token.split(".");
    const tampered = Buffer.from(JSON.stringify({ ...payload, minutes: 6000 })).toString("base64url");
    expect(verify(`${tampered}.${sig}`, secret, HandoffPayload, now)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verify(`${body}.${sig}x`, secret, HandoffPayload, now).ok).toBe(false);
  });
  it("rejects a wrong secret and an expired token", () => {
    const token = sign(payload, secret);
    expect(verify(token, "another-secret-1234567", HandoffPayload, now)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verify(token, secret, HandoffPayload, now + 601)).toEqual({ ok: false, reason: "expired" });
  });
  it("rejects payloads that fail the schema", () => {
    const token = sign({ ...payload, child: { name: "", age: 3 } }, secret);
    expect(verify(token, secret, HandoffPayload, now)).toEqual({ ok: false, reason: "invalid" });
    expect(verify("garbage", secret, HandoffPayload, now)).toEqual({ ok: false, reason: "malformed" });
  });
  it("signs the visitor cookie with the same scheme", () => {
    const cookie = sign({ uid: "gguge:parent-1", name: "Mina", age: 8, source: "gguge", exp: now + 100 }, secret);
    const r = verify(cookie, secret, VisitorCookie, now);
    expect(r.ok && r.payload.source).toBe("gguge");
  });
});
