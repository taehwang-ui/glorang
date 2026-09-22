import { describe, expect, it } from "vitest";
import { buildUserContent } from "@/lib/tutor/turn";

describe("buildUserContent", () => {
  it("keeps student speech and system notes in separate blocks", () => {
    const blocks = buildUserContent({ kind: "speech", text: "  I like dog.  " }, "[Time left: 1 minute]");
    expect(blocks).toEqual([
      { type: "text", text: "I like dog." },
      { type: "text", text: "[Time left: 1 minute]" },
    ]);
  });
  it("encodes lesson start and silence as bracketed notes", () => {
    expect(buildUserContent({ kind: "start" }, null)).toEqual([{ type: "text", text: "[Lesson starts]" }]);
    expect(buildUserContent({ kind: "silence", seconds: 10 }, null)).toEqual([
      { type: "text", text: "[The student did not answer for 10 seconds]" },
    ]);
  });
  it("always sends a time-up note for timeup turns", () => {
    expect(buildUserContent({ kind: "timeup" }, null)).toEqual([{ type: "text", text: "[Time is up]" }]);
  });
});
