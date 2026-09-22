import { notFound } from "next/navigation";
import LessonClient from "@/components/LessonClient";
import { sessionStore } from "@/lib/tutor/store";
import { sessionView } from "@/lib/tutor/view";
import { currentVisitor } from "@/lib/entry/visitor";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionStore.get(id);
  if (!session) notFound();
  if (session.ownerId) {
    const visitor = await currentVisitor();
    if (!visitor || visitor.uid !== session.ownerId) notFound();
  }
  return (
    <main className="shell">
      <LessonClient initial={sessionView(session)} />
    </main>
  );
}
