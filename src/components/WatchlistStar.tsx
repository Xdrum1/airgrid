"use client";

import { useRouter } from "next/navigation";

interface WatchlistStarProps {
  cityId: string;
  isWatched: boolean;
  onToggle: (cityId: string) => void;
  isAuthenticated: boolean;
  size?: "sm" | "md";
}

export default function WatchlistStar({
  cityId,
  isWatched,
  onToggle,
  isAuthenticated,
  size = "sm",
}: WatchlistStarProps) {
  const router = useRouter();
  const px = size === "md" ? 18 : 14;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isAuthenticated) {
          router.push("/login");
          return;
        }
        onToggle(cityId);
      }}
      title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill={isWatched ? "#f59e0b" : "none"}
        stroke={isWatched ? "#f59e0b" : "#555"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "fill 0.15s ease, stroke 0.15s ease" }}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}
