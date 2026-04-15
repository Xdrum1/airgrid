"use client";

import { useEffect, useRef, useState } from "react";

interface StatNumberProps {
  value: number;
  suffix?: string;      // e.g. "+", "K"
  display?: string;     // pre-formatted string to reveal once count reaches target (e.g. "5,647")
  duration?: number;    // ms
  delay?: number;       // ms before starting (staggered entrance)
}

/**
 * Count-up number that only starts animating when it enters the viewport,
 * honoring prefers-reduced-motion. Drop into any stats cell.
 */
export default function StatNumber({
  value,
  suffix = "",
  display,
  duration = 1100,
  delay = 0,
}: StatNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Respect reduced motion — skip animation entirely
    const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mq && mq.matches) {
      setCount(value);
      setDone(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let timeout = 0;

    const start = () => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setCount(Math.round(eased * value));
        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setDone(true);
        }
      };
      raf = requestAnimationFrame(tick);
    };

    // If already on screen, queue the (possibly delayed) start immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      timeout = window.setTimeout(start, delay);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timeout);
      };
    }

    // Otherwise wait until it scrolls into view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeout = window.setTimeout(start, delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [value, duration, delay]);

  // If a display string is provided (e.g. "5,647"), reveal it once the
  // animation reaches the final value to preserve the formatted text.
  const rendered = done && display ? display : count.toLocaleString();

  return (
    <span ref={ref}>
      {rendered}
      {suffix}
    </span>
  );
}
