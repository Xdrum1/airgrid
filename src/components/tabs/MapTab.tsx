"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { City, Vertiport, Corridor } from "@/types";
import type { MobilePanel } from "@/components/dashboard-types";

const MapView = dynamic(() => import("../MapView"), {
  ssr: false,
  loading: () => (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#07070e",
      color: "#444",
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      letterSpacing: 2,
    }}>
      LOADING MAP...
    </div>
  ),
});

export default function MapTab({
  cities,
  selected,
  onCitySelect,
  vertiports,
  selectedVertiport,
  onVertiportSelect,
  corridors,
  selectedCorridor,
  onCorridorSelect,
  isMobile,
  mobilePanel,
  onOpenCityList,
  onOpenDetail,
  subscribedCityIds,
  onSubscribe,
  isLoggedIn,
  onSignIn,
  watchedCityIds,
  onToggleWatch,
  isAuthenticated,
}: {
  cities: City[];
  selected: City;
  onCitySelect: (city: City) => void;
  vertiports: Vertiport[];
  selectedVertiport: Vertiport | null;
  onVertiportSelect: (v: Vertiport | null) => void;
  corridors: Corridor[];
  selectedCorridor: Corridor | null;
  onCorridorSelect: (c: Corridor | null) => void;
  isMobile: boolean;
  mobilePanel: MobilePanel;
  onOpenCityList: () => void;
  onOpenDetail: () => void;
  subscribedCityIds: Set<string>;
  onSubscribe: () => Promise<void>;
  isLoggedIn: boolean;
  onSignIn: () => void;
  watchedCityIds: string[];
  onToggleWatch: (cityId: string) => void;
  isAuthenticated: boolean;
}) {
  const router = useRouter();

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <MapView
        cities={cities}
        selected={selected}
        onCitySelect={onCitySelect}
        vertiports={vertiports}
        selectedVertiport={selectedVertiport}
        onVertiportSelect={onVertiportSelect}
        corridors={corridors}
        selectedCorridor={selectedCorridor}
        onCorridorSelect={onCorridorSelect}
        isMobile={isMobile}
        watchedCityIds={watchedCityIds}
        onToggleWatch={onToggleWatch}
        isAuthenticated={isAuthenticated}
      />

      {/* Mobile: floating MARKETS button */}
      {isMobile && (
        <button
          onClick={onOpenCityList}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 20,
            background: "rgba(5,5,8,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "#00d4ff",
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          MARKETS ({cities.length})
        </button>
      )}

      {/* Floating subscribe banner — hidden when subscribed or mobile detail open */}
      {subscribedCityIds.has(selected.id) ? null :
       isMobile && mobilePanel === "detail" ? null : isMobile ? (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 12,
            right: 12,
            zIndex: 20,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              if (isLoggedIn) {
                onOpenDetail();
              } else {
                router.push("/login");
              }
            }}
            style={{
              background: "rgba(5,5,8,0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: 8,
              padding: "10px 20px",
              color: "#00ff88",
              fontSize: 9,
              letterSpacing: 1.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            {isLoggedIn ? "SUBSCRIBE" : "SIGN IN TO SUBSCRIBE"}
          </button>
        </div>
      ) : isLoggedIn ? (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "rgba(5,5,8,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 10,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            maxWidth: 480,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
              Get alerts for {selected.city}
            </div>
            <div style={{ color: "#555", fontSize: 9 }}>
              Regulatory changes, new filings, operator updates
            </div>
          </div>
          <button
            onClick={onSubscribe}
            style={{
              background: "rgba(0,255,136,0.12)",
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: 5,
              padding: "9px 16px",
              color: "#00ff88",
              fontSize: 9,
              letterSpacing: 1,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            SUBSCRIBE
          </button>
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "rgba(5,5,8,0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 10,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            maxWidth: 480,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
              Get alerts for {selected.city}
            </div>
            <div style={{ color: "#555", fontSize: 9 }}>
              Sign in to subscribe to regulatory changes and filings
            </div>
          </div>
          <button
            onClick={onSignIn}
            style={{
              background: "rgba(0,255,136,0.12)",
              border: "1px solid rgba(0,255,136,0.3)",
              borderRadius: 5,
              padding: "9px 16px",
              color: "#00ff88",
              fontSize: 9,
              letterSpacing: 1,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            SIGN IN
          </button>
        </div>
      )}
    </div>
  );
}
