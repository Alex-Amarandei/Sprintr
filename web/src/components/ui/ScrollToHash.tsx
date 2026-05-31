"use client";

import { useEffect } from "react";

/**
 * App-Router cross-route navigation doesn't reliably scroll to a `#hash` (the target often
 * mounts after the browser's scroll attempt). This finds the element after render — retrying
 * briefly while the page hydrates — scrolls to it, and adds a short highlight pulse.
 */
export function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));

    let cancelled = false;
    let attempts = 0;
    let flashed = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (!flashed) {
          flashed = true;
          el.classList.add("hash-flash");
          setTimeout(() => el.classList.remove("hash-flash"), 1600);
        }
        // Re-scroll a few times: Next scrolls to top on navigation and can override our
        // first scroll, and the card may still be settling during hydration.
        if (attempts++ < 4) timer = setTimeout(tick, 160);
      } else if (attempts++ < 20) {
        timer = setTimeout(tick, 100);
      }
    };
    // Start after a tick so Next's own navigation scroll settles first.
    timer = setTimeout(tick, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return null;
}
