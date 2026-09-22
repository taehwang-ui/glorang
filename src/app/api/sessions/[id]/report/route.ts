import Anthropic from "@anthropic-ai/sdk";
import { sessionStore } from "@/lib/tutor/store";
import { sessionView } from "@/lib/tutor/view";
import { generateReport } from "@/lib/tutor/report";
import { addUsage } from "@/lib/billing/cost";

/**
 * 수업 종료 + 리포트 생성. 이미 리포트가 있으면 그대로 돌려준다 (멱등).
 * 학생 발화가 하나도 없으면 리포트를 만들지 않고 종료만 처리한다.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await sessionStore.get(id);
  if (!session) return Response.json({ error: "not found" }, { status: 404 });
  if (session.report) return Response.json(sessionView(session));
  if (session.busy) return Response.json({ error: "turn in progress" }, { status: 409 });

  session.status = "ended";
  session.endedAt = session.endedAt ?? Date.now();

  const studentTurns = session.messages.filter(
    (m) =>
      m.role === "user" &&
      typeof m.content !== "string" &&
      m.content.some((b) => b.type === "text" && !b.text.startsWith("[")),
  ).length;
  if (studentTurns === 0) {
    await sessionStore.save(session);
    return Response.json(sessionView(session));
  }

  session.busy = true;
  try {
    const { report, usage } = await generateReport({
      model: session.model,
      profile: session.profile,
      messages: session.messages,
    });
    session.report = report;
    session.usage = addUsage(session.usage, usage);
    return Response.json(sessionView(session));
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? 502 : 500;
    console.error("report failed", err);
    return Response.json({ error: "리포트를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status });
  } finally {
    session.busy = false;
    await sessionStore.save(session);
  }
}
