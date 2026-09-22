import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { sessionStore } from "@/lib/tutor/store";
import { loadOwnedSession } from "@/lib/tutor/access";
import { runTurn, type TurnEvent, type TurnInput } from "@/lib/tutor/turn";

const TurnBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start") }),
  z.object({ kind: z.literal("speech"), text: z.string().trim().min(1).max(600) }),
  z.object({ kind: z.literal("silence"), seconds: z.number().int().min(1).max(120) }),
  z.object({ kind: z.literal("timeup") }),
]);

/**
 * 한 턴 실행. 응답은 NDJSON 스트림 (한 줄에 TurnEvent 하나).
 * 튜터 발화를 토큰 단위로 흘려보내고, 마지막 "done" 이벤트에 TTS 용 speech/hint 와 남은 시간을 담는다.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadOwnedSession(id);
  if ("error" in loaded) return loaded.error;
  const { session } = loaded;
  if (session.status === "ended") return Response.json({ error: "lesson is over" }, { status: 410 });
  if (session.busy) return Response.json({ error: "turn in progress" }, { status: 409 });

  const parsed = TurnBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });
  const input = parsed.data as TurnInput;

  session.busy = true;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: TurnEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const event of runTurn(session, input)) send(event);
      } catch (err) {
        // 첫 턴이 실패하면 시계를 되돌려 학생의 시간을 깎지 않는다.
        if (session.messages.length === 0) {
          session.startedAt = null;
          session.status = "created";
        }
        send({ type: "error", message: describeError(err) });
      } finally {
        session.busy = false;
        await sessionStore.save(session);
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "AI 서버 인증 오류 (ANTHROPIC_API_KEY 확인)";
  if (err instanceof Anthropic.RateLimitError) return "AI 서버가 잠시 바빠요. 몇 초 뒤 다시 말해 주세요.";
  if (err instanceof Anthropic.APIConnectionError) return "AI 서버에 연결하지 못했어요. 인터넷을 확인해 주세요.";
  if (err instanceof Anthropic.APIError) return `AI 서버 오류 (${err.status})`;
  console.error("turn failed", err);
  return "알 수 없는 오류가 났어요.";
}
