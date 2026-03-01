"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { trackEvent } from "@/lib/track";

const STORAGE_KEY = "airindex-watchlist";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // quota exceeded — ignore
  }
}

export function useWatchlist() {
  const { data: session, status } = useSession();
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const inflightRef = useRef(false);

  // 1. Load from localStorage immediately
  useEffect(() => {
    setCityIds(readLocal());
  }, []);

  // 2. Hydrate from API when authenticated
  useEffect(() => {
    if (status !== "authenticated" || hydrated) return;
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.cityIds) {
          setCityIds(json.cityIds);
          writeLocal(json.cityIds);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, [status, hydrated]);

  const isWatched = useCallback(
    (cityId: string) => cityIds.includes(cityId),
    [cityIds]
  );

  const toggle = useCallback(
    (cityId: string) => {
      if (inflightRef.current) return;

      const watched = cityIds.includes(cityId);
      const optimistic = watched
        ? cityIds.filter((id) => id !== cityId)
        : [...cityIds, cityId];

      // Optimistic update
      setCityIds(optimistic);
      writeLocal(optimistic);

      // If not authenticated, keep local-only (login redirect handled by component)
      if (status !== "authenticated") return;

      inflightRef.current = true;
      const method = watched ? "DELETE" : "POST";

      fetch("/api/watchlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.cityIds) {
            setCityIds(json.cityIds);
            writeLocal(json.cityIds);
            trackEvent(watched ? "watchlist_remove" : "watchlist_add", "city", cityId);
          }
        })
        .catch(() => {
          // Revert on failure
          setCityIds(cityIds);
          writeLocal(cityIds);
        })
        .finally(() => {
          inflightRef.current = false;
        });
    },
    [cityIds, status]
  );

  return { cityIds, isWatched, toggle, isAuthenticated: status === "authenticated" };
}
