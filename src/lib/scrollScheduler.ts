/**
 * Centralized High-Performance Scroll Scheduler & Geometry Cache
 *
 * Consolidates multiple independent scroll listeners into a single passive listener
 * running inside requestAnimationFrame (writes batched, layout reads cached).
 * Exposes setScrollY for Lenis smooth scrolling integration (Phase 6).
 */

export interface GeometryCache {
  vpWidth: number;
  vpHeight: number;
  maxScroll: number;
  rv: { top: number; height: number } | null;
  story: { top: number; height: number } | null;
  big: { top: number; height: number } | null;
  gtParents: Array<{ el: HTMLElement; top: number; height: number; d: number }>;
  sections: Array<{ name: string; top: number }>;
}

type Subscriber = (scrollY: number, geom: GeometryCache) => void;

class ScrollScheduler {
  private subscribers = new Map<string, Subscriber>();
  private currentScrollY = 0;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isInitialized = false;

  private geom: GeometryCache = {
    vpWidth: typeof window !== "undefined" ? window.innerWidth : 1280,
    vpHeight: typeof window !== "undefined" ? window.innerHeight : 800,
    maxScroll: 1,
    rv: null,
    story: null,
    big: null,
    gtParents: [],
    sections: [],
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.currentScrollY = window.scrollY;
    }
  }

  public init() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;
    this.currentScrollY = window.scrollY;

    window.addEventListener("scroll", this.onWindowScroll, { passive: true });
    window.addEventListener("resize", this.onWindowResize, { passive: true });
    window.addEventListener("orientationchange", this.onWindowResize, { passive: true });
    window.addEventListener("load", this.onWindowResize, { passive: true });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => this.refresh());
    }

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.refresh();
      });

      const observeIfPresent = (selector: string) => {
        const el = document.querySelector(selector);
        if (el && this.resizeObserver) {
          this.resizeObserver.observe(el);
        }
      };

      observeIfPresent("#story");
      observeIfPresent(".big");
      observeIfPresent("#rv");
      observeIfPresent("#products");
      observeIfPresent("#roi");
      observeIfPresent("#integrations");
      observeIfPresent("#contact");
    }

    this.refresh();
  }

  private onWindowScroll = () => {
    const sy = window.scrollY;
    if (Math.abs(this.currentScrollY - sy) < 0.5) return;
    this.currentScrollY = sy;
    this.scheduleFrame();
  };

  private onWindowResize = () => {
    this.refresh();
  };

  public refresh() {
    if (typeof window === "undefined") return;
    const sy = window.scrollY;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const maxS = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );

    // 1. #rv (Word reveal)
    const rvEl = document.getElementById("rv");
    let rvGeom = null;
    if (rvEl) {
      const r = rvEl.getBoundingClientRect();
      rvGeom = { top: r.top + sy, height: r.height };
    }

    // 2. #story (Story sync static wrapper)
    const storyEl = document.getElementById("story");
    let storyGeom = null;
    if (storyEl) {
      const r = storyEl.getBoundingClientRect();
      storyGeom = { top: r.top + sy, height: r.height };
    }

    // 3. .big (Marquee static wrapper)
    const r1 = document.getElementById("r1");
    let bigGeom = null;
    const bigParent = r1?.parentElement;
    if (bigParent) {
      const r = bigParent.getBoundingClientRect();
      bigGeom = { top: r.top + sy, height: r.height };
    }

    // 4. .gt parents (Typography parallax)
    const gtEls = document.querySelectorAll(".gt") as NodeListOf<HTMLElement>;
    const gtParents: Array<{ el: HTMLElement; top: number; height: number; d: number }> = [];
    gtEls.forEach((g) => {
      const p = g.parentElement;
      if (p) {
        const r = p.getBoundingClientRect();
        const d = Number(g.dataset.d) || 1;
        gtParents.push({ el: g, top: r.top + sy, height: r.height, d });
      }
    });

    // 5. Sections (Nav spy)
    const sectionSelectors: [string, string][] = [
      ["home", ".hero"],
      ["products", "#products"],
      ["roi", "#roi"],
      ["integrations", "#integrations"],
      ["contact", "#contact"],
    ];
    const sections: Array<{ name: string; top: number }> = [];
    sectionSelectors.forEach(([name, sel]) => {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        sections.push({ name, top: r.top + sy });
      }
    });

    this.geom = {
      vpWidth: vpW,
      vpHeight: vpH,
      maxScroll: maxS,
      rv: rvGeom,
      story: storyGeom,
      big: bigGeom,
      gtParents,
      sections,
    };

    this.scheduleFrame();
  }

  public scheduleFrame() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.flush);
  }

  private flush = () => {
    this.rafId = null;
    const sy = this.currentScrollY;
    const geom = this.geom;
    this.subscribers.forEach((sub) => {
      try {
        sub(sy, geom);
      } catch (err) {
        console.error("Error in scroll subscriber:", err);
      }
    });
  };

  public subscribe(id: string, fn: Subscriber) {
    this.subscribers.set(id, fn);
    if (!this.isInitialized) {
      this.init();
    }
    // Run once immediately with current values
    fn(this.currentScrollY, this.geom);
  }

  public unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  /**
   * External feed for scroll value (used by Phase 6 Lenis integration)
   */
  public setScrollY(y: number) {
    if (Math.abs(this.currentScrollY - y) < 0.5) return;
    this.currentScrollY = y;
    this.scheduleFrame();
  }

  public getScrollY(): number {
    return this.currentScrollY;
  }

  public getGeometry(): GeometryCache {
    return this.geom;
  }

  public destroy() {
    if (typeof window === "undefined") return;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("scroll", this.onWindowScroll);
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("orientationchange", this.onWindowResize);
    window.removeEventListener("load", this.onWindowResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.subscribers.clear();
    this.isInitialized = false;
  }
}

export const scrollScheduler = new ScrollScheduler();

