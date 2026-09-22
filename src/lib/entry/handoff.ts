import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * 꾸그 → AI 선생님 진입(핸드오프).
 *
 * 꾸그 상세페이지의 [시작하기]가 아래 형식의 서명 토큰을 만들어 `/start?token=...` 로 보낸다.
 *   token = base64url(payloadJSON) + "." + base64url(HMAC-SHA256(secret, base64url(payloadJSON)))
 * 비밀키(GGUGE_HANDOFF_SECRET)는 꾸그 서버와 이 앱만 안다. 꾸그 쪽 샘플 코드는 docs/entry-flow.md 참고.
 *
 * 같은 서명 방식으로 방문자 쿠키(coco_visitor)도 만든다.
 */

export const HandoffPayload = z.object({
  v: z.literal(1),
  /** 꾸그 사용자(보호자) ID */
  uid: z.string().min(1).max(64),
  child: z.object({
    name: z.string().trim().min(1).max(20),
    age: z.number().int().min(5).max(15),
    level: z.enum(["starter", "basic", "intermediate"]).optional(),
  }),
  /** 이번 진입에서 쓸 수 있는 수업 시간(분). 꾸그가 보유 수업권 기준으로 계산 */
  minutes: z.number().int().min(0).max(600),
  /** 발급 시각, 만료 시각 (초 단위 epoch). 만료는 발급 후 10분 이내를 권장 */
  iat: z.number().int(),
  exp: z.number().int(),
  /** 재사용 방지용 임의 문자열 */
  nonce: z.string().min(8).max(64),
});
export type HandoffPayload = z.infer<typeof HandoffPayload>;

export const VisitorCookie = z.object({
  uid: z.string(),
  name: z.string(),
  age: z.number().int(),
  level: z.enum(["starter", "basic", "intermediate"]).optional(),
  source: z.enum(["gguge", "invite"]),
  exp: z.number().int(),
});
export type Visitor = z.infer<typeof VisitorCookie>;

export const VISITOR_COOKIE = "coco_visitor";
export const VISITOR_TTL_SEC = 60 * 60 * 6;

const b64u = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const unb64u = (s: string) => Buffer.from(s, "base64url");

function hmac(secret: string, data: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function sign(payload: unknown, secret: string): string {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${b64u(hmac(secret, body))}`;
}

export type VerifyResult<T> = { ok: true; payload: T } | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "invalid" };

export function verify<T>(token: string, secret: string, schema: z.ZodType<T>, now = Math.floor(Date.now() / 1000)): VerifyResult<T> {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "malformed" };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let given: Buffer;
  try {
    given = unb64u(sig);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const expected = hmac(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "bad_signature" };
  let json: unknown;
  try {
    json = JSON.parse(unb64u(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const exp = (parsed.data as { exp?: number }).exp;
  if (typeof exp === "number" && exp <= now) return { ok: false, reason: "expired" };
  return { ok: true, payload: parsed.data };
}

export function handoffSecret(): string | null {
  const s = process.env.GGUGE_HANDOFF_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

/** 쿠키 서명 키. 핸드오프 비밀키가 없으면(개발) 고정 개발 키를 쓴다. */
export function cookieSecret(): string {
  return process.env.COOKIE_SECRET?.trim() || handoffSecret() || "dev-only-cookie-secret-change-me";
}

/**
 * 초대 코드 (1단계 베타용). 환경변수 INVITE_CODES="CODE1:60,CODE2:120" 형식, 값은 부여할 수업 시간(분).
 */
export function inviteCodes(): Map<string, number> {
  const map = new Map<string, number>();
  for (const part of (process.env.INVITE_CODES ?? "").split(",")) {
    const [code, min] = part.split(":").map((s) => s.trim());
    const minutes = Number(min);
    if (code && Number.isFinite(minutes) && minutes > 0) map.set(code.toUpperCase(), minutes);
  }
  return map;
}

/** 진입이 필수인지 (운영). 개발에서는 홈에서 바로 시작할 수 있다. */
export function requireEntry(): boolean {
  return process.env.REQUIRE_ENTRY === "1";
}
