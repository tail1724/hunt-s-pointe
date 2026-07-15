import { describe, expect, it } from "vitest";
import { computeSealHash, verifyChain, type SealFields } from "./hashChain";

async function buildChain(n: number): Promise<Array<SealFields & { seal_hash: string }>> {
  const rows: Array<SealFields & { seal_hash: string }> = [];
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    const fields: SealFields = {
      document_id: "doc-1",
      keystroke_count: 10 * (i + 1),
      backspace_count: i,
      active_seconds: 60,
      prev_hash: prev,
    };
    const seal_hash = await computeSealHash(fields);
    rows.push({ ...fields, seal_hash });
    prev = seal_hash;
  }
  return rows;
}

describe("provenance hash chain", () => {
  it("verifies an intact chain", async () => {
    const rows = await buildChain(4);
    const result = await verifyChain(rows);
    expect(result).toEqual({ intact: true, brokenAt: null });
  });

  it("detects a tampered row", async () => {
    const rows = await buildChain(4);
    rows[2].keystroke_count = 9999;
    const result = await verifyChain(rows);
    expect(result.intact).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  it("detects a broken prev_hash link", async () => {
    const rows = await buildChain(3);
    rows[1].prev_hash = "not-the-real-previous-hash";
    const result = await verifyChain(rows);
    expect(result.intact).toBe(false);
    expect(result.brokenAt).toBe(1);
  });

  it("treats an empty ledger as trivially intact", async () => {
    expect(await verifyChain([])).toEqual({ intact: true, brokenAt: null });
  });
});
