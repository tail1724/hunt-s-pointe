// The hashing half of the provenance ledger (addendum feature 11), kept
// dependency-free so it can be unit-tested and reused by both the sealing
// hook and the certificate's verification pass.

export interface SealFields {
  document_id: string;
  keystroke_count: number;
  backspace_count: number;
  active_seconds: number;
  prev_hash: string | null;
}

/** Deterministic payload — no client timestamp — so any row can be
 * re-hashed from its own stored columns and compared against seal_hash. */
export function sealPayload(f: SealFields): string {
  return JSON.stringify({
    document_id: f.document_id,
    keystroke_count: f.keystroke_count,
    backspace_count: f.backspace_count,
    active_seconds: f.active_seconds,
    prev_hash: f.prev_hash,
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computeSealHash(f: SealFields): Promise<string> {
  return sha256Hex(sealPayload(f));
}

/**
 * Verify a chronologically-ordered ledger: each row's hash must match a
 * fresh re-hash of its own stored fields, and its prev_hash must equal the
 * previous row's seal_hash (or be null for the first row).
 */
export async function verifyChain(
  rows: Array<SealFields & { seal_hash: string }>,
): Promise<{ intact: boolean; brokenAt: number | null }> {
  let expectedPrev: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.prev_hash !== expectedPrev) return { intact: false, brokenAt: i };
    const recomputed = await computeSealHash(row);
    if (recomputed !== row.seal_hash) return { intact: false, brokenAt: i };
    expectedPrev = row.seal_hash;
  }
  return { intact: true, brokenAt: null };
}
