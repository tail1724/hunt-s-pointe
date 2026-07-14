import { describe, it, expect } from "vitest";
import { windowTranscript, retrievalHistory, isSubstantiveQuery } from "./history";

describe("windowTranscript", () => {
  const msgs = Array.from({ length: 12 }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: `msg-${i}`,
  }));

  it("returns all when under limit", () => {
    const { kept, omitted } = windowTranscript(msgs.slice(0, 4), 8);
    expect(kept).toHaveLength(4);
    expect(omitted).toBe(0);
  });

  it("windows to maxTurns", () => {
    const { kept, omitted } = windowTranscript(msgs, 4);
    expect(kept).toHaveLength(4);
    expect(omitted).toBe(8);
    expect(kept[0].content).toBe("msg-8");
  });

  it("preserves pinned turns", () => {
    const withPin = [{ ...msgs[0], pinned: true }, ...msgs.slice(1)];
    const { kept } = windowTranscript(withPin, 4);
    expect(kept[0].content).toBe("msg-0");
    expect(kept).toHaveLength(5);
  });
});

describe("retrievalHistory", () => {
  const msgs = [
    { role: "user" as const, content: "q1" },
    { role: "assistant" as const, content: "a1" },
    { role: "user" as const, content: "q2" },
    { role: "assistant" as const, content: "a2" },
    { role: "user" as const, content: "q3 current" },
  ];

  it("excludes the current user message", () => {
    const h = retrievalHistory(msgs, 6);
    expect(h.map((m) => m.content)).not.toContain("q3 current");
  });

  it("clips long content", () => {
    const long = [
      { role: "user" as const, content: "x".repeat(600) },
      { role: "user" as const, content: "current" },
    ];
    const h = retrievalHistory(long, 6, 100);
    expect(h[0].content.length).toBeLessThanOrEqual(101);
  });
});

describe("isSubstantiveQuery", () => {
  it("returns true for questions", () => {
    expect(isSubstantiveQuery("What is grace?")).toBe(true);
  });

  it("returns true for long messages", () => {
    expect(isSubstantiveQuery("Tell me about the theology of suffering in Job")).toBe(true);
  });

  it("returns false for short non-questions", () => {
    expect(isSubstantiveQuery("thanks")).toBe(false);
    expect(isSubstantiveQuery("ok")).toBe(false);
  });

  it("returns false for empty", () => {
    expect(isSubstantiveQuery("")).toBe(false);
    expect(isSubstantiveQuery("   ")).toBe(false);
  });
});
