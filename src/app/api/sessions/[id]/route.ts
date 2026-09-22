import { loadOwnedSession } from "@/lib/tutor/access";
import { sessionView } from "@/lib/tutor/view";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadOwnedSession(id);
  if ("error" in loaded) return loaded.error;
  const { session } = loaded;
  return Response.json(sessionView(session));
}
