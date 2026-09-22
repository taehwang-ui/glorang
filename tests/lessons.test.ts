import { describe, expect, it } from "vitest";
import { LESSON_PLANS, lessonPhase, lessonPlanText } from "@/lib/tutor/lessons";
import { TOPICS, buildSystemBlocks } from "@/lib/tutor/prompt";
import { buildUserContent } from "@/lib/tutor/turn";

describe("lesson plans", () => {
  it("has a plan for every topic with vocabulary, frames, role-play and game", () => {
    for (const t of TOPICS) {
      const p = LESSON_PLANS[t.id];
      expect(p, t.id).toBeDefined();
      expect(p.vocabulary.length).toBeGreaterThanOrEqual(5);
      expect(p.frames.length).toBeGreaterThanOrEqual(3);
      expect(p.rolePlay.length).toBeGreaterThan(10);
      expect(p.game.length).toBeGreaterThan(10);
    }
  });
  it("is injected into the session system block, not the shared core block", () => {
    const [core, session] = buildSystemBlocks({ studentName: "Juno", age: 9, level: "basic", topicId: "food", durationMin: 20 });
    expect(session.text).toContain(lessonPlanText("food"));
    expect(session.text).toContain("I'd like ___, please.");
    expect(core.text).not.toContain("Lesson plan");
  });
});

describe("lessonPhase", () => {
  it("moves through four phases by elapsed fraction", () => {
    expect(lessonPhase(0)).toBe("warm-up");
    expect(lessonPhase(0.2)).toBe("topic talk");
    expect(lessonPhase(0.6)).toBe("role-play or game");
    expect(lessonPhase(0.9)).toBe("wrap-up");
  });
  it("phase note goes after the student's words and is dropped when a time note is present", () => {
    expect(buildUserContent({ kind: "speech", text: "I ate pizza" }, null, "[Lesson phase: topic talk]")).toEqual([
      { type: "text", text: "I ate pizza" },
      { type: "text", text: "[Lesson phase: topic talk]" },
    ]);
    expect(buildUserContent({ kind: "speech", text: "bye" }, "[Time is up]", "[Lesson phase: wrap-up]")).toEqual([
      { type: "text", text: "bye" },
      { type: "text", text: "[Time is up]" },
    ]);
  });
});
