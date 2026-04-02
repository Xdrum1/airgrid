"use client";

import { useEffect, useState } from "react";

interface Stat {
  value: number;
  label: string;
}

// Staggered durations so counters finish at slightly different times
const DURATIONS = [800, 600, 700, 500];
const SETTLE_DELAY = 650;

function useCountUp(target: number, duration: number, delay: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      let raf: number;

      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) raf = requestAnimationFrame(tick);
      }

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return count;
}

function StatItem({ value, label, duration, delay }: Stat & { duration: number; delay: number }) {
  const count = useCountUp(value, duration, delay);

  return (
    <div
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
          color: "#5B8DB8",
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
          label={s.label}
          duration={DURATIONS[i] ?? 700}
          delay={SETTLE_DELAY}
        />
      ))}
    </div>
  );
}
