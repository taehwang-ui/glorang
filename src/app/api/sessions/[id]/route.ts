import { sessionStore } from "@/lib/tutor/store";
import { sessionView } from "@/lib/tutor/view";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionStore.get(id);
  if (!session) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(sessionView(session));
}
