"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  label: string;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
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
  }, [started, target, duration]);

  return { count, start: () => setStarted(true) };
}

function StatItem({ value, label }: Stat) {
  const { count, start } = useCountUp(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [start]);

  return (
    <div
      ref={ref}
      style={{
        background: "#050508",
        padding: "28px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 32,
          color: "#00d4ff",
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {count}
      </div>
      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2 }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

export default function CountUpStats({ stats }: { stats: Stat[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 1,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {stats.map((s) => (
        <StatItem key={s.label} value={s.value} label={s.label} />
      ))}
    </div>
  );
}
