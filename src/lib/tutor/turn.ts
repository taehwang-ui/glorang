import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, modelRequestOptions } from "./claude";
import { buildSystemBlocks, timeNote } from "./prompt";
import { TurnOutputSchema, type TurnOutput } from "./board";
import type { TutorSession } from "./store";
import { remainingSec, turnGate } from "@/lib/billing/meter";

/** 클라이언트가 보내는 턴 종류 */
export type TurnInput =
  | { kind: "start" }
  | { kind: "speech"; text: string }
  | { kind: "silence"; seconds: number }
  | { kind: "timeup" };

export type TurnEvent =
  | { type: "thinking" }
  | {
      type: "done";
      output: TurnOutput;
      remainingSec: number;
      ended: boolean;
      usage: Anthropic.Beta.BetaUsage;
    }
  | { type: "error"; message: string };

/** 사용자 메시지 본문 + 시스템 노트 블록. 학생 발화는 따로 두어 리포트에서 구분한다. */
export function buildUserContent(input: TurnInput, note: string | null): Anthropic.Beta.BetaTextBlockParam[] {
  const blocks: Anthropic.Beta.BetaTextBlockParam[] = [];
  if (input.kind === "start") blocks.push({ type: "text", text: "[Lesson starts]" });
  else if (input.kind === "silence")
    blocks.push({ type: "text", text: `[The student did not answer for ${input.seconds} seconds]` });
  else if (input.kind === "speech") blocks.push({ type: "text", text: input.text.trim() });
  // timeup: 시스템 노트만 보낸다. 노트가 아직 없으면(시계 오차) 강제로 붙인다.
  const finalNote = input.kind === "timeup" ? (note ?? "[Time is up]") : note;
  if (finalNote) blocks.push({ type: "text", text: finalNote });
  return blocks;
}

/** 메시지 배열 마지막 user 메시지에 캐시 브레이크포인트를 건다 (이력 증분 캐시). */
function withHistoryBreakpoint(messages: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || typeof last.content === "string") return messages;
  const blocks = last.content.map((b, i, arr) =>
    i === arr.length - 1 && b.type === "text" ? { ...b, cache_control: { type: "ephemeral" as const } } : b,
  );
  return [...messages.slice(0, -1), { ...last, content: blocks }];
}

const FALLBACK_OUTPUT: TurnOutput = {
  say: "Hmm, let's talk about something else. What is your favorite color?",
  hint: "다른 이야기를 해 볼까요? 좋아하는 색이 뭐예요?",
  mood: "encouraging",
  board: null,
};

/**
 * 이력에 남기는 assistant 턴은 구조화 출력 JSON 전체다. 다음 턴에서 모델이 자기 보드 조작을 기억해야 하기 때문.
 * 리포트 생성 시에는 transcriptText 가 say 만 뽑아 쓴다.
 */
export function assistantContent(output: TurnOutput): string {
  return JSON.stringify(output);
}

/**
 * 한 턴을 실행하고 이벤트를 내보낸다. 세션 객체를 직접 갱신한다 (messages, usage, status).
 * 호출자는 session.busy 락과 저장을 책임진다.
 */
export async function* runTurn(session: TutorSession, input: TurnInput): AsyncGenerator<TurnEvent> {
  const now = Date.now();
  if (session.status === "ended") {
    yield { type: "error", message: "lesson is over" };
    return;
  }
  if (session.startedAt === null) session.startedAt = now;
  session.status = "active";

  const clock = { startedAt: session.startedAt, durationMin: session.profile.durationMin };
  const gate = turnGate(clock, now);
  if (gate === "closed") {
    session.status = "ended";
    session.endedAt = now;
    yield { type: "error", message: "lesson is over" };
    return;
  }
  const left = remainingSec(clock, now);
  const note = gate === "grace" || input.kind === "timeup" ? "[Time is up]" : timeNote(left);

  const userMessage: Anthropic.Beta.BetaMessageParam = { role: "user", content: buildUserContent(input, note) };
  const request = withHistoryBreakpoint([...session.messages, userMessage]);

  yield { type: "thinking" };

  const response = await anthropic.beta.messages.parse({
    model: session.model,
    max_tokens: 1500, // 짧은 발화 + 보드 JSON + 적응형 사고 여유. 비용 상한 목적의 의도적 제한.
    ...modelRequestOptions(session.model, "low"),
    system: buildSystemBlocks(session.profile),
    messages: request,
    output_config: { format: betaZodOutputFormat(TurnOutputSchema) },
  });

  let output: TurnOutput;
  if (response.stop_reason === "refusal" || !response.parsed_output || !response.parsed_output.say.trim()) {
    // 폴백까지 모두 거부했거나 스키마 불일치. 수업을 끊지 않도록 안전한 한 턴으로 대체한다.
    output = FALLBACK_OUTPUT;
  } else {
    output = response.parsed_output;
  }

  session.messages.push(userMessage, { role: "assistant", content: assistantContent(output) });
  session.usage = {
    inputTokens: session.usage.inputTokens + response.usage.input_tokens,
    outputTokens: session.usage.outputTokens + response.usage.output_tokens,
    cacheReadTokens: session.usage.cacheReadTokens + (response.usage.cache_read_input_tokens ?? 0),
    cacheWriteTokens: session.usage.cacheWriteTokens + (response.usage.cache_creation_input_tokens ?? 0),
    requests: session.usage.requests + 1,
  };

  const ended = gate === "grace" || input.kind === "timeup";
  if (ended) {
    session.status = "ended";
    session.endedAt = Date.now();
  }

  yield { type: "done", output, remainingSec: remainingSec(clock), ended, usage: response.usage };
}
