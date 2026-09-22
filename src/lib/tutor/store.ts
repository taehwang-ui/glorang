import type Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import type { SessionProfile } from "./prompt";
import { emptyUsage, type UsageTotals } from "@/lib/billing/cost";
import type { LessonReport } from "./report-schema";

export type SessionStatus = "created" | "active" | "ended";

export interface TutorSession {
  id: string;
  profile: SessionProfile;
  model: string;
  priceKrw: number;
  status: SessionStatus;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  messages: Anthropic.Beta.BetaMessageParam[];
  usage: UsageTotals;
  report: LessonReport | null;
  /** 동시 턴 방지 락 */
  busy: boolean;
}

export interface SessionStore {
  create(input: Omit<TutorSession, "id" | "status" | "createdAt" | "startedAt" | "endedAt" | "messages" | "usage" | "report" | "busy">): Promise<TutorSession>;
  get(id: string): Promise<TutorSession | null>;
  save(session: TutorSession): Promise<void>;
}

/**
 * 인메모리 저장소. 개발·데모용이며 프로세스 재시작 시 사라진다.
 * 운영에서는 같은 인터페이스로 Redis/DB 구현을 붙인다 (docs/integration.md).
 */
class MemoryStore implements SessionStore {
  private map = new Map<string, TutorSession>();

  async create(input: Parameters<SessionStore["create"]>[0]): Promise<TutorSession> {
    const session: TutorSession = {
      ...input,
      id: randomUUID(),
      status: "created",
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      messages: [],
      usage: emptyUsage(),
      report: null,
      busy: false,
    };
    this.map.set(session.id, session);
    return session;
  }

  async get(id: string) {
    return this.map.get(id) ?? null;
  }

  async save(session: TutorSession) {
    this.map.set(session.id, session);
  }
}

// Next.js dev 의 모듈 핫리로드에도 세션이 유지되도록 globalThis 에 보관한다.
const g = globalThis as unknown as { __tutorStore?: SessionStore };
export const sessionStore: SessionStore = g.__tutorStore ?? (g.__tutorStore = new MemoryStore());
