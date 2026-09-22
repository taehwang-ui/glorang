import { sessionStore, type TutorSession } from "./store";
import { currentVisitor } from "@/lib/entry/visitor";

/** 세션을 찾고, 소유자가 있는 세션이면 현재 방문자와 대조한다. */
export async function loadOwnedSession(id: string): Promise<{ session: TutorSession } | { error: Response }> {
  const session = await sessionStore.get(id);
  if (!session) return { error: Response.json({ error: "not found" }, { status: 404 }) };
  if (session.ownerId) {
    const visitor = await currentVisitor();
    if (!visitor || visitor.uid !== session.ownerId) return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}
