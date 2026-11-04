"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { scrollScheduler } from "@/lib/scrollScheduler";

/**
 * Global kill-switch for Lenis smooth scrolling (Phase 6).
 * Set to false to instantly revert to 100% native browser scrolling.
 */
export const ENABLE_LENIS = true;

let globalLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return globalLenis;
}

export default function SmoothScroll() {
  useEffect(() => {
    if (!ENABLE_LENIS || typeof window === "undefined") return;

    // Gate: Enable ONLY when (pointer: fine) and NOT prefers-reduced-motion
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isFinePointer || prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false, // Touch devices keep native scrolling
      autoRaf: false,   // Single rAF loop coordinated below
      anchors: true,    // Intercept internal anchor clicks (#contact, #roi, etc.)
    });

    globalLenis = lenis;

    // HTML classes: disable native smooth scroll so it does not fight Lenis
    document.documentElement.classList.add("lenis");
    document.documentElement.classList.add("lenis-smooth");

    // Feed scroll offset into centralized scrollScheduler
    const handleScroll = (e: { scroll: number }) => {
      scrollScheduler.setScrollY(e.scroll);
    };
    lenis.on("scroll", handleScroll);

    // Single rAF loop driving Lenis
    let rafId: number | null = null;
    let isRunning = true;

    function onFrame(time: number) {
      if (!isRunning) return;
      lenis.raf(time);
      rafId = requestAnimationFrame(onFrame);
    }
    rafId = requestAnimationFrame(onFrame);

    // Refresh Lenis and scheduler on window resize
    const handleResize = () => {
      lenis.resize();
      scrollScheduler.refresh();
    };
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      isRunning = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("resize", handleResize);
      lenis.off("scroll", handleScroll);
      lenis.destroy();
      globalLenis = null;
      document.documentElement.classList.remove("lenis");
      document.documentElement.classList.remove("lenis-smooth");
    };
  }, []);

  return null;
}
