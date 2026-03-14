"use client";

/**
 * Animated SVG UTM corridor routes for the hero background.
 * Straight waypoint-to-waypoint segments with glowing transponder blips —
 * like an air traffic control radar screen.
 */
export default function HeroFlightPath() {
  // Waypoint-based routes (straight segments, angular turns)
  const routes = [
    {
      // LAX → corridor east — long cross-country route
      waypoints: [
        [60, 200],
        [180, 140],
        [320, 140],
        [460, 90],
        [640, 90],
        [780, 160],
      ],
      delay: "0s",
      duration: "8s",
      color: "#00d4ff",
    },
    {
      // DFW → corridor north — shorter hop
      waypoints: [
        [900, 260],
        [780, 220],
        [650, 220],
        [520, 180],
        [380, 240],
        [240, 240],
      ],
      delay: "2s",
      duration: "9s",
      color: "#7c3aed",
    },
    {
      // MIA → corridor up the coast
      waypoints: [
        [820, 40],
        [700, 80],
        [580, 60],
        [440, 120],
        [300, 80],
        [160, 60],
      ],
      delay: "4s",
      duration: "8.5s",
      color: "#00ff88",
    },
  ];

  function waypointsToPath(pts: number[][]): string {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  }

  function pathLength(pts: number[][]): number {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.round(len);
  }

  return (
    <svg
      viewBox="0 0 1000 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 1200,
        height: "100%",
        opacity: 0.15,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {/* Faint grid dots — like radar background */}
      {Array.from({ length: 8 }).map((_, col) =>
        Array.from({ length: 3 }).map((_, row) => (
          <circle
            key={`grid-${col}-${row}`}
            cx={80 + col * 120}
            cy={60 + row * 100}
            r={1}
            fill="#fff"
            opacity={0.15}
          />
        ))
      )}

      {routes.map((route, i) => {
        const d = waypointsToPath(route.waypoints);
        const len = pathLength(route.waypoints);

        return (
          <g key={i}>
            {/* Route path — draws in */}
            <path
              d={d}
              stroke={route.color}
              strokeWidth={0.8}
              strokeLinejoin="miter"
              strokeDasharray={len}
              strokeDashoffset={len}
              style={{
                animation: `drawPath ${route.duration} ease-out ${route.delay} forwards`,
              }}
            />

            {/* Waypoint dots — small, subtle */}
            {route.waypoints.map((pt, j) => {
              // Skip first and last — the blip handles those
              if (j === 0 || j === route.waypoints.length - 1) return null;
              return (
                <rect
                  key={j}
                  x={pt[0] - 1.5}
                  y={pt[1] - 1.5}
                  width={3}
                  height={3}
                  fill={route.color}
                  opacity={0.4}
                  transform={`rotate(45 ${pt[0]} ${pt[1]})`}
                />
              );
            })}

            {/* Transponder blip — travels along route */}
            <circle
              r={2}
              fill={route.color}
              style={{
                offsetPath: `path('${d}')`,
                animation: `moveDot ${route.duration} linear ${route.delay} infinite`,
              }}
            />
            {/* Blip glow */}
            <circle
              r={6}
              fill={route.color}
              opacity={0.15}
              style={{
                offsetPath: `path('${d}')`,
                animation: `moveDot ${route.duration} linear ${route.delay} infinite`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
