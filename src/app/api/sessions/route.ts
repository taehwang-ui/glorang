import { z } from "zod";
import { sessionStore } from "@/lib/tutor/store";
import { sessionView } from "@/lib/tutor/view";
import { tutorModel } from "@/lib/tutor/config";
import { LEVELS, TOPICS } from "@/lib/tutor/prompt";
import { isLessonDuration, priceKrw } from "@/lib/billing/meter";

const CreateBody = z.object({
  studentName: z.string().trim().min(1).max(20),
  age: z.number().int().min(5).max(15),
  level: z.enum(LEVELS.map((l) => l.id) as [string, ...string[]]),
  topicId: z.enum(TOPICS.map((t) => t.id) as [string, ...string[]]),
  durationMin: z.number().int().refine(isLessonDuration, "unsupported lesson length"),
});

/**
 * 수업 세션 생성. 꾸그 연동 시 이 지점에서 결제/크레딧 차감을 먼저 확인한다 (docs/integration.md).
 */
export async function POST(request: Request) {
  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;
  const session = await sessionStore.create({
    profile: {
      studentName: body.studentName,
      age: body.age,
      level: body.level as "starter" | "basic" | "intermediate",
      topicId: body.topicId,
      durationMin: body.durationMin,
    },
    model: tutorModel(),
    priceKrw: priceKrw(body.durationMin),
  });
  return Response.json(sessionView(session), { status: 201 });
}
