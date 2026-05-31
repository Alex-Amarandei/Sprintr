"use client";

import { useEffect, useRef, useState } from "react";
import { Box, type BoxProps } from "@mantine/core";

/**
 * Reveal-on-scroll wrapper. Fades + slides its children up the first time they
 * enter the viewport (one-shot — it never hides again). `delay` (ms) staggers
 * siblings. Pure client component so Server pages can drop it around any JSX.
 */
export function Reveal({
  children,
  delay = 0,
  ...props
}: BoxProps & { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect users who prefer no motion — show immediately.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      {...props}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(28px)",
        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${delay}ms`,
        ...props.style,
      }}
    >
      {children}
    </Box>
  );
}
