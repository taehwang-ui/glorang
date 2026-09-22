import { describe, expect, it } from "vitest";
import { buildSystemBlocks, splitHint, timeNote, TUTOR_CORE_PROMPT } from "@/lib/tutor/prompt";

describe("splitHint", () => {
  it("separates the HINT line from spoken text", () => {
    const r = splitHint("Do you like pizza?\nHINT: 피자 좋아하니? 라고 물었어요.");
    expect(r.speech).toBe("Do you like pizza?");
    expect(r.hint).toBe("피자 좋아하니? 라고 물었어요.");
  });
  it("returns null hint when absent", () => {
    expect(splitHint("Hello Mina! What is your favorite color?")).toEqual({
      speech: "Hello Mina! What is your favorite color?",
      hint: null,
    });
  });
  it("is case-insensitive and trims", () => {
    expect(splitHint("  Hi!  \n hint:   안녕  ").hint).toBe("안녕");
  });
});

describe("timeNote", () => {
  it("is silent while plenty of time remains", () => {
    expect(timeNote(10 * 60)).toBeNull();
    expect(timeNote(121)).toBeNull();
  });
  it("warns at two minutes and one minute", () => {
    expect(timeNote(120)).toBe("[Time left: 2 minutes]");
    expect(timeNote(45)).toBe("[Time left: 1 minute]");
  });
  it("marks time up", () => {
    expect(timeNote(0)).toBe("[Time is up]");
  });
});

describe("buildSystemBlocks", () => {
  const profile = { studentName: "Mina", age: 8, level: "starter" as const, topicId: "animals", durationMin: 20 };

  it("keeps the core prompt byte-identical across sessions so the cache is shared", () => {
    const a = buildSystemBlocks(profile);
    const b = buildSystemBlocks({ ...profile, studentName: "Juno", level: "intermediate", topicId: "food" });
    expect(a[0].text).toBe(TUTOR_CORE_PROMPT);
    expect(a[0].text).toBe(b[0].text);
    expect(a[0].cache_control).toEqual({ type: "ephemeral" });
    expect(a[1].cache_control).toEqual({ type: "ephemeral" });
  });
  it("puts session specifics in the second block", () => {
    const [, session] = buildSystemBlocks(profile);
    expect(session.text).toContain("Mina");
    expect(session.text).toContain("Animals and pets");
    expect(session.text).toContain("Level: starter");
    expect(session.text).toContain("20 minutes");
  });
  it("core prompt contains no volatile values", () => {
    expect(TUTOR_CORE_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(TUTOR_CORE_PROMPT).toContain("HINT:");
  });
});
