import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, modelRequestOptions } from "./claude";
import { buildSystemBlocks, splitHint, timeNote } from "./prompt";
import type { TutorSession } from "./store";
import { remainingSec, turnGate } from "@/lib/billing/meter";

/** 클라이언트가 보내는 턴 종류 */
export type TurnInput =
  | { kind: "start" }
  | { kind: "speech"; text: string }
  | { kind: "silence"; seconds: number }
  | { kind: "timeup" };

export type TurnEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      speech: string;
      hint: string | null;
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

const FALLBACK_LINE = "Hmm, let's talk about something else. What is your favorite color?";

/**
 * 한 턴을 실행하고 이벤트를 스트리밍한다. 세션 객체를 직접 갱신한다 (messages, usage, status).
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

  const stream = anthropic.beta.messages.stream({
    model: session.model,
    max_tokens: 1500, // 짧은 발화 + 적응형 사고 여유. 비용 상한 목적의 의도적 제한.
    ...modelRequestOptions(session.model, "low"),
    system: buildSystemBlocks(session.profile),
    messages: request,
  });

  let raw = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      raw += event.delta.text;
      yield { type: "delta", text: event.delta.text };
    }
  }
  const final = await stream.finalMessage();

  let text = raw.trim();
  if (final.stop_reason === "refusal" || !text) {
    // 폴백까지 모두 거부했거나 빈 응답. 수업을 끊지 않도록 안전한 한 줄로 대체한다.
    text = FALLBACK_LINE;
  }

  session.messages.push(userMessage, { role: "assistant", content: text });
  session.usage = {
    inputTokens: session.usage.inputTokens + final.usage.input_tokens,
    outputTokens: session.usage.outputTokens + final.usage.output_tokens,
    cacheReadTokens: session.usage.cacheReadTokens + (final.usage.cache_read_input_tokens ?? 0),
    cacheWriteTokens: session.usage.cacheWriteTokens + (final.usage.cache_creation_input_tokens ?? 0),
    requests: session.usage.requests + 1,
  };

  const ended = gate === "grace" || input.kind === "timeup";
  if (ended) {
    session.status = "ended";
    session.endedAt = Date.now();
  }

  const { speech, hint } = splitHint(text);
  yield {
    type: "done",
    speech,
    hint,
    remainingSec: remainingSec(clock),
    ended,
    usage: final.usage,
  };
}
