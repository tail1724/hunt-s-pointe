import { describe, expect, it } from "vitest";
import { computeCadence, cadenceWouldFlatten } from "./cadence";
import { findTells, tellDensity } from "./tells";

describe("computeCadence", () => {
  it("reports insufficient-data for short text", () => {
    expect(computeCadence("One sentence. Two sentences.").verdict).toBe("insufficient-data");
  });

  it("flags uniform sentence lengths as flattened", () => {
    const uniform = "This is a sentence. This is a sentence. This is a sentence. This is a sentence.";
    expect(computeCadence(uniform).verdict).toBe("flattened");
  });

  it("recognizes bursty, human-like sentence-length variance", () => {
    const bursty = "No. That's not what happened at all, and everyone in the room knew it the moment she walked in. Why? Because the numbers never lied, not once, not even when everyone desperately wanted them to.";
    expect(computeCadence(bursty).verdict).toBe("human-like");
  });
});

describe("cadenceWouldFlatten", () => {
  it("detects an edit that smooths bursty prose into uniform sentences", () => {
    const before = "No. That's not what happened at all, and everyone in the room knew it the moment she walked in, because the numbers never lied, not once, not even when everyone desperately wanted them to. Why?";
    const after = "That is not correct. The situation was different. The numbers were accurate. The room understood this.";
    expect(cadenceWouldFlatten(before, after)).toBe(true);
  });

  it("does not flag when both are too short to score", () => {
    expect(cadenceWouldFlatten("Hi.", "Hello.")).toBe(false);
  });
});

describe("findTells", () => {
  it("matches whole-word tells case-insensitively", () => {
    const matches = findTells("Let's delve into this multifaceted, overarching issue.");
    expect(matches.map((m) => m.word)).toEqual(["delve", "multifaceted", "overarching"]);
  });

  it("does not match tells inside other words", () => {
    expect(findTells("The robustness of the design was notable.")).toEqual([]);
  });

  it("returns no matches for clean prose", () => {
    expect(findTells("The council voted six to three after midnight.")).toEqual([]);
  });
});

describe("tellDensity", () => {
  it("is zero for text with no tells", () => {
    expect(tellDensity("A plain sentence with nothing unusual.")).toBe(0);
  });

  it("is positive when tells are present", () => {
    expect(tellDensity("This crucial, multifaceted tapestry of ideas.")).toBeGreaterThan(0);
  });
});
