"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { City, Corridor, Vertiport } from "@/types";
import type { FederalFiling } from "@/lib/faa-api";
import { CITIES, CITIES_MAP, OPERATORS_MAP, CORRIDORS, getVertiportsForCity } from "@/data/seed";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useWatchlist } from "@/hooks/useWatchlist";
import { trackEvent } from "@/lib/track";
import { plausible } from "@/lib/plausible";
import AuthGate from "./AuthGate";
import UpgradeGate from "./UpgradeGate";
import CheckoutSuccessModal from "./CheckoutSuccessModal";
import { hasProAccess } from "@/lib/billing-shared";
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
import IntelTab from "./tabs/IntelTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import KeysTab from "./tabs/KeysTab";

// -------------------------------------------------------

const GATED_TABS: TabKey[] = ["corridors", "filings", "intel", "analytics", "keys"];
const PRO_TABS: TabKey[] = ["corridors", "filings", "intel", "analytics"];

interface DashboardProps {
  initialCities?: City[];
  adminEmail?: string;
}

export default function Dashboard({ initialCities, adminEmail }: DashboardProps) {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabKey) || "map";
  const isMobile = useIsMobile();
  const userTier = (session?.user as { tier?: string } | undefined)?.tier ?? "free";

  // Use dynamic cities from server if available, otherwise fall back to static
  const CITIES_RESOLVED = initialCities ?? CITIES;
  const CITIES_MAP_RESOLVED: Record<string, City> = Object.fromEntries(
    CITIES_RESOLVED.map((c) => [c.id, c])
  );

  const [selected, setSelected] = useState<City>(CITIES_RESOLVED[0]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [tab, setTab] = useState<TabKey>(
    ["map", "rank", "corridors", "filings", "intel", "analytics", "keys"].includes(initialTab) ? initialTab : "map"
  );
  const [animate, setAnimate] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("none");

  // Filings state
  const [filings, setFilings] = useState<FederalFiling[]>([]);
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [filingsError, setFilingsError] = useState<string | null>(null);
  const [filingsFetchedAt, setFilingsFetchedAt] = useState<string | null>(null);


  // Subscriptions — track which cities the user is subscribed to


  // Watchlist
  const { cityIds: watchedCityIds, isWatched, toggle: toggleWatch, isAuthenticated, limitHit } = useWatchlist();

  // Checkout success modal
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setShowCheckoutSuccess(true);
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  // Refresh session tier on mount (catches Stripe webhook tier changes)
  useEffect(() => {
    if (session?.user) {
      updateSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Score deltas (recent changes)
  const [scoreDeltas, setScoreDeltas] = useState<Record<string, { delta: number; previousScore: number; currentScore: number; changedAt: string }>>({});

  useEffect(() => {
    fetch("/api/score-deltas")
      .then((r) => r.json())
      .then((json) => setScoreDeltas(json.data ?? {}))
      .catch(() => {});
  }, []);

  // Market Watch data
  const [watchData, setWatchData] = useState<Record<string, { watchStatus: string; outlook: string; analystNote: string | null }>>({});

  useEffect(() => {
    fetch("/api/market-watch")
      .then((r) => r.json())
      .then((json) => {
        const map: Record<string, { watchStatus: string; outlook: string; analystNote: string | null }> = {};
        for (const w of json.data ?? []) {
          map[w.cityId] = { watchStatus: w.watchStatus, outlook: w.outlook, analystNote: w.analystNote };
        }
        setWatchData(map);
      })
      .catch(() => {});
  }, []);

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


  const filtered = CITIES_RESOLVED.filter((c) => {
    if (filter === "watching") return watchedCityIds.includes(c.id);
    if (filter === "hot") return (c.score ?? 0) >= 60;
    if (filter === "operators") return c.activeOperators.length > 0;
    if (filter === "vertiport") return c.vertiportCount > 0;
    return true;
  });

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <>
    {showCheckoutSuccess && (
      <CheckoutSuccessModal
        tierName={userTier === "institutional" ? "Institutional" : "Professional"}
        onDismiss={() => setShowCheckoutSuccess(false)}
      />
    )}
    {limitHit && (
      <div
        style={{
          position: "fixed",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: "rgba(245, 158, 11, 0.95)",
          color: "#1a1a1a",
          padding: "12px 24px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: "fadeIn 0.2s ease",
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        You&apos;re tracking 3 markets.{" "}
        <a href="/contact?tier=pro" style={{ color: "#1a1a1a", textDecoration: "underline", fontWeight: 700 }}>
          Request Professional access
        </a>{" "}
        to monitor all 21+ and unlock the full dashboard.
      </div>
    )}
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
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
        userTier={userTier}
        isAdmin={!!(adminEmail && session?.user?.email === adminEmail)}
        isMobile={isMobile}
        showSignOut={showSignOut}
        onToggleSignOut={() => setShowSignOut((v) => !v)}
        onSignIn={() => router.push("/login")}
      />

      {/* Past-due billing warning */}
      {(session?.user as { billingStatus?: string } | undefined)?.billingStatus === "past_due" && (
        <div
          style={{
            background: "rgba(255, 68, 68, 0.08)",
            borderBottom: "1px solid rgba(255, 68, 68, 0.2)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#ff6666", fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
            Your last payment failed. Please update your payment method to keep your subscription active.
          </span>
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/billing/portal", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              } catch (err) {
                console.error("Portal error:", err);
              }
            }}
            style={{
              background: "#ff4444",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            Update Payment
          </button>
        </div>
      )}

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
              plausible("City Detail", { city: city.id });
            }}
            animate={animate}
            isMobile={isMobile}
            onClose={() => setMobilePanel("none")}
            watchedCityIds={watchedCityIds}
            onToggleWatch={toggleWatch}
            isAuthenticated={isAuthenticated}
            isWatched={isWatched}
            watchData={watchData}
            scoreDeltas={scoreDeltas}
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
                  ["intel", "INTEL"],
                  ["analytics", "STATS"],
                  ...(hasProAccess(userTier) ? [["keys", "API"]] : []),
                ] as [TabKey, string][]
              : [
                  ["map", "MAP VIEW"],
                  ["rank", "RANKINGS"],
                  ["corridors", "CORRIDORS"],
                  ["filings", "FILINGS"],
                  ["intel", "INTEL"],
                  ["analytics", "ANALYTICS"],
                  ...(hasProAccess(userTier) ? [["keys", "API KEYS"]] : []),
                ] as [TabKey, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (isMobile) setMobilePanel("none");
                  if (session?.user) trackEvent("tab_switch", "tab", t);
                  plausible("Tab Switch", { tab: t });
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
                  fontFamily: "'Inter', sans-serif",
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
          ) : PRO_TABS.includes(tab) && session?.user && !hasProAccess(userTier) ? (
            <UpgradeGate feature={tab} />
          ) : tab === "keys" ? (
            <KeysTab
              animate={animate}
              isMobile={isMobile}
              userTier={(session?.user as { tier?: string } | undefined)?.tier ?? "free"}
            />
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
          ) : tab === "intel" ? (
            <IntelTab animate={animate} isMobile={isMobile} />
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
                plausible("City Detail", { city: city.id });
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
              scoreDeltas={scoreDeltas}
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
            isMobile={isMobile}
            onClose={() => setMobilePanel("none")}
            isWatched={isWatched(selected.id)}
            onToggleWatch={toggleWatch}
            isAuthenticated={isAuthenticated}
            userTier={userTier}
            isAdmin={!!(adminEmail && session?.user?.email === adminEmail)}
            watchStatus={watchData[selected.id]?.watchStatus}
            outlook={watchData[selected.id]?.outlook}
            analystNote={watchData[selected.id]?.analystNote}
          />
        )}
      </div>
    </div>
    </>
  );
}
