import { z } from "zod";
import { sessionStore } from "@/lib/tutor/store";
import { sessionView } from "@/lib/tutor/view";
import { tutorModel } from "@/lib/tutor/config";
import { LEVELS, TOPICS } from "@/lib/tutor/prompt";
import { isLessonDuration, priceKrw } from "@/lib/billing/meter";
import { currentVisitor } from "@/lib/entry/visitor";
import { balanceStore } from "@/lib/entry/balance";
import { requireEntry } from "@/lib/entry/handoff";

const CreateBody = z.object({
  studentName: z.string().trim().min(1).max(20).optional(),
  age: z.number().int().min(5).max(15).optional(),
  level: z.enum(LEVELS.map((l) => l.id) as [string, ...string[]]),
  topicId: z.enum(TOPICS.map((t) => t.id) as [string, ...string[]]),
  durationMin: z.number().int().refine(isLessonDuration, "unsupported lesson length"),
});

/**
 * 수업 세션 생성.
 * - 진입 쿠키(꾸그 토큰/초대 코드)가 있으면 방문자 잔액에서 수업 시간을 차감한다.
 * - 쿠키가 없으면 개발용 자유 시작(REQUIRE_ENTRY=1 이면 거부).
 */
export async function POST(request: Request) {
  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;
  const visitor = await currentVisitor();

  if (!visitor && requireEntry()) {
    return Response.json({ error: "꾸그에서 [시작하기]를 눌러 들어와 주세요." }, { status: 401 });
  }

  const studentName = (visitor?.name || body.studentName || "").trim();
  const age = visitor?.name ? visitor.age : (body.age ?? visitor?.age ?? 8);
  if (!studentName) return Response.json({ error: "아이 이름이 필요해요." }, { status: 400 });

  if (visitor) {
    const ok = await balanceStore.consume(visitor.uid, body.durationMin);
    if (!ok) {
      const left = await balanceStore.get(visitor.uid);
      return Response.json({ error: `남은 수업 시간이 부족해요 (남은 시간 ${left}분).`, remainingMinutes: left }, { status: 402 });
    }
  }

  const session = await sessionStore.create({
    profile: {
      studentName,
      age,
      level: body.level as "starter" | "basic" | "intermediate",
      topicId: body.topicId,
      durationMin: body.durationMin,
    },
    model: tutorModel(),
    priceKrw: priceKrw(body.durationMin),
    ownerId: visitor?.uid ?? null,
  });
  return Response.json(sessionView(session), { status: 201 });
}
