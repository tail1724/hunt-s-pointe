// node:assert (not the remote std asserts) so the test runs offline through
// the _check config, matching prompt-partner/turn.test.ts.
import nodeAssert from "node:assert/strict";
import { planResponse } from "./plan.ts";

const assertEquals = (a: unknown, b: unknown) => nodeAssert.deepEqual(a, b);

// Usage questions should retrieve the right guide and expose its deep-links.
Deno.test("routes a how-to question to the matching guide", () => {
  const plan = planResponse("How do I make a story outline?");
  assertEquals(plan.mode, "answer");
  if (plan.mode === "answer") {
    assertEquals(plan.guideSlug, "your-first-story-outline");
    // The outline guide links into PressRoom and Write.
    const routes = plan.actions.map((a) => a.to);
    assertEquals(routes.includes("/app/pressroom"), true);
  }
});

Deno.test("routes an export question to the drafting guide", () => {
  const plan = planResponse("how do I export my document to word?");
  assertEquals(plan.mode, "answer");
  if (plan.mode === "answer") assertEquals(plan.guideSlug, "drafting-and-exporting");
});

Deno.test("redirects a sourcing/verification question to PressRoom", () => {
  const plan = planResponse("Can you verify the source for that statistic in this passage?");
  assertEquals(plan.mode, "redirect");
});

Deno.test("escalates when nothing matches", () => {
  const plan = planResponse("zxcvb qwerty nonsense unrelated");
  assertEquals(plan.mode, "escalate");
});
