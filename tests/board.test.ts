import { describe, expect, it } from "vitest";
import { BoardCommandSchema, TurnOutputSchema, coerceTurnOutput } from "@/lib/tutor/board";
import { transcriptText } from "@/lib/tutor/report";
import { assistantContent } from "@/lib/tutor/turn";

describe("TurnOutputSchema", () => {
  it("accepts a full turn with a board command", () => {
    const r = TurnOutputSchema.safeParse({
      say: "Look at the board! What is this?",
      hint: null,
      mood: "curious",
      board: { type: "word_card", word: "apple", emoji: "🍎", meaning_ko: "사과" },
    });
    expect(r.success).toBe(true);
  });
  it("rejects a quiz without exactly three options", () => {
    const r = BoardCommandSchema.safeParse({ type: "quiz", question: "Which one is a fruit?", options: ["apple", "car"], answer_index: 0 });
    expect(r.success).toBe(false);
  });
});

describe("coerceTurnOutput", () => {
  it("salvages what it can from a loose object", () => {
    const o = coerceTurnOutput({ say: " Hi! ", mood: "silly", board: { type: "nope" }, hint: "" });
    expect(o).toEqual({ say: "Hi!", hint: null, mood: "neutral", board: null });
  });
  it("keeps a valid board even when other fields are off", () => {
    const o = coerceTurnOutput({ say: "Try this.", board: { type: "sentence_frame", frame: "I like ___.", example: "I like pizza." } });
    expect(o.board?.type).toBe("sentence_frame");
  });
});

describe("transcriptText", () => {
  it("shows the spoken text and board type for assistant JSON turns", () => {
    const text = transcriptText([
      { role: "user", content: [{ type: "text", text: "[Lesson starts]" }] },
      { role: "assistant", content: assistantContent({ say: "Hello Mina!", hint: null, mood: "happy", board: { type: "sticker", emoji: "⭐", label_en: "Welcome!" } }) },
      { role: "user", content: [{ type: "text", text: "I like dog." }] },
    ]);
    expect(text).toBe("Student: [Lesson starts]\nTutor: Hello Mina! [board: sticker]\nStudent: I like dog.");
  });
});
