import { remainingSec } from "@/lib/billing/meter";
import { usageKrw } from "@/lib/billing/cost";
import type { TutorSession } from "./store";

/** 클라이언트에 내려보내는 세션 공개 정보 (대화 이력 제외). */
export function sessionView(s: TutorSession) {
  return {
    id: s.id,
    status: s.status,
    profile: s.profile,
    model: s.model,
    priceKrw: s.priceKrw,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    remainingSec: remainingSec({ startedAt: s.startedAt, durationMin: s.profile.durationMin }),
    usage: s.usage,
    /** 지금까지 쓴 AI 원가 추정(원). 마진 확인용. */
    aiCostKrw: Math.round(usageKrw(s.usage, s.model) * 10) / 10,
    report: s.report,
  };
}
export type SessionView = ReturnType<typeof sessionView>;
