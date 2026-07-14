import { describe, it, expect } from "vitest";
import {
  emailSchema,
  passwordSchema,
  displayNameSchema,
  signupSchema,
  loginSchema,
  seedSchema,
  firstError,
} from "./validation";

describe("validation schemas", () => {
  describe("emailSchema", () => {
    it("accepts valid emails", () => {
      expect(emailSchema.safeParse("foo@bar.com").success).toBe(true);
    });
    it("rejects invalid emails", () => {
      expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    });
    it("rejects emails over 254 chars", () => {
      const long = "a".repeat(250) + "@b.co";
      expect(emailSchema.safeParse(long).success).toBe(false);
    });
  });

  describe("passwordSchema", () => {
    it("requires at least 8 characters", () => {
      expect(passwordSchema.safeParse("short").success).toBe(false);
      expect(passwordSchema.safeParse("longenough1").success).toBe(true);
    });
    it("rejects passwords over 128 chars", () => {
      expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
    });
  });

  describe("displayNameSchema", () => {
    it("trims and requires non-empty", () => {
      expect(displayNameSchema.safeParse("   ").success).toBe(false);
      expect(displayNameSchema.safeParse("  Ada  ").success).toBe(true);
    });
    it("caps at 60 chars", () => {
      expect(displayNameSchema.safeParse("a".repeat(61)).success).toBe(false);
    });
  });

  describe("signupSchema", () => {
    it("validates a full payload", () => {
      const r = signupSchema.safeParse({
        email: "u@x.com",
        password: "supersecret",
        displayName: "Ada",
      });
      expect(r.success).toBe(true);
    });
    it("rejects when any field is invalid", () => {
      const r = signupSchema.safeParse({
        email: "bad",
        password: "supersecret",
        displayName: "Ada",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("allows any non-empty password", () => {
      const r = loginSchema.safeParse({ email: "u@x.com", password: "x" });
      expect(r.success).toBe(true);
    });
  });

  describe("seedSchema", () => {
    it("requires non-empty seed", () => {
      expect(seedSchema.safeParse("").success).toBe(false);
      expect(seedSchema.safeParse("a topic").success).toBe(true);
    });
  });

  describe("firstError", () => {
    it("returns first error message from a failed parse", () => {
      const r = signupSchema.safeParse({ email: "bad", password: "x", displayName: "" });
      expect(r.success).toBe(false);
      expect(typeof firstError(r)).toBe("string");
    });
  });
});
