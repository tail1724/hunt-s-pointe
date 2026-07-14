import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardInset } from "./use-keyboard-inset";

class FakeVisualViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
}

describe("useKeyboardInset", () => {
  let vv: FakeVisualViewport;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vv = new FakeVisualViewport();
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", { value: undefined, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true });
    document.documentElement.style.removeProperty("--kb-inset");
    document.documentElement.removeAttribute("data-keyboard");
  });

  it("reports zero inset when the viewport is untouched", () => {
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current.inset).toBe(0);
    expect(result.current.keyboardOpen).toBe(false);
    expect(document.documentElement.style.getPropertyValue("--kb-inset")).toBe("0px");
  });

  it("measures the covered height once the keyboard shrinks the viewport", async () => {
    const { result } = renderHook(() => useKeyboardInset());
    await act(async () => {
      vv.height = 500;
      vv.dispatchEvent(new Event("resize"));
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(result.current.inset).toBe(300);
    expect(result.current.keyboardOpen).toBe(true);
    expect(document.documentElement.getAttribute("data-keyboard")).toBe("open");
  });

  it("stays closed below the noise threshold", async () => {
    const { result } = renderHook(() => useKeyboardInset());
    await act(async () => {
      vv.height = 760; // 40px covered — under the 80px threshold
      vv.dispatchEvent(new Event("resize"));
      await new Promise((r) => requestAnimationFrame(r));
    });
    expect(result.current.keyboardOpen).toBe(false);
    expect(document.documentElement.hasAttribute("data-keyboard")).toBe(false);
  });

  it("cleans up the CSS var and attribute on unmount", async () => {
    const { unmount } = renderHook(() => useKeyboardInset());
    await act(async () => {
      vv.height = 400;
      vv.dispatchEvent(new Event("resize"));
      await new Promise((r) => requestAnimationFrame(r));
    });
    unmount();
    expect(document.documentElement.style.getPropertyValue("--kb-inset")).toBe("");
    expect(document.documentElement.hasAttribute("data-keyboard")).toBe(false);
  });
});
