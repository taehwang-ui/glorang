import { z } from "zod";

/**
 * 선생님이 매 턴 조작하는 "칠판" 명령. 줌 화면 공유처럼 보이는 교안 영역에 렌더링된다.
 * 그림은 1단계에서 이모지로 표현한다 (비용 0, 모든 기기에서 동작). 이후 주제별 일러스트로 교체 가능.
 */
export const BoardCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("word_card"),
    word: z.string().describe("영어 단어 또는 짧은 표현"),
    emoji: z.string().describe("단어를 나타내는 이모지 1~2개"),
    meaning_ko: z.string().describe("한국어 뜻"),
  }),
  z.object({
    type: z.literal("sentence_frame"),
    frame: z.string().describe("빈칸이 ___ 로 표시된 문장 틀. 예: I like ___ because ___."),
    example: z.string().describe("빈칸을 채운 예시 문장"),
  }),
  z.object({
    type: z.literal("picture"),
    emojis: z.array(z.string()).min(2).max(6).describe("장면을 이루는 이모지 2~6개"),
    caption_en: z.string().describe("장면을 설명하는 짧은 영어 한 문장"),
  }),
  z.object({
    type: z.literal("quiz"),
    question: z.string(),
    options: z.array(z.string()).length(3),
    answer_index: z.number().int().min(0).max(2),
  }),
  z.object({
    type: z.literal("sticker"),
    emoji: z.string().describe("보상 스티커 이모지"),
    label_en: z.string().describe("스티커에 쓰인 짧은 칭찬. 예: Great job!"),
  }),
]);
export type BoardCommand = z.infer<typeof BoardCommandSchema>;

export const MOODS = ["neutral", "happy", "curious", "encouraging"] as const;
export type Mood = (typeof MOODS)[number];

/** 한 턴의 선생님 출력 (구조화 출력) */
export const TurnOutputSchema = z.object({
  say: z.string().describe("소리 내어 읽을 영어 발화. 1~3문장, 질문 하나로 끝남."),
  hint: z.string().nullable().describe("아이가 막힐 때만 짧은 한국어 힌트. 아니면 null."),
  mood: z.enum(MOODS).describe("아바타 표정"),
  board: BoardCommandSchema.nullable().describe("칠판에 새로 보여줄 것. 그대로 두려면 null."),
});
export type TurnOutput = z.infer<typeof TurnOutputSchema>;

/** 데모(sample.json)처럼 스키마 강제가 없는 경로에서 쓰는 관대한 파서 */
export function coerceTurnOutput(raw: unknown): TurnOutput {
  const parsed = TurnOutputSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const o = (raw ?? {}) as Record<string, unknown>;
  const say = typeof o.say === "string" && o.say.trim() ? o.say.trim() : "";
  const board = BoardCommandSchema.safeParse(o.board);
  const mood = MOODS.includes(o.mood as Mood) ? (o.mood as Mood) : "neutral";
  return {
    say,
    hint: typeof o.hint === "string" && o.hint.trim() ? o.hint.trim() : null,
    mood,
    board: board.success ? board.data : null,
  };
}
