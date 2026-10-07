"use client";

import { useEffect, useState, type RefObject } from "react";

export type EnhancementReason = "ok" | "disabled" | "reduced-motion" | "no-webgl" | "save-data" | "low-power";

/**
 * Decides whether a real-time 3D layer may load. Utility never depends on it.
 * Returns null until checked on the client (server render = poster).
 */
export function useEnhancement(
  disabled: boolean,
  /** Optional: only enhance once this element is (nearly) in view. */
  target?: RefObject<Element | null>,
): EnhancementReason | null {
  const [reason, setReason] = useState<EnhancementReason | null>(null);
  const [inView, setInView] = useState(!target);

  useEffect(() => {
    if (!target?.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(target.current);
    return () => io.disconnect();
  }, [target]);

  useEffect(() => {
    if (!inView) return;
    if (disabled) return setReason("disabled");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setReason("reduced-motion");
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return setReason("save-data");
    if ((nav.hardwareConcurrency ?? 4) <= 2 || (nav.deviceMemory ?? 4) <= 1) return setReason("low-power");
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) return setReason("no-webgl");
    } catch {
      return setReason("no-webgl");
    }
    // Load only after the browser is idle: utility first.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setReason("ok"), { timeout: 1200 });
    else setTimeout(() => setReason("ok"), 300);
  }, [disabled, inView]);

  return reason;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
