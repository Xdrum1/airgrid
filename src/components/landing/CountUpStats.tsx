"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix?: string; // e.g. "+" for "1,900+"
  label: string;
}

const DURATIONS = [1200, 900, 1100, 800];

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);

  return count;
}

function StatItem({
  value,
  suffix,
  label,
  duration,
  active,
  delay,
}: Stat & { duration: number; active: boolean; delay: number }) {
  const [delayDone, setDelayDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setDelayDone(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);

  const count = useCountUp(value, duration, delayDone);

  return (
    <div
      style={{
        background: "#050508",
        padding: "28px 24px",
        textAlign: "center",
        opacity: delayDone ? 1 : 0.3,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 32,
          color: "#5B8DB8",
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {count.toLocaleString()}{suffix ?? ""}
      </div>
      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2 }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

export default function CountUpStats({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already in viewport on mount, activate immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="landing-stats-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 1,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {stats.map((s, i) => (
        <StatItem
          key={s.label}
          value={s.value}
          suffix={s.suffix}
          label={s.label}
          duration={DURATIONS[i] ?? 900}
          active={active}
          delay={i * 150}
        />
      ))}
    </div>
  );
}
