/**
 * Credit economics — the *only* usage numbers a subscriber sees.
 *
 * Credits are a deliberate abstraction over raw API cost: they let members
 * reason about a monthly membership instead of a metered bill, and they keep
 * our true per-call dollar cost private (that lives server-side in the
 * internal_cost_ledger table, never shipped to the client).
 *
 * These are tunable defaults. Retune freely — nothing downstream hard-codes a
 * specific number. Baseline actions cost the value below; the PressRoom power-dial
 * multiplies chat/study costs (see POWER_MATRIX in usePowerLevel).
 */
export const CREDITS_PER_EVENT = {
  orchestration: 4,      // a full multi-output study (prompt_history row)
  refinement: 1,         // a corrective refinement pass
  partner_message: 1,    // one PressRoom chat turn (× power multiplier)
  image_generation: 10,  // one rendered image
  other: 1,
} as const;

export type CreditBucket = keyof typeof CREDITS_PER_EVENT;

export const BUCKET_LABELS: Record<CreditBucket, string> = {
  orchestration: "Studies",
  refinement: "Refinements",
  partner_message: "PressRoom chat",
  image_generation: "Images",
  other: "Other",
};

export const FEATURE_LABELS = {
  mary: "PressRoom",
  write: "Write",
  create: "Create",
  sentient: "Studies",
  other: "Other",
} as const;

export type FeatureKey = keyof typeof FEATURE_LABELS;

/** Monthly credit allowance per plan (tunable). */
export const PLAN_ALLOWANCE = {
  free: 300,
  pro: 3000,
} as const;

export type PlanKey = keyof typeof PLAN_ALLOWANCE;

/** Whole credits everywhere — no fractional cents, no dollar signs. */
export function formatCredits(n: number): string {
  const rounded = Math.round(n);
  return rounded.toLocaleString();
}

/**
 * Power-dial economics (tunable). A chat/study's credit cost is the base cost
 * times a multiplier built from three dials the user controls:
 *   multiplier = depthFactor[depth-1] × (1 + (power-1) × powerStep) × (turbo ? turboFactor : 1)
 * Higher depth/power/turbo = more thorough answers for more credits. This is
 * the lever members use to manage their monthly pool.
 */
export const POWER_MATRIX = {
  /** Indexed by depth stop 1..8. */
  depthFactor: [0.5, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5],
  /** Added per power level above 1 (levels 1..5 → ×1.0 … ×2.0). */
  powerStep: 0.25,
  /** Extra multiplier when turbo is armed. */
  turboFactor: 1.5,
} as const;
