"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { City, Corridor, Vertiport } from "@/types";
import type { FederalFiling } from "@/lib/faa-api";
import type { ChangelogEntry } from "@/types";
import { CITIES, CITIES_MAP, OPERATORS_MAP, CORRIDORS, getVertiportsForCity } from "@/data/seed";
import { getScoreColor, getPostureConfig } from "@/lib/scoring";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trackEvent } from "@/lib/track";
import AuthGate from "./AuthGate";
import type { FilterKey, TabKey, MobilePanel } from "./dashboard-types";

// Panels & header
import DashboardHeader from "./DashboardHeader";
import CityListPanel from "./CityListPanel";
import CityDetailPanel from "./CityDetailPanel";

// Tabs
import MapTab from "./tabs/MapTab";
import RankingsTab from "./tabs/RankingsTab";
import CorridorsTab from "./tabs/CorridorsTab";
import FilingsTab from "./tabs/FilingsTab";
import ActivityTab from "./tabs/ActivityTab";
import AnalyticsTab from "./tabs/AnalyticsTab";

// -------------------------------------------------------

const GATED_TABS: TabKey[] = ["filings", "activity", "analytics"];

interface DashboardProps {
  initialCities?: City[];
  adminEmail?: string;
}

export default function Dashboard({ initialCities, adminEmail }: DashboardProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabKey) || "map";
  const isMobile = useIsMobile();

  // Use dynamic cities from server if available, otherwise fall back to static
  const CITIES_RESOLVED = initialCities ?? CITIES;
  const CITIES_MAP_RESOLVED: Record<string, City> = Object.fromEntries(
    CITIES_RESOLVED.map((c) => [c.id, c])
  );

  const [selected, setSelected] = useState<City>(CITIES_RESOLVED[0]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tab, setTab] = useState<TabKey>(
    ["map", "rank", "corridors", "filings", "activity", "analytics"].includes(initialTab) ? initialTab : "map"
  );
  const [animate, setAnimate] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("none");

  // Filings state
  const [filings, setFilings] = useState<FederalFiling[]>([]);
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [filingsError, setFilingsError] = useState<string | null>(null);
  const [filingsFetchedAt, setFilingsFetchedAt] = useState<string | null>(null);

  // Changelog / Activity state
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [changelogFetchedAt, setChangelogFetchedAt] = useState<string | null>(null);

  // Subscriptions — track which cities the user is subscribed to
  const [subscribedCityIds, setSubscribedCityIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/subscribe")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const ids = new Set<string>();
          for (const sub of json.data) {
            if (sub.cityIds?.length === 0) {
              CITIES_RESOLVED.forEach((c) => ids.add(c.id));
            } else {
              sub.cityIds?.forEach((id: string) => ids.add(id));
            }
          }
          setSubscribedCityIds(ids);
        }
      })
      .catch(() => {});
  }, [session?.user, CITIES_RESOLVED]);

  // Watchlist
  const { cityIds: watchedCityIds, isWatched, toggle: toggleWatch, isAuthenticated } = useWatchlist();

  // Vertiport & Corridor state
  const [selectedVertiport, setSelectedVertiport] = useState<Vertiport | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<Corridor | null>(null);
  const [showAllCorridors, setShowAllCorridors] = useState(false);
  const [fetchedCorridors, setFetchedCorridors] = useState<Corridor[]>(CORRIDORS);

  // Fetch corridors from DB
  useEffect(() => {
    fetch("/api/corridors")
      .then((r) => r.json())
      .then((json) => {
        if (json.data && json.data.length > 0) setFetchedCorridors(json.data);
      })
      .catch(() => {});
  }, []);

  // Derived data for selected city
  const cityVertiports = getVertiportsForCity(selected.id);
  const cityCorridors = fetchedCorridors.filter((c) => c.cityId === selected.id);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Fetch filings on tab switch
  useEffect(() => {
    if (tab !== "filings" || filingsFetchedAt) return;
    setFilingsLoading(true);
    setFilingsError(null);
    fetch("/api/filings?days=730")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setFilings(json.data);
        setFilingsFetchedAt(json.fetchedAt);
      })
      .catch((err) => {
        setFilingsError(err.message ?? "Failed to fetch filings");
      })
      .finally(() => setFilingsLoading(false));
  }, [tab, filingsFetchedAt]);

  // Fetch changelog on tab switch
  useEffect(() => {
    if (tab !== "activity" || changelogFetchedAt) return;
    setChangelogLoading(true);
    setChangelogError(null);
    fetch("/api/changelog?limit=100")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setChangelog(json.data);
        setChangelogFetchedAt(json.fetchedAt);
      })
      .catch((err) => {
        setChangelogError(err.message ?? "Failed to fetch changelog");
      })
      .finally(() => setChangelogLoading(false));
  }, [tab, changelogFetchedAt]);

  const filtered = CITIES_RESOLVED.filter((c) => {
    if (filter === "watching") return watchedCityIds.includes(c.id);
    if (filter === "hot") return (c.score ?? 0) >= 60;
    if (filter === "operators") return c.activeOperators.length > 0;
    if (filter === "vertiport") return c.vertiportCount > 0;
    return true;
  });

  const scoreColor = getScoreColor(selected.score ?? 0);

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <DashboardHeader
        cities={CITIES_RESOLVED}
        userEmail={session?.user?.email}
        isAdmin={!!(adminEmail && session?.user?.email === adminEmail)}
        isMobile={isMobile}
        showSignOut={showSignOut}
        onToggleSignOut={() => setShowSignOut((v) => !v)}
        onSignIn={() => router.push("/login")}
      />

      {/* MAIN LAYOUT */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>

        {/* Mobile backdrop overlay */}
        {isMobile && mobilePanel !== "none" && (
          <div
            onClick={() => setMobilePanel("none")}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 40,
              animation: "fadeIn 0.2s ease",
            }}
          />
        )}

        {/* LEFT — City List */}
        {(!isMobile || mobilePanel === "cityList") && (
          <CityListPanel
            cities={CITIES_RESOLVED}
            filtered={filtered}
            filter={filter}
            onFilterChange={setFilter}
            selected={selected}
            onSelect={(city) => {
              setSelected(city);
              setShowAllCorridors(false);
              if (isMobile) setMobilePanel("detail");
              if (session?.user) trackEvent("city_detail", "city", city.id);
            }}
            animate={animate}
            isMobile={isMobile}
            onClose={() => setMobilePanel("none")}
            watchedCityIds={watchedCityIds}
            onToggleWatch={toggleWatch}
            isAuthenticated={isAuthenticated}
            isWatched={isWatched}
          />
        )}

        {/* CENTER — Tab area */}
        <div
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "0 20px",
              paddingLeft: isMobile ? 0 : 292,
              flexShrink: 0,
              zIndex: 5,
              background: "rgba(5,5,8,0.95)",
              overflowX: isMobile ? "auto" : undefined,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {(isMobile
              ? [
                  ["map", "MAP"],
                  ["rank", "RANK"],
                  ["corridors", "ROUTES"],
                  ["filings", "FEED"],
                  ["activity", "ACTIVITY"],
                  ["analytics", "STATS"],
                ] as [TabKey, string][]
              : [
                  ["map", "MAP VIEW"],
                  ["rank", "RANKINGS"],
                  ["corridors", "CORRIDORS"],
                  ["filings", "FILINGS"],
                  ["activity", "ACTIVITY"],
                  ["analytics", "ANALYTICS"],
                ] as [TabKey, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (isMobile) setMobilePanel("none");
                  if (session?.user) trackEvent("tab_switch", "tab", t);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    tab === t
                      ? "2px solid #00d4ff"
                      : "2px solid transparent",
                  color: tab === t ? "#00d4ff" : "#666",
                  padding: isMobile ? "11px 10px" : "13px 16px",
                  fontSize: isMobile ? 10 : 9,
                  letterSpacing: isMobile ? 1 : 2,
                  cursor: "pointer",
                  fontFamily: "'Space Mono', monospace",
                  marginBottom: -1,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {GATED_TABS.includes(tab) && !session?.user ? (
            <AuthGate tab={tab} />
          ) : tab === "corridors" ? (
            <CorridorsTab
              corridors={fetchedCorridors}
              citiesMap={CITIES_MAP_RESOLVED}
              operatorsMap={OPERATORS_MAP}
              animate={animate}
              isMobile={isMobile}
              onCorridorClick={(corridor, city) => {
                if (city) setSelected(city);
                setSelectedCorridor(corridor);
                setShowAllCorridors(true);
                setTab("map");
                if (isMobile) setMobilePanel("none");
              }}
            />
          ) : tab === "analytics" ? (
            <AnalyticsTab
              cities={CITIES_RESOLVED}
              corridors={fetchedCorridors}
              animate={animate}
              isMobile={isMobile}
            />
          ) : tab === "activity" ? (
            <ActivityTab
              changelog={changelog}
              loading={changelogLoading}
              error={changelogError}
              fetchedAt={changelogFetchedAt}
              animate={animate}
              isMobile={isMobile}
            />
          ) : tab === "filings" ? (
            <FilingsTab
              filings={filings}
              loading={filingsLoading}
              error={filingsError}
              fetchedAt={filingsFetchedAt}
              animate={animate}
              isMobile={isMobile}
            />
          ) : tab === "map" ? (
            <MapTab
              cities={CITIES_RESOLVED}
              selected={selected}
              onCitySelect={(city) => {
                setSelected(city);
                if (isMobile) setMobilePanel("detail");
                if (session?.user) trackEvent("city_detail", "city", city.id);
              }}
              vertiports={cityVertiports}
              selectedVertiport={selectedVertiport}
              onVertiportSelect={setSelectedVertiport}
              corridors={showAllCorridors ? fetchedCorridors : cityCorridors}
              selectedCorridor={selectedCorridor}
              onCorridorSelect={setSelectedCorridor}
              isMobile={isMobile}
              mobilePanel={mobilePanel}
              onOpenCityList={() => setMobilePanel("cityList")}
              onOpenDetail={() => setMobilePanel("detail")}
              subscribedCityIds={subscribedCityIds}
              onSubscribe={async () => {
                try {
                  const res = await fetch("/api/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      cityIds: [selected.id],
                      changeTypes: ["new_filing", "status_change", "new_law", "faa_update"],
                    }),
                  });
                  if (res.ok || res.status === 409) {
                    setSubscribedCityIds((prev) => new Set(prev).add(selected.id));
                  }
                } catch { /* silent */ }
              }}
              isLoggedIn={!!session?.user}
              onSignIn={() => router.push("/login?callbackUrl=" + encodeURIComponent("/dashboard?tab=map"))}
              watchedCityIds={watchedCityIds}
              onToggleWatch={toggleWatch}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <RankingsTab
              cities={CITIES_RESOLVED}
              selected={selected}
              onSelect={setSelected}
              animate={animate}
              isMobile={isMobile}
              watchedCityIds={watchedCityIds}
              onToggleWatch={toggleWatch}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>

        {/* RIGHT — Detail Panel */}
        {(!isMobile || mobilePanel === "detail") && (
          <CityDetailPanel
            selected={selected}
            vertiports={cityVertiports}
            corridors={cityCorridors}
            selectedVertiport={selectedVertiport}
            selectedCorridor={selectedCorridor}
            onVertiportSelect={setSelectedVertiport}
            onCorridorSelect={setSelectedCorridor}
            subscribedCityIds={subscribedCityIds}
            onSubscriptionChange={(cityId, subscribed) => {
              setSubscribedCityIds((prev) => {
                const next = new Set(prev);
                if (subscribed) next.add(cityId);
                else next.delete(cityId);
                return next;
              });
            }}
            isMobile={isMobile}
            onClose={() => setMobilePanel("none")}
            isWatched={isWatched(selected.id)}
            onToggleWatch={toggleWatch}
            isAuthenticated={isAuthenticated}
          />
        )}
      </div>
    </div>
  );
}
