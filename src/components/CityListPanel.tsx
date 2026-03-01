"use client";

import { City } from "@/types";
import type { FilterKey } from "./dashboard-types";
import CityCard from "./CityCard";
import WatchlistStar from "./WatchlistStar";

export default function CityListPanel({
  cities,
  filtered,
  filter,
  onFilterChange,
  selected,
  onSelect,
  animate,
  isMobile,
  onClose,
  watchedCityIds,
  onToggleWatch,
  isAuthenticated,
  isWatched,
}: {
  cities: City[];
  filtered: City[];
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  selected: City;
  onSelect: (city: City) => void;
  animate: boolean;
  isMobile: boolean;
  onClose: () => void;
  watchedCityIds: string[];
  onToggleWatch: (cityId: string) => void;
  isAuthenticated: boolean;
  isWatched: (cityId: string) => boolean;
}) {
  return (
    <div
      style={isMobile ? {
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
        zIndex: 50,
        background: "#050508",
        display: "flex",
        flexDirection: "column",
      } : {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
        width: 272,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(5,5,8,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Mobile close header */}
      {isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15 }}>
            MARKETS
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#888",
              fontSize: 12,
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            CLOSE
          </button>
        </div>
      )}
      <div
        style={{
          padding: "12px 14px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          FILTER
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(
            [
              ["all", "ALL"],
              ["hot", "HOT"],
              ["operators", "ACTIVE OPS"],
              ["vertiport", "VERTIPORT"],
              ...(watchedCityIds.length > 0
                ? ([["watching", `WATCHING (${watchedCityIds.length})`]] as [FilterKey, string][])
                : []),
            ] as [FilterKey, string][]
          ).map(([val, lbl]) => {
            const isWatchingFilter = val === "watching";
            const isActive = filter === val;
            const activeColor = isWatchingFilter ? "#f59e0b" : "#00d4ff";
            return (
              <button
                key={val}
                onClick={() => onFilterChange(val)}
                style={{
                  background: isActive
                    ? isWatchingFilter ? "rgba(245,158,11,0.12)" : "rgba(0,212,255,0.12)"
                    : "transparent",
                  border: isActive
                    ? `1px solid ${activeColor}59`
                    : "1px solid rgba(255,255,255,0.07)",
                  color: isActive ? activeColor : "#888",
                  borderRadius: 4,
                  padding: isMobile ? "5px 10px" : "4px 8px",
                  fontSize: isMobile ? 9 : 8,
                  letterSpacing: 1,
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  transition: "all 0.15s",
                }}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}
      >
        {filtered.map((city, i) => (
          <div
            key={city.id}
            style={{
              opacity: animate ? 1 : 0,
              transform: animate
                ? "translateX(0)"
                : "translateX(-8px)",
              transition: `opacity 0.3s ease ${i * 0.025}s, transform 0.3s ease ${i * 0.025}s`,
            }}
          >
            <CityCard
              city={city}
              rank={cities.indexOf(city) + 1}
              isSelected={selected?.id === city.id}
              onClick={() => onSelect(city)}
              starNode={
                <WatchlistStar
                  cityId={city.id}
                  isWatched={isWatched(city.id)}
                  onToggle={onToggleWatch}
                  isAuthenticated={isAuthenticated}
                  size="sm"
                />
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
