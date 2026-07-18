import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Guardrail for the class of bug where a CSS custom property gets renamed
// (e.g. --primary-foreground → --pripressroom-foreground) but the Tailwind utility
// that references it does not. Tailwind then emits `color: hsl(var(--missing))`,
// which is invalid and silently dropped — producing "invisible" button labels.
//
// This test asserts every `hsl(var(--x))` the Tailwind theme references has a
// matching `--x:` definition in index.css (in both :root and .dark).

const root = resolve(__dirname, "../..");
const css = readFileSync(resolve(root, "src/index.css"), "utf8");
const tw = readFileSync(resolve(root, "tailwind.config.ts"), "utf8");

// Variables supplied at runtime by component libraries (Radix injects
// --radix-* onto elements) are not theme tokens and are not defined in CSS.
const RUNTIME_PREFIXES = ["radix-"];

/** Variables referenced by the Tailwind theme as hsl(var(--x)). */
const referenced = new Set(
  [...tw.matchAll(/var\(--([a-z0-9-]+)\)/gi)]
    .map((m) => m[1])
    .filter((name) => !RUNTIME_PREFIXES.some((p) => name.startsWith(p))),
);

/** Variables defined anywhere in index.css as `--x:`. */
const defined = new Set(
  [...css.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((m) => m[1]),
);

describe("theme token integrity", () => {
  it("defines every custom property the Tailwind theme references", () => {
    const missing = [...referenced].filter((name) => !defined.has(name));
    expect(missing, `Tailwind references undefined CSS vars: ${missing.join(", ")}`).toEqual([]);
  });

  it("defines --primary-foreground and --sidebar-primary-foreground", () => {
    // The exact pair whose loss made every primary button label invisible.
    expect(defined.has("primary-foreground")).toBe(true);
    expect(defined.has("sidebar-primary-foreground")).toBe(true);
  });

  it("has no stray renamed foreground tokens", () => {
    expect(css.includes("pripressroom")).toBe(false);
  });
});
