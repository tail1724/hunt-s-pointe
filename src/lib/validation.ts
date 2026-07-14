/**
 * Shared Zod schemas for client-side input validation.
 *
 * These guard the boundaries where untrusted user text enters the system:
 *   - auth forms (email, password, display name)
 *   - workspace seed / prompt inputs
 *   - knowledge base entries
 *
 * Edge functions should re-validate server-side with the same shape.
 */
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Enter a valid email address." })
  .max(254, { message: "Email is too long." });

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters." })
  .max(128, { message: "Password is too long." });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Display name cannot be empty." })
  .max(60, { message: "Display name must be 60 characters or less." });

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required." }),
});

/** Workspace seed / freeform prompt input. */
export const seedSchema = z
  .string()
  .trim()
  .min(1, { message: "Add some text to get started." })
  .max(4000, { message: "Keep it under 4,000 characters." });

/** Chat / session message authored by the user. */
export const chatMessageSchema = z
  .string()
  .trim()
  .min(1, { message: "Message cannot be empty." })
  .max(8000, { message: "Message must be 8,000 characters or less." });

/** Knowledge base entry. */
export const knowledgeEntrySchema = z.object({
  title: z.string().trim().min(1).max(200),
  content_text: z.string().trim().max(50_000).optional().nullable(),
});

/**
 * Helper: returns the first error message from a SafeParseError,
 * or null when parsing succeeded. Useful for toast UX.
 */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Invalid input.";
}
