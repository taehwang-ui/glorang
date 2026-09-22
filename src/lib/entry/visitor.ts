import { cookies } from "next/headers";
import { VISITOR_COOKIE, VisitorCookie, cookieSecret, verify, type Visitor } from "./handoff";

/** 요청 쿠키에서 방문자를 읽는다. 없거나 깨졌으면 null */
export async function currentVisitor(): Promise<Visitor | null> {
  const jar = await cookies();
  const raw = jar.get(VISITOR_COOKIE)?.value;
  if (!raw) return null;
  const r = verify(raw, cookieSecret(), VisitorCookie);
  return r.ok ? r.payload : null;
}
