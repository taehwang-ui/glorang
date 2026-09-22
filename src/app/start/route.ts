import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import {
  HandoffPayload,
  VISITOR_COOKIE,
  VISITOR_TTL_SEC,
  cookieSecret,
  handoffSecret,
  inviteCodes,
  sign,
  verify,
  type Visitor,
} from "@/lib/entry/handoff";
import { balanceStore } from "@/lib/entry/balance";

/**
 * 진입점. 꾸그 상세페이지의 [시작하기] 또는 초대 코드 입력이 여기로 온다.
 *   /start?token=<꾸그 서명 토큰>   → 검증 후 /welcome
 *   /start?code=<초대 코드>         → 코드 확인 후 /welcome (1단계 베타)
 * 실패하면 /?entry=<reason> 으로 보낸다. 꾸그 쪽에는 아무것도 쓰지 않는다.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const token = url.searchParams.get("token");
  const code = url.searchParams.get("code")?.trim().toUpperCase();
  const now = Math.floor(Date.now() / 1000);

  let visitor: Visitor | null = null;
  let minutes = 0;
  let nonce = "";

  if (token) {
    const secret = handoffSecret();
    if (!secret) return fail(url, "not_configured");
    const r = verify(token, secret, HandoffPayload, now);
    if (!r.ok) return fail(url, r.reason);
    const p = r.payload;
    visitor = { uid: `gguge:${p.uid}`, name: p.child.name, age: p.child.age, level: p.child.level, source: "gguge", exp: now + VISITOR_TTL_SEC };
    minutes = p.minutes;
    nonce = p.nonce;
  } else if (code) {
    const granted = inviteCodes().get(code);
    if (!granted) return fail(url, "bad_code");
    // 초대 코드는 아이 정보가 없으므로 웰컴 화면에서 입력받는다. 코드마다 방문자 하나.
    visitor = { uid: `invite:${code}`, name: "", age: 8, source: "invite", exp: now + VISITOR_TTL_SEC };
    minutes = granted;
    nonce = `invite:${code}`;
  } else {
    return fail(url, "missing");
  }

  await balanceStore.set(visitor.uid, minutes, nonce || randomUUID());

  const res = NextResponse.redirect(new URL("/welcome", url.origin));
  res.cookies.set(VISITOR_COOKIE, sign(visitor, cookieSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: VISITOR_TTL_SEC,
  });
  return res;
}

function fail(url: URL, reason: string) {
  const to = new URL("/", url.origin);
  to.searchParams.set("entry", reason);
  return NextResponse.redirect(to);
}
