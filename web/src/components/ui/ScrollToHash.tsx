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

    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("hash-flash");
        setTimeout(() => el.classList.remove("hash-flash"), 1600);
      } else if (tries++ < 15) {
        timer = setTimeout(tick, 100);
      }
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return null;
}
