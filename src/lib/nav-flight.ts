/**
 * NavFlight — calm, premium morph between left-docked sidebar and pinned top bar.
 * A single ghost clone translates + scales from the source rect to the target rect
 * with a hair of perspective. No arcs, no rotation, no afterglow.
 */

export type FlightDirection = "left-to-top" | "top-to-left";

let flying = false;
let queued: null | (() => void) = null;

function findNavEl(side: "left" | "top"): HTMLElement | null {
  const sel = side === "top" ? '[data-nav-anchor="top"]' : '[data-nav-anchor="left"]';
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(sel));
  // Pick the first candidate with a real, visible rect.
  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    if (r.width >= 40 && r.height >= 40) return el;
  }
  return null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export async function playNavFlight(
  direction: FlightDirection,
  commit: () => void,
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    commit();
    return;
  }

  if (prefersReducedMotion()) {
    commit();
    return;
  }

  if (flying) {
    queued = () => playNavFlight(direction, commit);
    return;
  }

  const fromSide = direction === "left-to-top" ? "left" : "top";
  const toSide = direction === "left-to-top" ? "top" : "left";

  const fromEl = findNavEl(fromSide);
  if (!fromEl) {
    commit();
    return;
  }

  const fromRect = fromEl.getBoundingClientRect();

  // Snapshot before commit unmounts the source.
  const ghostNode = fromEl.cloneNode(true) as HTMLElement;
  ghostNode.removeAttribute("id");
  ghostNode.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));

  flying = true;
  fromEl.style.visibility = "hidden";

  commit();

  // Two frames for the target to mount and layout.
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

  const toEl = findNavEl(toSide);
  if (!toEl) {
    fromEl.style.visibility = "";
    flying = false;
    drainQueue();
    return;
  }

  const toRect = toEl.getBoundingClientRect();
  toEl.style.visibility = "hidden";

  const portal = document.createElement("div");
  portal.setAttribute("data-nav-flight-portal", "");
  portal.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:80",
    "pointer-events:none",
    "perspective:1600px",
    "perspective-origin:50% 30%",
    "overflow:hidden",
  ].join(";");

  const ghostBox = document.createElement("div");
  ghostBox.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${fromRect.width}px`,
    `height:${fromRect.height}px`,
    "transform-origin:top left",
    "will-change:transform,opacity",
    "border-radius:16px",
    "overflow:hidden",
  ].join(";");

  ghostNode.style.position = "absolute";
  ghostNode.style.inset = "0";
  ghostNode.style.width = "100%";
  ghostNode.style.height = "100%";
  ghostNode.style.margin = "0";
  ghostNode.style.pointerEvents = "none";
  ghostBox.appendChild(ghostNode);
  portal.appendChild(ghostBox);
  document.body.appendChild(portal);

  const ease = "cubic-bezier(0.32, 0.72, 0, 1)";
  const duration = 360;

  const fx = fromRect.left;
  const fy = fromRect.top;
  const tx = toRect.left;
  const ty = toRect.top;
  const sx = toRect.width / fromRect.width;
  const sy = toRect.height / fromRect.height;

  const ghostAnim = ghostBox.animate(
    [
      {
        transform: `translate(${fx}px, ${fy}px) scale(1, 1) rotateX(0deg)`,
        opacity: 1,
      },
      {
        offset: 0.5,
        transform: `translate(${(fx + tx) / 2}px, ${(fy + ty) / 2}px) scale(${(1 + sx) / 2}, ${(1 + sy) / 2}) rotateX(2deg)`,
        opacity: 0.96,
      },
      {
        transform: `translate(${tx}px, ${ty}px) scale(${sx}, ${sy}) rotateX(0deg)`,
        opacity: 0,
      },
    ],
    { duration, easing: ease, fill: "forwards" },
  );

  // Reveal real target with a calm cross-fade starting at ~60% of the flight.
  setTimeout(() => {
    toEl.style.visibility = "";
    toEl.animate(
      [
        { opacity: 0, transform: "translateY(1px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 220, easing: ease, fill: "none" },
    );
  }, Math.round(duration * 0.6));

  try {
    await ghostAnim.finished;
  } catch {
    /* canceled */
  }

  portal.remove();
  flying = false;
  drainQueue();
}

function drainQueue() {
  if (queued) {
    const next = queued;
    queued = null;
    setTimeout(next, 120);
  }
}
